import React, { useState } from 'react';
import { LogIn, UserPlus, Key } from 'lucide-react';
import BrandingTitle from './BrandingTitle';
import { playTickSound, playHoverSound } from './utils/sounds';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Auth({ onLoginSuccess }) {
    const [view, setView] = useState('login'); // 'login', 'register', 'verify'
    const [formData, setFormData] = useState({ username: '', email: '', phone: '', password: '', code: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg(data.message);
            setView('verify');
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, code: formData.code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccessMsg('¡Cuenta verificada! Ahora puedes iniciar sesión.');
            setView('login');
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });
            const data = await res.json();

            if (res.status === 403 && data.requiresVerification) {
                setFormData({ ...formData, email: data.email });
                setView('verify');
                throw new Error(data.error);
            }
            if (!res.ok) throw new Error(data.error);

            // Handle successful login
            onLoginSuccess(data.user, data.token);

        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="app-container flex-center animate-fade-in" style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.1), transparent 70%)' }}>
            <div className="glass-panel animate-slide-up" style={{
                padding: '50px 40px',
                width: '100%',
                maxWidth: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                alignItems: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(37, 99, 235, 0.1)'
            }}>
                <div style={{ transform: 'scale(1.2)', marginBottom: '10px' }}>
                    <BrandingTitle />
                </div>

                <div style={{ width: '100%' }}>
                    {errorMsg && <div style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1px solid var(--accent-neon-red)', color: 'white', padding: '12px', borderRadius: '12px', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>{errorMsg}</div>}
                    {successMsg && <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-neon-green)', color: 'white', padding: '12px', borderRadius: '12px', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>{successMsg}</div>}

                    {view === 'login' && (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: 'white', marginBottom: '5px', fontSize: '1.8rem' }}>Bienvenido</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingresa tus credenciales para jugar</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input className="input-field" name="email" type="text" placeholder="Email o Usuario" value={formData.email} onChange={handleChange} required />
                                <input className="input-field" name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ marginTop: '10px' }}
                                onMouseEnter={playHoverSound}
                                onClick={playTickSound}
                            >
                                <LogIn size={20} /> Iniciar Sesión
                            </button>

                            <p style={{ textAlign: 'center', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                ¿Nuevo en ItuPoker? <span style={{ color: 'var(--accent-neon-blue)', cursor: 'pointer', fontWeight: 'bold', borderBottom: '1px solid transparent' }} className="hover-link" onClick={() => { setView('register'); setErrorMsg(''); setSuccessMsg(''); }}>Crea una cuenta</span>
                            </p>
                        </form>
                    )}

                    {view === 'register' && (
                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: 'white', marginBottom: '5px', fontSize: '1.8rem' }}>Registro VIP</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Únete a la mejor comunidad de Poker</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <input className="input-field" name="username" type="text" placeholder="Nombre de Usuario" value={formData.username} onChange={handleChange} required />
                                <input className="input-field" name="email" type="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required />
                                <input className="input-field" name="phone" type="tel" placeholder="Número de Teléfono" value={formData.phone} onChange={handleChange} required />
                                <input className="input-field" name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-action"
                                onMouseEnter={playHoverSound}
                                onClick={playTickSound}
                            >
                                <UserPlus size={20} /> Registrarse Ahora
                            </button>

                            <p style={{ textAlign: 'center', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                ¿Ya eres miembro? <span style={{ color: 'var(--accent-neon-blue)', cursor: 'pointer', fontWeight: 'bold' }} onMouseEnter={playHoverSound} onClick={() => { playTickSound(); setView('login'); setErrorMsg(''); setSuccessMsg(''); }}>Inicia Sesión</span>
                            </p>
                        </form>
                    )}

                    {view === 'verify' && (
                        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ color: 'var(--accent-neon-gold)', marginBottom: '5px', fontSize: '1.8rem' }}>Verificación</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hemos enviado un código a tu terminal</p>
                            </div>

                            <input className="input-field" name="code" type="text" placeholder="······" value={formData.code} onChange={handleChange} required maxLength={6} style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', fontWeight: '900', color: 'var(--accent-neon-gold)' }} />

                            <button
                                type="submit"
                                className="btn btn-gold"
                                onMouseEnter={playHoverSound}
                                onClick={playTickSound}
                            >
                                <Key size={20} /> Validar Acceso
                            </button>

                            <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--accent-neon-red)', fontSize: '0.8rem', marginTop: '-10px' }} onMouseEnter={playHoverSound} onClick={() => { playTickSound(); setView('login'); }}>
                                Cancelar y volver
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
