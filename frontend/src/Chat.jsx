import React, { useState, useEffect, useRef } from 'react';
import { playNotificationSound, playTickSound } from './utils/sounds';

export default function Chat({ socket, room = 'global', username }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Join the specific chat room
        socket.emit('join_chat', room);

        // Listen for new messages
        const handleNewMessage = (msgData) => {
            if (msgData.room === room) {
                setMessages((prev) => [...prev, msgData]);
                // Play notification if not me
                if (msgData.sender !== username) {
                    playNotificationSound();
                }
            }
        };

        socket.on('chat_msg', handleNewMessage);

        // Cleanup on unmount or room change
        return () => {
            socket.off('chat_msg', handleNewMessage);
        };
    }, [socket, room]);

    useEffect(() => {
        // Auto-scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const msgData = {
            room,
            sender: username || 'Anon',
            text: input.trim(),
            timestamp: Date.now()
        };

        socket.emit('send_chat_msg', msgData);
        setInput('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(15, 23, 42, 0.4)' }}>
                <h4 style={{ margin: 0, color: 'var(--accent-neon-gold)', fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {room === 'global' ? '🌐 CHAT GLOBAL' : '🃏 CHAT DE SALA'}
                </h4>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px', fontSize: '0.8rem', opacity: 0.5 }}>
                        NO HAY MENSAJES AÚN
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === username ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: '0.7rem', color: m.sender === username ? 'var(--accent-neon-blue)' : 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px', padding: '0 4px' }}>
                                {m.sender.toUpperCase()}
                            </span>
                            <div style={{
                                background: m.sender === username ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.03)',
                                padding: '10px 14px', borderRadius: m.sender === username ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                maxWidth: '90%', wordBreak: 'break-word', fontSize: '0.9rem',
                                border: '1px solid rgba(255,255,255,0.05)',
                                color: 'white',
                                boxShadow: m.sender === username ? '0 4px 15px rgba(37, 99, 235, 0.1)' : 'none'
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid var(--border-glass)', background: 'rgba(15, 23, 42, 0.4)' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        className="input-field"
                        style={{ flex: 1, padding: '10px 15px', fontSize: '0.9rem' }}
                        placeholder="Escribe un mensaje..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '12px' }}>
                        ENVIAR
                    </button>
                </div>
            </form>
        </div>
    );
}
