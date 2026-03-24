import React, { useState, useEffect } from 'react';

export default function AdminPanel({ socket, onClose }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [players, setPlayers] = useState([]);
    const [adminMsg, setAdminMsg] = useState('');
    const [currencyType, setCurrencyType] = useState('chips'); // 'chips' or 'gold'

    const targetUser = 'Chu.in.two_Itupoker_078';
    const targetPass = 'Humo500_Intwo_1978_Poker';

    const handleLogin = (e) => {
        e.preventDefault();
        if (username === targetUser && password === targetPass) {
            setIsAuthenticated(true);
            setLoginError('');
        } else {
            setLoginError('Credenciales incorrectas');
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        // Request players list on mount
        socket.emit('admin_get_players');

        // Listen for players list updates
        socket.on('admin_players_list', (data) => {
            setPlayers(data);
        });

        // Listen for admin messages
        socket.on('admin_msg', (msg) => {
            setAdminMsg(msg);
            setTimeout(() => setAdminMsg(''), 3000);
            socket.emit('admin_get_players'); // Refresh list after action
        });

        // Polling to keep the list updated every 3 seconds
        const pollInterval = setInterval(() => {
            socket.emit('admin_get_players');
        }, 3000);

        return () => {
            socket.off('admin_players_list');
            socket.off('admin_msg');
            clearInterval(pollInterval);
        };
    }, [socket, isAuthenticated]);

    const handleGrantChips = (socketId, amount) => {
        const isGold = currencyType === 'gold';
        socket.emit('admin_grant_chips', { targetSocketId: socketId, amount, isGold });
    };

    const handleGrantAll = (amount) => {
        const isGold = currencyType === 'gold';
        socket.emit('admin_grant_all', { amount, isGold });
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'white' }}>

            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <button className="btn btn-danger" onClick={onClose}>Cerrar Admin</button>
            </div>

            {!isAuthenticated ? (
                <div className="glass-panel animate-slide-up" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h2 style={{ color: 'var(--accent-neon-green)', textAlign: 'center', margin: 0 }}>Acceso Restringido</h2>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="Usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            className="input-field"
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {loginError && <p style={{ color: 'var(--accent-neon-red)', margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>{loginError}</p>}
                        <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '1.1rem' }}>Ingresar</button>
                    </form>
                </div>
            ) : (
                <>
                    <h1 style={{ color: 'var(--accent-neon-green)', marginBottom: '20px' }}>Developer / Admin Panel</h1>
                    <p style={{ marginBottom: '20px' }}>Administra a los jugadores y otorga fichas en tiempo real.</p>

                    {adminMsg && (
                        <div style={{ background: 'var(--accent-neon-blue)', color: 'white', padding: '10px 20px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
                            {adminMsg}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                        <div>
                            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Moneda a otorgar:</label>
                            <select
                                className="input-field"
                                style={{ width: '150px', display: 'inline-block' }}
                                value={currencyType}
                                onChange={(e) => setCurrencyType(e.target.value)}
                            >
                                <option value="chips">Fichas Comunes</option>
                                <option value="gold">Fichas Gold (VIP)</option>
                            </select>
                        </div>
                        <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            <span style={{ marginRight: '10px', fontWeight: 'bold' }}>A Todos los Conectados:</span>
                            <button className="btn btn-primary" style={{ padding: '5px 15px', marginRight: '5px' }} onClick={() => handleGrantAll(1000)}>+1k</button>
                            <button className="btn btn-gold" style={{ padding: '5px 15px' }} onClick={() => handleGrantAll(5000)}>+5k</button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ width: '90%', maxWidth: '900px', maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '10px' }}>Name</th>
                                    <th style={{ padding: '10px' }}>Room</th>
                                    <th style={{ padding: '10px' }}>Tier</th>
                                    <th style={{ padding: '10px' }}>Chips</th>
                                    <th style={{ padding: '10px' }}>Gold</th>
                                    <th style={{ padding: '10px' }}>Acciones Individuales</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((p) => (
                                    <tr key={p.socketId} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <td style={{ padding: '10px', color: 'var(--accent-neon-blue)' }}>{p.name}</td>
                                        <td style={{ padding: '10px' }}>{p.roomName}</td>
                                        <td style={{ padding: '10px', color: 'var(--accent-neon-gold)' }}>{p.tier}</td>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.chips}</td>
                                        <td style={{ padding: '10px', color: 'var(--accent-neon-gold)', fontWeight: 'bold' }}>{p.goldTickets || 0}</td>
                                        <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                            <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleGrantChips(p.socketId, 1000)}>+1k</button>
                                            <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleGrantChips(p.socketId, 5000)}>+5k</button>
                                            <button className="btn btn-gold" style={{ padding: '5px 10px', fontSize: '0.8rem' }} onClick={() => handleGrantChips(p.socketId, 50000)}>+50k</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {players.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px' }}>No hay jugadores humanos conectados.</p>}
                    </div>
                </>
            )}
        </div>
    );
}
