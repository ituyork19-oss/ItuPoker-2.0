import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Chat from './Chat';
import { playFoldSound, playChipSound, playCardDealSound, playWinSound, playTickSound, playEpicWinSound, playHoverSound } from './utils/sounds';

export default function PokerTable({ gameState, players, myId, onLeave, onAction, socket }) {
    const [raiseAmount, setRaiseAmount] = useState(40);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSittingOut, setIsSittingOut] = useState(false);
    const [survivorWinner, setSurvivorWinner] = useState(null);

    // Track previous states to trigger sounds only on changes
    const prevStage = useRef(gameState?.stage);
    const prevPot = useRef(gameState?.pot);
    const prevWinners = useRef(gameState?.winners);

    // Dictionary for Spanish Poker Hands
    const handTranslations = {
        'High Card': 'Carta Alta',
        'Pair': 'Par',
        'Two Pair': 'Doble Par',
        'Three of a Kind': 'Trío',
        'Straight': 'Escalera',
        'Flush': 'Color',
        'Full House': 'Full',
        'Four of a Kind': 'Póker',
        'Straight Flush': 'Escalera de Color',
        'Royal Flush': 'Escalera Real'
    };

    const translateHand = (descr) => {
        if (!descr) return '';
        // Extract base name like "Pair" from "Pair, A's"
        const base = descr.split(',')[0];
        const translatedBase = handTranslations[base] || base;
        return translatedBase; // simplified to just 'Par' instead of 'Par, A's' for cleaner UI
    };

    useEffect(() => {
        let interval;
        if (gameState?.turnEndTime) {
            const updateTimer = () => {
                const now = Date.now();
                const diff = Math.max(0, Math.floor((gameState.turnEndTime - now) / 1000));

                if (diff > 0 && diff <= 5) {
                    playTickSound();
                }

                setTimeLeft(diff);
            };
            updateTimer();
            interval = setInterval(updateTimer, 1000);
        } else {
            setTimeLeft(0);
        }
        return () => clearInterval(interval);
    }, [gameState?.turnEndTime]);

    useEffect(() => {
        if (!socket) return;

        socket.on('survivor_winner', (data) => {
            setSurvivorWinner(data);
            playEpicWinSound();
        });

        socket.on('force_lobby', () => {
            onLeave();
        });

        return () => {
            socket.off('survivor_winner');
            socket.off('force_lobby');
        };
    }, [socket, onLeave]);

    // Sound effect triggers based on game state changes
    useEffect(() => {
        if (!gameState) return;

        if (prevPot.current !== undefined && gameState.pot > prevPot.current) {
            playChipSound();
        }
        prevPot.current = gameState.pot;

        if (prevStage.current !== gameState.stage && gameState.stage !== 'waiting' && gameState.stage !== 'showdown') {
            playCardDealSound();
        }
        prevStage.current = gameState.stage;

        if (gameState.winners?.length > 0 && gameState.stage === 'showdown' && prevWinners.current !== gameState.winners) {
            playWinSound();
        }
        prevWinners.current = gameState.winners;

    }, [gameState]);

    if (!gameState) return <div className="app-container flex-center" style={{ fontSize: '1.5rem', color: 'var(--accent-neon-gold)' }}>⏳ Cargando Mesa...</div>;

    const myPlayer = players.find(p => p.id === myId);

    // Auto-fold logic if sitting out
    const isMyTurn = gameState.players.find(p => p.id === myId)?.isActive && !myPlayer?.folded && !myPlayer?.allIn;
    useEffect(() => {
        if (isMyTurn && isSittingOut) {
            setTimeout(() => {
                handleActionWithSound('fold');
            }, 500); // slight delay so it feels natural
        }
    }, [isMyTurn, isSittingOut]);

    const handleRaise = () => {
        onAction('raise', raiseAmount);
    };

    const handleActionWithSound = (actionType) => {
        if (actionType === 'fold') playFoldSound();
        onAction(actionType);
    };

    const onExitGame = () => {
        window.location.reload(); // Hard reset to exit completely
    };

    // Calculate offset so the local player is always at seat-0 (bottom center)
    const myIndex = gameState.players.findIndex(p => p.id === myId);
    const seatOffset = myIndex >= 0 ? myIndex : 0;


    return (
        <div className="app-container animate-fade-in" style={{
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
            position: 'relative',
            overflow: 'hidden',
            flexDirection: 'row'
        }}>

            {/* Main Table Area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                {/* HUD Header */}
                <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="btn btn-action" style={{ padding: '8px 14px', fontSize: '0.75rem' }} onClick={onLeave}>Salir</button>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0 15px', borderRadius: '12px', border: '1px solid var(--border-glass)', backdropFilter: 'blur(5px)' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: isSittingOut ? 'var(--accent-neon-gold)' : 'white', fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={isSittingOut} onChange={(e) => setIsSittingOut(e.target.checked)} />
                                {isSittingOut ? 'SIT OUT ACTIVO' : 'SENTARSE AFUERA'}
                            </label>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '12px 25px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '20px' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Fichas Pro</p>
                            <span style={{ color: 'var(--accent-neon-gold)', fontWeight: '900', fontSize: '1.2rem' }}>{myPlayer?.chips?.toLocaleString()}</span>
                        </div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Gold Tickets</p>
                            <span style={{ color: '#FFD700', fontWeight: '900', fontSize: '1.2rem' }}>⭐ {myPlayer?.goldTickets?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Game Context Info */}
                {gameState.currentHandName && (
                    <div style={{
                        position: 'absolute', top: '100px',
                        background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent-neon-green)',
                        padding: '6px 20px', borderRadius: '50px',
                        color: 'var(--accent-neon-green)', fontWeight: '800',
                        fontSize: '0.9rem', letterSpacing: '2px', zIndex: 5,
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                    }}>
                        {translateHand(gameState.currentHandName).toUpperCase()}
                    </div>
                )}

                {/* The Table */}
                <div className="table-center" style={{ position: 'relative' }}>

                    {/* Community Cards 2.0 */}
                    <div style={{ position: 'absolute', top: '22%', display: 'flex', gap: '12px', zIndex: 10 }}>
                        {gameState.communityCards.map((card, i) => (
                            <div key={i} style={{ animationDelay: `${i * 0.1}s` }} className="animate-deal">
                                <Card value={card} />
                            </div>
                        ))}
                        {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="playing-card back" style={{ opacity: 0.3 }}></div>
                        ))}
                    </div>

                    {/* Pot 2.0 */}
                    <div style={{ position: 'absolute', bottom: '26%', textAlign: 'center', zIndex: 10 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '5px' }}>Pozo Total</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--accent-neon-gold)', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {gameState.pot.toLocaleString()}
                        </div>
                        {gameState.currentBet > 0 && <div style={{ fontSize: '0.85rem', color: 'white', opacity: 0.8, marginTop: '2px' }}>Apuesta: {gameState.currentBet}</div>}
                    </div>

                    {/* Status Badge 2.0 */}
                    <div style={{ position: 'absolute', bottom: '15%', zIndex: 10, background: 'rgba(0,0,0,0.4)', padding: '4px 15px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{gameState.stage}</span>
                    </div>

                    {/* Seat Positions (0-5) */}
                    {gameState.players.map((p, i) => {
                        const isMe = p.id === myId;
                        const isWinner = gameState.winners?.includes(p.id);
                        const isDealer = gameState.dealerIndex === i && gameState.stage !== 'waiting';
                        const isSmallBlind = gameState.smallBlindIndex === i && gameState.stage !== 'waiting';
                        const isBigBlind = gameState.bigBlindIndex === i && gameState.stage !== 'waiting';

                        const seatPos = (i - seatOffset + 6) % 6;

                        return (
                            <div key={p.id} className={`seat seat-${seatPos} ${p.isActive ? 'active' : ''}`} style={{ opacity: p.folded ? 0.4 : 1 }}>
                                {p.isBot && <span className="pill-tag" style={{ background: 'var(--accent-neon-blue)', fontSize: '0.6rem' }}>BOT</span>}

                                {isDealer && <div className="role-badge role-dealer" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}>D</div>}
                                {!isDealer && isSmallBlind && <div className="role-badge role-sb" style={{ boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)' }}>SB</div>}
                                {!isDealer && !isSmallBlind && isBigBlind && <div className="role-badge role-bb" style={{ boxShadow: '0 0 10px rgba(124, 58, 237, 0.5)' }}>BB</div>}

                                {p.isActive && timeLeft > 0 && (
                                    <div style={{ position: 'absolute', top: '-20px', right: '-15px', background: 'var(--accent-neon-red)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '900', zIndex: 10, border: '3px solid #1e293b', boxShadow: '0 0 15px rgba(220, 38, 38, 0.5)' }}>
                                        {timeLeft}
                                    </div>
                                )}

                                <div className="avatar-ring" style={{ width: '80px', height: '80px', borderColor: isWinner ? 'var(--accent-neon-gold)' : undefined, boxShadow: isWinner ? '0 0 30px var(--accent-neon-gold)' : undefined }}>
                                    {p.isBot ? '🤖' : '👤'}
                                </div>

                                <div className="seat-info" style={{ border: isMe ? '1px solid var(--accent-neon-blue)' : '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ color: isMe ? 'var(--accent-neon-blue)' : 'white', fontWeight: '800', fontSize: '0.85rem' }}>{isMe ? 'USTED' : (p.name || 'Jugador').toUpperCase()}</div>
                                    <div className="seat-chips">
                                        <span style={{ color: 'var(--accent-neon-gold)', fontSize: '0.9rem' }}>{p.chips?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Status indicators (Fold, All-in) */}
                                {(p.folded || p.allIn) && (
                                    <div style={{
                                        position: 'absolute', bottom: '-40px',
                                        color: p.folded ? 'var(--accent-neon-red)' : 'var(--accent-neon-gold)',
                                        fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px',
                                        background: 'rgba(0,0,0,0.6)', padding: '2px 10px', borderRadius: '4px'
                                    }}>
                                        {p.folded ? 'RETIRADO' : 'ALL IN'}
                                    </div>
                                )}

                                {/* Player Cards 2.0 */}
                                {p.hand && p.hand.length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '5px', position: 'absolute', top: isMe ? '-85px' : '85px', zIndex: 5 }}>
                                        <div style={{ animationDelay: '0.1s' }} className="animate-deal">
                                            <Card value={p.hand[0]} />
                                        </div>
                                        <div style={{ animationDelay: '0.2s' }} className="animate-deal">
                                            <Card value={p.hand[1]} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Winner Overlay 2.0 */}
                {gameState.stage === 'showdown' && gameState.winMessages?.length > 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, textAlign: 'center', pointerEvents: 'none' }}>
                        <div className="glass-panel animate-slide-up" style={{ padding: '30px 60px', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid var(--accent-neon-green)', boxShadow: '0 0 50px rgba(16, 185, 129, 0.4)' }}>
                            <div style={{ color: 'var(--accent-neon-gold)', fontSize: '1rem', letterSpacing: '8px', fontWeight: 'bold', marginBottom: '10px' }}>GANADOR</div>
                            {gameState.winMessages.map((msg, idx) => (
                                <div key={idx} style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{msg.toUpperCase()}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Controls 2.0 */}
                {isMyTurn && (
                    <div className="glass-panel animate-slide-up" style={{
                        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: '12px', padding: '18px 28px', alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        flexWrap: 'wrap', justifyContent: 'center', zIndex: 50, minWidth: '200px'
                    }}>
                        <button className="btn btn-danger" onMouseEnter={playHoverSound} onClick={() => handleActionWithSound('fold')}>Retirarse</button>
                        <button className="btn btn-action" onMouseEnter={playHoverSound} onClick={() => handleActionWithSound('call')}>Pasar / Ver</button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    <span>SUBIR</span>
                                    <span style={{ color: 'var(--accent-neon-gold)', fontWeight: 'bold' }}>{raiseAmount}</span>
                                </div>
                                <input
                                    type="range"
                                    min={Math.max(gameState.currentBet * 2 || 40, 20)}
                                    max={Math.max(myPlayer?.chips || 100, 40)}
                                    step={10}
                                    value={raiseAmount}
                                    onChange={(e) => {
                                        playTickSound();
                                        setRaiseAmount(Number(e.target.value));
                                    }}
                                    style={{ width: '100px', accentColor: 'var(--accent-neon-gold)' }}
                                />
                            </div>
                            <button className="btn btn-primary" onMouseEnter={playHoverSound} onClick={handleRaise}>Subir</button>
                        </div>

                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '12px' }}>
                            <button className="btn" onMouseEnter={playHoverSound} style={{ background: 'linear-gradient(135deg, #f59e0b, #92400e)', color: 'white' }} onClick={() => handleActionWithSound('all_in')}>
                                ALL IN 🔥
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Survivor Winner Celebration Overlay 2.0 */}
            {survivorWinner && (
                <div className="winner-celebration-overlay">
                    {[...Array(60)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                left: `${Math.random() * 100}vw`,
                                animationDelay: `${Math.random() * 5}s`,
                                backgroundColor: ['#f59e0b', '#2563eb', '#10b981', '#dc2626'][Math.floor(Math.random() * 4)],
                                width: '12px', height: '25px'
                            }}
                        />
                    ))}
                    <div className="winner-content">
                        <div style={{ fontSize: '1.2rem', color: 'var(--accent-neon-gold)', letterSpacing: '10px', marginBottom: '20px' }}>CAMPEÓN SUPREMO</div>
                        <h1 className="winner-title" style={{ fontSize: '7rem' }}>{survivorWinner.name.toUpperCase()}</h1>
                        <div style={{ marginTop: '20px', padding: '10px 40px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-neon-green)', borderRadius: '12px' }}>
                            <p className="winner-prize" style={{ margin: 0 }}>Premio Mayor: {survivorWinner.prize?.toLocaleString()} GOLD</p>
                        </div>
                        <p style={{ color: 'white', marginTop: '60px', opacity: 0.6, letterSpacing: '2px' }}>CONECTANDO AL LOBBY...</p>
                    </div>
                </div>
            )}

            {/* Right Chat Sidebar 2.0 */}
            <div className="poker-chat-sidebar">
                <Chat socket={socket} room={gameState.roomId || 'room'} username={myPlayer?.name || 'Observer'} />
            </div>

            <div className="developer-credit">
                <span>Software Developer By:</span> Chuintwo
            </div>
        </div>
    );
}
