const GameEngine = require('./GameEngine');
const BotManager = require('./BotManager');
const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.playerRooms = new Map();
        this.playerDbIds = new Map();
        this.connectedUsers = new Map();
        this.botManager = new BotManager(this);
    }

    getRooms() {
        let arr = [];
        for (const [roomId, room] of this.rooms.entries()) {
            arr.push({
                id: room.id,
                name: room.name,
                tier: room.tier,
                playerCount: room.players.length,
                maxPlayers: 6
            });
        }
        return arr;
    }

    getAllPlayers() {
        return Array.from(this.connectedUsers.entries()).map(([socketId, data]) => ({
            socketId,
            ...data
        }));
    }

    identifyUser(socketId, userData) {
        this.playerDbIds.set(socketId, userData.id);
        const existing = this.connectedUsers.get(socketId) || {};
        this.connectedUsers.set(socketId, {
            id: userData.id,
            name: userData.username,
            chips: userData.chips,
            goldTickets: userData.goldTickets,
            handsWon: userData.handsWon || 0,
            totalChipsWon: userData.totalChipsWon || 0,
            tournamentsWon: userData.tournamentsWon || 0,
            vipWins: userData.vipWins || 0,
            bestHandName: userData.bestHandName || 'N/A',
            bestHandRank: userData.bestHandRank || 0,
            roomName: existing.roomName || 'Lobby',
            tier: existing.tier || 'N/A'
        });
    }

    async grantChips(socketId, amount, isGold = false) {
        const userData = this.connectedUsers.get(socketId);
        if (!userData) return false;

        if (isGold) {
            userData.goldTickets += amount;
        } else {
            userData.chips += amount;
        }

        const roomId = this.playerRooms.get(socketId);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                const player = room.players.find(p => p.socketId === socketId);
                if (player) {
                    const isVipRoom = room.tier === 'VIP' || room.tier === 'Torneos';
                    player.goldTickets = userData.goldTickets;
                    if (isVipRoom && isGold) {
                        player.chips += amount;
                    } else if (!isVipRoom && !isGold) {
                        player.chips += amount;
                    }
                    this.broadcastGameState(roomId);
                }
            }
        }

        await this.syncPlayerStats(socketId, isGold ? { goldTickets: userData.goldTickets } : { chips: userData.chips });
        return true;
    }

    async grantToAll(amount, isGold = false) {
        for (const socketId of this.connectedUsers.keys()) {
            await this.grantChips(socketId, amount, isGold);
        }
    }

    async syncPlayerStats(socketId, updates) {
        const dbId = this.playerDbIds.get(socketId);
        if (dbId) {
            const updatedUser = await db.updateUser(dbId, updates);
            const userData = this.connectedUsers.get(socketId);
            if (userData && updatedUser) {
                Object.assign(userData, updatedUser);
                if (updates.lastRoom) userData.roomName = updates.lastRoom;

                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('user_update', userData);
                }
            }
        }
    }

    createRoom(name, tier = 'Principiante') {
        const roomId = uuidv4();
        let minBet = 20;
        if (tier === 'Pro') minBet = 100;
        if (tier === 'VIP') minBet = 1000;
        if (tier === 'Torneos') minBet = 500;

        const gameEngine = new GameEngine(
            () => this.broadcastGameState(roomId),
            (eliminatedIds, winnerData) => this.onRoundEnd(roomId, eliminatedIds, winnerData),
            minBet
        );

        const newRoom = {
            id: roomId,
            name: name || `Mesa ${roomId.substring(0, 4)}`,
            tier: tier,
            players: [],
            gameEngine: gameEngine,
            handsPlayed: 0
        };
        this.rooms.set(roomId, newRoom);
        this.botManager.addBotsToRoom(roomId);
        return roomId;
    }

    async onRoundEnd(roomId, eliminatedIds = [], winnerData = []) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const isVipRoom = room.tier === 'VIP' || room.tier === 'Torneos';

        // 1. Save current chips for all human players
        for (const p of room.players) {
            if (!p.isBot) {
                if (isVipRoom) {
                    await this.syncPlayerStats(p.socketId, { goldTickets: p.chips });
                } else {
                    await this.syncPlayerStats(p.socketId, { chips: p.chips });
                }
            }
        }

        // 2. Process Winner Stats
        for (const winInfo of winnerData) {
            const socketId = winInfo.id;
            const dbId = this.playerDbIds.get(socketId);
            if (dbId) {
                const user = await db.getUserById(dbId);
                if (user) {
                    const updates = {
                        handsWon: (user.handsWon || 0) + 1,
                        totalChipsWon: (user.totalChipsWon || 0) + winInfo.amount
                    };
                    if (winInfo.handRank > (user.bestHandRank || 0)) {
                        updates.bestHandRank = winInfo.handRank;
                        updates.bestHandName = winInfo.handName;
                    }
                    await this.syncPlayerStats(socketId, updates);
                }
            }
        }

        // 3. Handle eliminated players
        for (const pId of eliminatedIds) {
            const socketEntry = [...this.playerRooms.entries()].find(([sId, rId]) => sId === pId && rId === roomId);
            if (socketEntry) {
                const socketId = socketEntry[0];
                const player = room.players.find(p => p.id === pId);
                if (player) {
                    if (isVipRoom) {
                        await this.syncPlayerStats(socketId, { goldTickets: 0, lastRoom: room.name });
                    } else {
                        await this.syncPlayerStats(socketId, { chips: 0, goldTickets: player.goldTickets, lastRoom: room.name });
                    }
                }
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('client_error', '¡Has sido eliminado! Te has quedado sin fondos.');
                    setTimeout(() => {
                        socket.emit('force_lobby');
                        this.leaveRoom(socket);
                    }, 4000);
                }
            } else {
                room.players = room.players.filter(p => p.id !== pId);
            }
        }

        this.broadcastGameState(roomId);

        // 4. Survivor Mode
        if (room.isLocked && room.players.length === 1) {
            const winner = room.players[0];
            this.io.emit('chat_msg', {
                room: 'global',
                sender: 'Sistema',
                text: `¡${winner.name} ha ganado en la sala de ${room.tier === 'VIP' ? 'VIP' : 'Torneo'}! 🏆`,
                timestamp: Date.now()
            });
            this.io.to(roomId).emit('survivor_winner', { name: winner.name, prize: winner.chips, tier: room.tier });

            const winnerUpdates = {};
            if (room.tier === 'VIP') winnerUpdates.vipWins = (winner.vipWins || 0) + 1;
            if (room.tier === 'Torneos') winnerUpdates.tournamentsWon = (winner.tournamentsWon || 0) + 1;
            if (Object.keys(winnerUpdates).length > 0) {
                await this.syncPlayerStats(winner.socketId, winnerUpdates);
            }

            setTimeout(() => {
                this.io.to(roomId).emit('force_lobby');
                this.rooms.delete(roomId);
            }, 10000);
            return;
        } else {
            room.handsPlayed++;
            if (room.tier === 'Torneos' && room.handsPlayed % 5 === 0) {
                const oldMin = room.gameEngine.minBet;
                room.gameEngine.minBet = Math.round(oldMin * 1.5);
                this.io.to(roomId).emit('chat_msg', {
                    room: roomId, sender: 'Sistema',
                    text: `⚠️ ¡LAS CIEGAS HAN SUBIDO! Nueva apuesta mínima: ${room.gameEngine.minBet}`,
                    timestamp: Date.now()
                });
            }
        }

        if (this.rooms.has(roomId)) {
            setTimeout(() => {
                if (!this.rooms.has(roomId)) return;
                this.botManager.addBotsToRoom(roomId);
                if (room.players.length >= 2) {
                    if (room.gameEngine.startGame()) {
                        this.broadcastGameState(roomId);
                        this.botManager.processBotTurn(roomId);
                    }
                }
            }, 3000);
        }
    }

    async joinRoom(socket, roomId, playerName, requestedTier = 'Principiante', dbUserId = null) {
        if (!dbUserId) dbUserId = this.playerDbIds.get(socket.id);

        const dbUser = dbUserId ? await db.getUserById(dbUserId) : null;
        let startingChips = 1000;
        let startingGold = 0;

        if (dbUser) {
            startingChips = dbUser.chips;
            startingGold = dbUser.goldTickets || 0;
            this.playerDbIds.set(socket.id, dbUser.id);
        }

        if (requestedTier === 'VIP' || requestedTier === 'Torneos') {
            if (startingGold < 10000) {
                socket.emit('client_error', 'Requieres al menos 10,000 Fichas Gold para entrar a esta sala VIP/Torneo.');
                return;
            }
            startingGold -= 10000;
        }

        if (!roomId || !this.rooms.has(roomId)) {
            for (const [id, room] of this.rooms.entries()) {
                if (room.tier === requestedTier && room.players.length < 6 && !room.isLocked) {
                    roomId = id;
                    break;
                }
            }
            if (!roomId) roomId = this.createRoom(`Mesa ${requestedTier}`, requestedTier);
        }

        const room = this.rooms.get(roomId);

        if (room.isLocked) {
            socket.emit('client_error', 'Esta partida ya ha comenzado y la mesa está cerrada hasta que termine.');
            return;
        }

        if (room.players.length >= 6) {
            const removed = this.botManager.removeBot(roomId);
            if (!removed) {
                socket.emit('client_error', 'La sala está llena.');
                return;
            }
        }

        const isVipRoom = room.tier === 'VIP' || room.tier === 'Torneos';
        if (dbUser) {
            if (isVipRoom) {
                await this.syncPlayerStats(socket.id, { goldTickets: startingGold, lastRoom: room.name });
            } else {
                await this.syncPlayerStats(socket.id, { chips: startingChips, lastRoom: room.name });
            }
        }

        const playerId = socket.id;
        const playerObj = {
            id: playerId,
            name: playerName || `Player_${playerId.substring(0, 4)}`,
            chips: isVipRoom ? 10000 : startingChips,
            goldTickets: startingGold,
            isBot: false,
            socketId: socket.id
        };

        const globalUser = this.connectedUsers.get(socket.id);
        if (globalUser) {
            globalUser.roomName = room.name;
            globalUser.tier = room.tier;
        }

        room.players.push(playerObj);
        this.playerRooms.set(socket.id, roomId);
        socket.join(roomId);
        room.gameEngine.addPlayer(playerObj);
        console.log(`Player ${playerObj.name} joined room ${roomId}`);

        if (room.gameEngine.stage === 'waiting' && room.gameEngine.players.length >= 2) {
            if (room.gameEngine.startGame()) {
                this.botManager.processBotTurn(roomId);
            }
        }

        if ((room.tier === 'VIP' || room.tier === 'Torneos') && room.players.length === 6) {
            room.isLocked = true;
            console.log(`Room ${roomId} (VIP/Torneo) is now LOCKED for Survivor Mode.`);
        }

        this.broadcastGameState(roomId);
    }

    async leaveRoom(socket) {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                const isVipRoom = room.tier === 'VIP' || room.tier === 'Torneos';
                if (isVipRoom && !room.isLocked) {
                    player.goldTickets = (player.goldTickets || 0) + player.chips;
                }
                if (isVipRoom) {
                    await this.syncPlayerStats(socket.id, { goldTickets: player.goldTickets, lastRoom: room.name });
                } else {
                    await this.syncPlayerStats(socket.id, { chips: player.chips, goldTickets: player.goldTickets, lastRoom: room.name });
                }
            }

            room.players = room.players.filter(p => p.id !== socket.id);
            room.gameEngine.removePlayer(socket.id);
            this.botManager.addBotsToRoom(roomId);
            this.broadcastGameState(roomId);
            this.botManager.processBotTurn(roomId);

            if (room.players.filter(p => !p.isBot).length === 0) {
                room.gameEngine.clearTurnTimer();
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} destroyed as no human players left.`);
            }
        }

        const globalUser = this.connectedUsers.get(socket.id);
        if (globalUser) {
            globalUser.roomName = 'Lobby';
            globalUser.tier = 'N/A';
        }

        this.playerRooms.delete(socket.id);
        socket.leave(roomId);
    }

    disconnectUser(socket) {
        this.leaveRoom(socket);
        this.playerDbIds.delete(socket.id);
        this.connectedUsers.delete(socket.id);
        console.log(`User cleaned up from registry: ${socket.id}`);
    }

    handlePlayerAction(socket, actionData) {
        const roomId = this.playerRooms.get(socket.id);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (!room) return;

        const success = room.gameEngine.handleAction(socket.id, actionData.action, actionData.amount);
        if (success) {
            this.broadcastGameState(roomId);
            this.botManager.processBotTurn(roomId);
        } else {
            socket.emit('error', 'Invalid action');
        }
    }

    broadcastGameState(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            const playersInfo = room.players.map(p => ({
                id: p.id,
                name: p.name,
                isBot: p.isBot,
                chips: p.chips,
                goldTickets: p.goldTickets || 0
            }));

            for (const player of room.players) {
                if (!player.isBot && player.socketId) {
                    const personalizedState = room.gameEngine.getGameState(player.id);
                    this.io.to(player.socketId).emit('game_state', {
                        roomId: roomId,
                        roomName: room.name,
                        gameState: personalizedState,
                        players: playersInfo
                    });
                }
            }
        }
    }

    async getRanking() {
        const users = await db.getUsers();
        return users.map(u => ({
            username: u.username,
            handsWon: u.handsWon || 0,
            totalChipsWon: u.totalChipsWon || 0,
            tournamentsWon: u.tournamentsWon || 0,
            bestHandName: u.bestHandName || 'N/A',
            chips: u.chips,
            goldTickets: u.goldTickets || 0
        })).sort((a, b) => b.handsWon - a.handsWon || b.totalChipsWon - a.totalChipsWon).slice(0, 10);
    }
}

module.exports = RoomManager;
