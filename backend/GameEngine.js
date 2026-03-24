const PokerSolver = require('pokersolver').Hand;

const SUITS = ['s', 'c', 'h', 'd']; // spades, clubs, hearts, diamonds
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

class GameEngine {
    constructor(onUpdate, onRoundEnd, minBet = 20) {
        this.onUpdate = onUpdate || (() => { });
        this.onRoundEnd = onRoundEnd || (() => { });
        this.deck = [];
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.dealerIndex = 0;
        this.currentPlayerIndex = 0;
        this.stage = 'waiting';
        this.minBet = minBet;

        // Polish additions
        this.winners = [];
        this.winMessages = [];
        this.turnTimer = null;
        this.turnEndTime = null;
        this.smallBlindIndex = 0;
        this.bigBlindIndex = 0;
        this.raisesInRound = 0;
        this.handsInRotation = 0;
    }

    addPlayer(player) {
        if (this.players.length >= 6) return false;

        // Add necessary round properties to the original object reference
        player.hand = [];
        player.folded = false;
        player.allIn = false;
        player.currentBet = 0;

        this.players.push(player);
        return true;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        if (this.players.length < 2 && this.stage !== 'waiting') {
            this.endRound();
        }
    }

    startGame() {
        if (this.players.length < 2) return false;

        this.stage = 'preflop';
        this.communityCards = [];
        this.pot = 0;
        this.winners = [];
        this.winMessages = [];
        this.currentBet = this.minBet;
        this.deck = this.createDeck();
        this.shuffleDeck(this.deck);

        // Reset player states for the round
        this.players.forEach(p => {
            p.hand = [];
            p.folded = false;
            p.allIn = false;
            p.currentBet = 0;
            p.totalContributed = 0;
        });

        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            this.players.forEach(p => {
                p.hand.push(this.deck.pop());
            });
        }

        // Set blinds (simplified)
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
        this.bigBlindIndex = (this.dealerIndex + 2) % this.players.length;

        this.players[this.smallBlindIndex].chips -= this.minBet / 2;
        this.players[this.smallBlindIndex].currentBet = this.minBet / 2;
        this.players[this.smallBlindIndex].totalContributed = this.minBet / 2;
        this.pot += this.minBet / 2;

        this.players[this.bigBlindIndex].chips -= this.minBet;
        this.players[this.bigBlindIndex].currentBet = this.minBet;
        this.players[this.bigBlindIndex].totalContributed = this.minBet;
        this.pot += this.minBet;

        // Action starts after big blind
        this.currentPlayerIndex = (this.bigBlindIndex + 1) % this.players.length;
        this.skipFoldedPlayers(); // This starts the timer

        // Blind doubling logic: every full rotation (once per player as dealer)
        this.handsInRotation++;
        if (this.handsInRotation >= this.players.length) {
            const oldMin = this.minBet;
            this.minBet *= 2;
            this.handsInRotation = 0;
            console.log(`[GAME] Dealer rotation complete. Blinds doubled: ${oldMin} -> ${this.minBet}`);
        }

        this.onUpdate();
        return true;
    }

    createDeck() {
        let deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push(`${rank}${suit}`);
            }
        }
        return deck;
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    startTurnTimer() {
        this.clearTurnTimer();
        if (this.stage === 'waiting' || this.stage === 'showdown') return;

        this.turnEndTime = Date.now() + 15000;
        const pId = this.players[this.currentPlayerIndex]?.id;

        this.turnTimer = setTimeout(() => {
            const player = this.players.find(p => p.id === pId);
            if (player && !player.folded && !player.allIn) {
                const amountToCall = this.currentBet - player.currentBet;
                this.handleAction(player.id, amountToCall > 0 ? 'fold' : 'check');
                this.onUpdate(); // Ensure clients see the fold
            }
        }, 15000);
    }

    clearTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        this.turnTimer = null;
        this.turnEndTime = null;
    }

    nextStage() {
        this.clearTurnTimer();
        this.players.forEach(p => p.currentBet = 0);
        this.currentBet = 0;
        this.raisesInRound = 0;

        if (this.stage === 'preflop') {
            this.stage = 'flop';
            this.deck.pop(); // Burn card
            this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        } else if (this.stage === 'flop') {
            this.stage = 'turn';
            this.deck.pop(); // Burn card
            this.communityCards.push(this.deck.pop());
        } else if (this.stage === 'turn') {
            this.stage = 'river';
            this.deck.pop(); // Burn card
            this.communityCards.push(this.deck.pop());
        } else if (this.stage === 'river') {
            this.stage = 'showdown';
            this.showdown();
            this.onUpdate();
            return;
        }

        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.skipFoldedPlayers();
    }

    handleAction(playerId, action, amount = 0) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId) return false;

        if (action === 'fold') {
            player.folded = true;
        } else if (action === 'all_in') {
            const betThisTurn = player.chips;
            this.pot += betThisTurn;
            player.currentBet += betThisTurn;
            player.totalContributed += betThisTurn;
            this.currentBet = Math.max(this.currentBet, player.currentBet);
            player.chips = 0;
            player.allIn = true;
        } else if (action === 'double_bet') {
            if (this.raisesInRound >= 3) return false;
            const callAmount = this.currentBet - player.currentBet;
            const doubleRaise = this.currentBet === 0 ? this.minBet * 2 : this.currentBet * 2;
            const totalToPutIn = callAmount + doubleRaise;

            if (player.chips >= totalToPutIn) {
                this.pot += totalToPutIn;
                player.chips -= totalToPutIn;
                player.currentBet += totalToPutIn;
                player.totalContributed += totalToPutIn;
                this.currentBet = player.currentBet;
                this.raisesInRound++;
            } else {
                this.handleAction(playerId, 'all_in');
                return true;
            }
        } else if (action === 'call' || action === 'check') {
            const amountToCall = this.currentBet - player.currentBet;
            if (amountToCall > 0) {
                if (player.chips <= amountToCall) {
                    const betThisTurn = player.chips;
                    this.pot += betThisTurn;
                    player.currentBet += betThisTurn;
                    player.totalContributed += betThisTurn;
                    player.chips = 0;
                    player.allIn = true;
                } else {
                    this.pot += amountToCall;
                    player.chips -= amountToCall;
                    player.currentBet += amountToCall;
                    player.totalContributed += amountToCall;
                }
            }
        } else if (action === 'raise') {
            if (this.raisesInRound >= 3) return false;
            const totalToPutIn = amount - player.currentBet;
            if (player.chips >= totalToPutIn) {
                this.pot += totalToPutIn;
                player.chips -= totalToPutIn;
                player.currentBet += totalToPutIn;
                player.totalContributed += totalToPutIn;
                this.currentBet = amount;
                this.raisesInRound++;
            } else {
                return false;
            }
        }

        this.advanceTurn();
        return true;
    }

    advanceTurn() {
        let activePlayers = this.players.filter(p => !p.folded && !p.allIn);
        if (activePlayers.length <= 1) {
            let nonFolded = this.players.filter(p => !p.folded);
            if (nonFolded.length === 1) {
                nonFolded[0].chips += this.pot;
                this.winners = [nonFolded[0].id];
                this.winMessages = [`${nonFolded[0].name} wins ${this.pot} (Everyone else folded)`];
                this.stage = 'showdown';
                this.clearTurnTimer();
                this.onUpdate();
                setTimeout(() => {
                    const winnerData = [{
                        id: nonFolded[0].id,
                        amount: this.pot,
                        handName: 'Everyone Folded',
                        handRank: 0
                    }];
                    this.endRound(winnerData);
                }, 4000);
                return;
            } else {
                while (this.stage !== 'showdown') {
                    this.nextStage();
                    if (this.stage === 'showdown') break;
                }
                return;
            }
        }

        let playersToAct = this.players.filter(p => !p.folded && !p.allIn);
        let allMatched = playersToAct.every(p => p.currentBet === this.currentBet);

        if (allMatched) {
            this.nextStage();
        } else {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            this.skipFoldedPlayers();
        }
    }

    skipFoldedPlayers() {
        let startIdx = this.currentPlayerIndex;
        let loops = 0;
        while (this.players[this.currentPlayerIndex].folded || this.players[this.currentPlayerIndex].allIn) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            loops++;
            if (loops > this.players.length) break;
        }

        // After finding valid player, start their timer
        this.startTurnTimer();
    }

    showdown() {
        this.clearTurnTimer();
        let eligiblePlayers = this.players.filter(p => !p.folded);
        let hands = eligiblePlayers.map(p => {
            let handCards = p.hand.concat(this.communityCards);
            return { player: p, solved: PokerSolver.solve(handCards) };
        });

        const winnerData = [];
        let remainingPot = this.pot;

        // Side Pot Logic: We need to distribute the pot in "layers" or based on what each winner is eligible for
        while (remainingPot > 0 && hands.length > 0) {
            let solvedHandsOnly = hands.map(h => h.solved);
            let winningSolved = PokerSolver.winners(solvedHandsOnly);
            let currentWinners = hands.filter(h => winningSolved.includes(h.solved));

            // Find the minimum contribution among the CURRENT winners who are All-In
            // If none are All-In, they are eligible for the whole remaining pot
            let allInWinners = currentWinners.filter(h => h.player.allIn);
            let limit = Infinity;
            if (allInWinners.length > 0) {
                limit = Math.min(...allInWinners.map(h => h.player.totalContributed));
            }

            // Calculate how much this group of winners can take from EACH player in the round
            let layerPot = 0;
            this.players.forEach(p => {
                let contribution = Math.min(p.totalContributed, limit);
                layerPot += contribution;
                p.totalContributed -= contribution;
            });

            let splitAmount = Math.floor(layerPot / currentWinners.length);
            currentWinners.forEach(h => {
                h.player.chips += splitAmount;
                this.winners.push(h.player.id);
                this.winMessages.push(`${h.player.name} wins ${splitAmount} with ${h.solved.descr}`);
                winnerData.push({
                    id: h.player.id,
                    amount: splitAmount,
                    handName: h.solved.descr,
                    handRank: h.solved.rank
                });
            });

            remainingPot -= layerPot;

            // Remove winners who were limited by their All-In from the next iteration of pot distribution
            // (Standard poker rules: they only win their "fair share" of the side pot)
            hands = hands.filter(h => h.player.totalContributed > 0);
        }

        setTimeout(() => {
            this.endRound(winnerData);
        }, 6000);
    }

    endRound(winnerData = []) {
        this.stage = 'waiting';
        this.pot = 0;
        this.communityCards = [];
        this.currentBet = 0;
        this.winners = [];
        this.winMessages = [];

        // Eliminate bankrupt players
        let eliminatedIds = [];
        this.players = this.players.filter(p => {
            if (p.chips <= 0) {
                eliminatedIds.push(p.id);
                return false;
            }
            return true;
        });

        this.onRoundEnd(eliminatedIds, winnerData);
    }

    getGameState(requestingPlayerId) {
        let currentHandName = '';
        const reqPlayer = this.players.find(p => p.id === requestingPlayerId);

        if (reqPlayer && reqPlayer.hand.length > 0) {
            try {
                const allCards = reqPlayer.hand.concat(this.communityCards);
                const solved = PokerSolver.solve(allCards);
                currentHandName = solved.descr;
            } catch (e) { }
        }

        return {
            stage: this.stage,
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            dealerIndex: this.dealerIndex,
            smallBlindIndex: this.smallBlindIndex,
            bigBlindIndex: this.bigBlindIndex,
            currentPlayerIndex: this.currentPlayerIndex,
            turnEndTime: this.turnEndTime,
            winners: this.winners,
            winMessages: this.winMessages,
            currentHandName: currentHandName,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                chips: p.chips,
                folded: p.folded,
                allIn: p.allIn,
                isBot: p.isBot,
                isActive: p.id === this.players[this.currentPlayerIndex]?.id && this.stage !== 'showdown' && this.stage !== 'waiting',
                hand: (p.id === requestingPlayerId || this.stage === 'showdown') ? p.hand : []
            }))
        };
    }
}

module.exports = GameEngine;
