import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import PokerTable from './PokerTable';
import AdminPanel from './AdminPanel';
import Auth from './Auth';

// Connect to backend server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('itupoker_user');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch { return null; }
  }); // Auth State

  const [inRoom, setInRoom] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    // 1. Initial Session Restoration
    try {
      const savedUserStr = localStorage.getItem('itupoker_user');
      if (savedUserStr && savedUserStr !== 'undefined') {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && socket.connected) {
          socket.emit('identify_user', savedUser);
        }
      }
    } catch (e) {
      console.error("Error restoring session:", e);
      localStorage.removeItem('itupoker_user');
    }

    socket.on('connect', () => {
      console.log('Connected to server');
      const savedUser = JSON.parse(localStorage.getItem('itupoker_user') || 'null');
      if (savedUser) {
        socket.emit('identify_user', savedUser);
      }
    });

    socket.on('user_update', (data) => {
      setUser((prev) => {
        if (!prev) return prev;
        const newUser = { ...prev, ...data };
        localStorage.setItem('itupoker_user', JSON.stringify(newUser));
        return newUser;
      });
    });

    socket.on('game_state', (data) => {
      setInRoom(true);
      setGameState(data.gameState);
      setPlayers(data.players);
    });

    // Unified error listener
    socket.on('error', (msg) => {
      setErrorMsg(`Error: ${msg}`);
      setTimeout(() => setErrorMsg(''), 5000);
    });

    socket.on('client_error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    });

    // New disconnect listener to reset state
    socket.on('disconnect', () => {
      setInRoom(false);
      setGameState(null);
      setPlayers([]);
      setErrorMsg('Desconectado del servidor.');
      setTimeout(() => setErrorMsg(''), 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('user_update');
      socket.off('game_state');
      socket.off('error');
      socket.off('disconnect');
      socket.off('client_error');
    };
  }, []);

  const handleLoginSuccess = (userData, jwtToken) => {
    setUser(userData);
    localStorage.setItem('itupoker_token', jwtToken);
    localStorage.setItem('itupoker_user', JSON.stringify(userData));
    socket.emit('identify_user', userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('itupoker_token');
    localStorage.removeItem('itupoker_user');
    handleLeaveRoom();
  };

  const handleJoinGame = (targetRoomId = null, tier = 'Principiante') => {
    if (!user) return;
    socket.emit('join_room', { roomId: targetRoomId, playerName: user.username, tier, dbUserId: user.id });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setInRoom(false);
    setGameState(null);
  };

  const handleAction = (action, amount = 0) => {
    socket.emit('player_action', { action, amount });
  };

  return (
    <div className="app-container">
      {errorMsg && (
        <div style={{ position: 'absolute', top: 20, zIndex: 100 }} className="glass-panel">
          <p style={{ color: 'var(--accent-neon-red)', padding: '10px 20px', fontWeight: 'bold' }}>{errorMsg}</p>
        </div>
      )}

      {!user ? (
        <Auth onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {isAdminMode && <AdminPanel socket={socket} onClose={() => setIsAdminMode(false)} />}

          {!inRoom && !isAdminMode && (
            <>
              {/* Secret Admin Button Top Center (Only for specific email) */}
              {user.email === 'ituyork19@gmail.com' && (
                <button
                  style={{
                    position: 'absolute',
                    top: 15,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--accent-neon-gold)',
                    color: 'var(--accent-neon-gold)',
                    padding: '6px 15px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)'
                  }}
                  onClick={() => setIsAdminMode(true)}
                >
                  ⚙️ ACCESO ADMIN
                </button>
              )}

              <Lobby user={user} onJoin={handleJoinGame} onLogout={handleLogout} socket={socket} />
            </>
          )}

          {inRoom && !isAdminMode && (
            <PokerTable
              gameState={gameState}
              players={players}
              myId={socket.id}
              onLeave={handleLeaveRoom}
              onAction={handleAction}
              socket={socket}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
