const { v4: uuidv4 } = require('uuid');

class BotManager {
    constructor(roomManager) {
        this.roomManager = roomManager;
        this.botNames = ['AI_Daniel', 'AI_Phil', 'AI_Doyle', 'AI_Johnny', 'AI_Vanessa'];
    }

    addBotsToRoom(roomId) {
        const room = this.roomManager.rooms.get(roomId);
        if (!room) return;

        // NEW: If room is locked (Survivor Mode), no new bots/players can enter
        if (room.isLocked) return;

        // Fill table up to 5 players (leaving 1 spot for humans minimum)
        const humanCount = room.players.filter(p => !p.isBot).length;
        const targetBots = 5 - humanCount;
        let currentBots = room.players.filter(p => p.isBot).length;

        const isHighStakes = room.tier === 'VIP' || room.tier === 'Torneos';
        const startingStack = isHighStakes ? 10000 : 1000;

        while (currentBots < targetBots) {
            const botId = `bot_${uuidv4()}`;
            const botName = this.botNames[Math.floor(Math.random() * this.botNames.length)];

            const botPlayerObj = {
                id: botId,
                name: `${botName}_${Math.floor(Math.random() * 99)}`,
                chips: startingStack,
                isBot: true,
                socketId: null
            };

            const added = room.gameEngine.addPlayer(botPlayerObj);

            if (added) {
                room.players.push(botPlayerObj);
                currentBots++;
            } else {
                break;
            }
        }
    }

    removeBot(roomId) {
        const room = this.roomManager.rooms.get(roomId);
        if (!room) return;

        // Find first bot and remove
        const bot = room.players.find(p => p.isBot);
        if (bot) {
            room.gameEngine.removePlayer(bot.id);
            room.players = room.players.filter(p => p.id !== bot.id);
            return true;
        }
        return false;
    }

    processBotTurn(roomId) {
        const room = this.roomManager.rooms.get(roomId);
        if (!room) return;

        const engine = room.gameEngine;
        if (engine.stage === 'waiting' || engine.stage === 'showdown') return;

        const currentPlayer = engine.players[engine.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isBot) {
            // Simulate thinking time
            setTimeout(() => {
                // Simple logic: call if possible, else check or fold
                const amountToCall = engine.currentBet - currentPlayer.currentBet;
                let action = 'check';

                if (amountToCall > 0) {
                    // 80% chance to call, 20% fold
                    if (Math.random() > 0.2) {
                        action = 'call';
                    } else {
                        action = 'fold';
                    }
                } else {
                    // 10% chance to raise if checking
                    if (Math.random() > 0.9) {
                        action = 'raise';
                    }
                }

                engine.handleAction(currentPlayer.id, action, engine.minBet * 2); // Simple raise
                this.roomManager.broadcastGameState(roomId);

                // If next player is also a bot, trigger their turn
                const nextPlayer = engine.players[engine.currentPlayerIndex];
                if (nextPlayer && nextPlayer.isBot && engine.stage !== 'waiting') {
                    this.processBotTurn(roomId);
                }
            }, Math.random() * 1500 + 500); // 0.5s to 2s delay
        }
    }
}

module.exports = BotManager;
