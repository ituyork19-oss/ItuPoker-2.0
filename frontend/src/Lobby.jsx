import React, { useState } from 'react';
import Chat from './Chat';
import { PlayCircle, Trophy, Users, LayoutDashboard, User, ShoppingBag, LogOut, Award, Volume2, VolumeX } from 'lucide-react';
import BrandingTitle from './BrandingTitle';
import { playTickSound, playHoverSound, startAmbientMusic, toggleMute } from './utils/sounds';

export default function Lobby({ user, onJoin, onLogout, socket }) {
    const [subView, setSubView] = useState('lobby');
    const [ranking, setRanking] = useState([]);
    const [isMuted, setIsMuted] = useState(false);

    React.useEffect(() => {
        socket.emit('get_ranking');
        socket.on('receive_ranking', (data) => setRanking(data));
        // Start premium ambient music on entry
        startAmbientMusic();
        return () => socket.off('receive_ranking');
    }, [socket]);

    const handleToggleMute = () => {
        const newState = toggleMute();
        setIsMuted(!newState);
        playTickSound();
    };

    const tiers = [
        { id: 'Principiante', label: 'Iniciantes', chips: '1.000', difficulty: 'Fácil', color: 'var(--accent-neon-green)' },
        { id: 'Pro', label: 'Sala Pro', chips: '5.000', difficulty: 'Medio', color: 'var(--accent-neon-blue)' },
        { id: 'VIP', label: 'Sala VIP', chips: '10k Gold', difficulty: 'Difícil', color: 'var(--accent-neon-gold)' },
        { id: 'Torneos', label: 'Torneo Pro', chips: '10k Gold', difficulty: 'Experto', color: 'var(--accent-neon-purple)' }
    ];

    return (
        <div className="app-container animate-fade-in" style={{ position: 'relative', width: '100vw', height: '100dvh', display: 'flex' }}>

            {/* Mobile Top Nav */}
            <div className="mobile-top-nav" style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2, 6, 23, 0.95)', borderBottom: '1px solid var(--border-glass)', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)' }}>
                <BrandingTitle text="ItuP" className="" />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-neon-gold)', fontWeight: '900', fontSize: '0.85rem' }}>💰 {user.chips?.toLocaleString()}</span>
                    <span style={{ color: '#FFD700', fontWeight: '900', fontSize: '0.85rem' }}>⭐ {user.goldTickets?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn" style={{ padding: '6px 10px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }} onClick={handleToggleMute}>
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <button className="btn" style={{ padding: '6px 10px', fontSize: '0.7rem', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-neon-red)' }} onClick={() => { playTickSound(); onLogout(); }}>
                        <LogOut size={14} />
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <div className="mobile-bottom-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2, 6, 23, 0.95)', borderTop: '1px solid var(--border-glass)', padding: '6px 0', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    {[{ id: 'lobby', icon: LayoutDashboard, label: 'Mesas' }, { id: 'inventory', icon: Award, label: 'Inventario' }, { id: 'ranking', icon: Trophy, label: 'Ranking' }, { id: 'store', icon: ShoppingBag, label: 'Tienda' }].map(tab => (
                        <button key={tab.id} onClick={() => { playTickSound(); setSubView(tab.id); }} style={{ background: 'none', border: 'none', color: subView === tab.id ? 'var(--accent-neon-green)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '0.6rem', cursor: 'pointer', padding: '4px 8px' }}>
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Left Navigation Sidebar (Desktop/Tablet) */}
            <div className="lobby-sidebar">
                <div style={{ marginBottom: '40px', paddingLeft: '10px' }}>
                    <BrandingTitle />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '2px', marginTop: '5px' }}>CASINO DELUXE</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {[
                        { id: 'lobby', icon: LayoutDashboard, label: 'Lobby / Mesas' },
                        { id: 'profile', icon: User, label: 'Mi Perfil' },
                        { id: 'inventory', icon: Award, label: 'Mi Inventario' },
                        { id: 'ranking', icon: Trophy, label: 'Ranking Global' },
                        { id: 'store', icon: ShoppingBag, label: 'Tienda VIP' }
                    ].map(menu => {
                        const Icon = menu.icon;
                        return (
                            <button
                                key={menu.id}
                                className={`btn ${subView === menu.id ? 'btn-primary' : ''}`}
                                onMouseEnter={playHoverSound}
                                style={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    background: subView === menu.id ? '' : 'transparent',
                                    border: 'none',
                                    padding: '12px 20px',
                                    color: subView === menu.id ? 'white' : 'var(--text-secondary)',
                                    fontSize: '0.9rem'
                                }}
                                onClick={() => {
                                    playTickSound();
                                    setSubView(menu.id);
                                }}
                            >
                                <Icon size={20} /> {menu.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                    <button
                        className="btn"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white', justifyContent: 'center' }}
                        onClick={handleToggleMute}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        {isMuted ? 'MUDO' : 'SONIDO'}
                    </button>

                    <button className="btn" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-neon-red)', justifyContent: 'center' }} onClick={() => { playTickSound(); onLogout(); }}>
                        <LogOut size={18} /> Salir
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Top Statistics Bar */}
                <div style={{ minHeight: '60px', borderBottom: '1px solid var(--border-glass)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.3)', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'white' }}>
                        {subView === 'lobby' ? 'Selección de Mesas' :
                            subView === 'profile' ? 'Perfil del Jugador' :
                                subView === 'inventory' ? 'Inventario de Activos' :
                                    subView === 'ranking' ? 'Líderes de ItuPoker' : 'Tienda de Objetos'}
                    </h2>

                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>FICHAS</span>
                            <span style={{ color: 'var(--accent-neon-gold)', fontWeight: '900', fontSize: '1.1rem' }}>{user.chips?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>GOLD</span>
                            <span style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.1rem' }}>⭐ {user.goldTickets?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-glass)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '2px solid var(--accent-neon-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                            <span style={{ fontWeight: 'bold' }}>{user.username}</span>
                        </div>
                    </div>
                </div>

                {/* Sub-View Content Scrollable */}
                <div style={{ flex: 1, padding: 'clamp(12px, 3vw, 40px)', overflowY: 'auto' }}>

                    {subView === 'lobby' && (
                        <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
                            {tiers.map(t => (
                                <div key={t.id} className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${t.color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ margin: 0 }}>{t.label}</h3>
                                        <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: t.color }}>{t.difficulty}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Entrada mínima: <span style={{ color: 'white', fontWeight: 'bold' }}>{t.chips}</span>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        style={{ marginTop: '10px', width: '100%', background: `linear-gradient(135deg, ${t.color}, #000)` }}
                                        onClick={() => onJoin(null, t.id)}
                                    >
                                        <PlayCircle size={18} /> Jugar Ahora
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {subView === 'inventory' && (
                        <div className="animate-slide-up stats-grid">
                            {[
                                { label: 'Fichas Comunes', val: user.chips?.toLocaleString(), color: 'var(--accent-neon-gold)', icon: '💰' },
                                { label: 'Tiques de Oro', val: user.goldTickets?.toLocaleString(), color: '#FFD700', icon: '⭐' },
                                { label: 'Manos Ganadas', val: user.handsWon || 0, color: 'var(--accent-neon-green)', icon: '🃏' },
                                { label: 'Torneos Ganados', val: user.tournamentsWon || 0, color: 'var(--accent-neon-blue)', icon: '🏆' },
                                { label: 'VIP Survivor Wins', val: user.vipWins || 0, color: 'var(--accent-neon-purple)', icon: '💎' },
                                { label: 'Mejor Mano', val: user.bestHandName || 'Ninguna', color: 'white', icon: '🔥' }
                            ].map((item, idx) => (
                                <div key={idx} className="stat-card">
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{item.icon}</div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</p>
                                    <h3 style={{ color: item.color, margin: '5px 0' }}>{item.val}</h3>
                                </div>
                            ))}
                        </div>
                    )}

                    {subView === 'ranking' && (
                        <div className="glass-panel animate-slide-up" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '20px' }}># RANK</th>
                                        <th style={{ padding: '20px' }}>JUGADOR VIP</th>
                                        <th style={{ padding: '20px' }}>VICTORIAS</th>
                                        <th style={{ padding: '20px' }}>GANANCIAS TOTALES</th>
                                        <th style={{ padding: '20px' }}>MEJOR MANO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                            <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>
                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                            </td>
                                            <td style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                                {row.username}
                                            </td>
                                            <td style={{ padding: '15px 20px', color: 'var(--accent-neon-green)' }}>{row.handsWon}</td>
                                            <td style={{ padding: '15px 20px', color: 'var(--accent-neon-gold)', fontWeight: 'bold' }}>{row.totalChipsWon.toLocaleString()}</td>
                                            <td style={{ padding: '15px 20px', fontSize: '0.9rem', opacity: 0.8 }}>{row.bestHandName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(subView === 'profile' || subView === 'store') && (
                        <div className="glass-panel animate-slide-up" style={{ padding: '40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🛠️</div>
                            <h2 style={{ color: 'white' }}>Sección en mantenimiento</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Estamos afinando los detalles premium para la versión 2.0. ¡Vuelve pronto!</p>
                            <button className="btn btn-action" style={{ marginTop: '20px' }} onClick={() => setSubView('lobby')}>Volver al Lobby</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Chat Sidebar (Desktop/Tablet) */}
            <div className="lobby-chat-sidebar">
                <Chat socket={socket} room="global" username={user.username} />
            </div>

            <div className="developer-credit">
                <span>Software Developer By:</span> Chuintwo
            </div>
        </div>
    );
}
