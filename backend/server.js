require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db, initDb } = require('./db');
const RoomManager = require('./RoomManager');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ItuPokerSecretKey2026';

// AUTHENTICATION ROUTES
app.post('/api/auth/register', async (req, res) => {
    const { username, email, phone, password } = req.body;
    if (!username || !email || !phone || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        if (await db.getUserByEmail(email)) return res.status(400).json({ error: 'El email ya está registrado.' });
        if (await db.getUserByPhone(phone)) return res.status(400).json({ error: 'El teléfono ya está registrado.' });
        if (await db.getUserByUsername(username)) return res.status(400).json({ error: 'El nombre de usuario no está disponible.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = await db.addUser({
            username,
            email,
            phone,
            password: hashedPassword,
            verification_code: verificationCode,
            is_verified: 0,
            chips: 1000,
            goldTickets: 0,
            lastRoom: null
        });

        console.log(`\n======================================================`);
        console.log(`[VERIFICACIÓN SIMULADA] Código para ${username}: ${verificationCode}`);
        console.log(`======================================================\n`);

        res.status(201).json({ message: 'Registro exitoso. Revisa tu consola para el código de verificación.', userId: newUser.id, email: newUser.email });
    } catch (e) {
        console.error('[REGISTER ERROR]', e);
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await db.getUserByEmail(email);
        if (!user) return res.status(400).json({ error: 'Usuario no encontrado.' });
        if (user.is_verified === 1) return res.status(400).json({ error: 'El usuario ya ha sido verificado.' });

        if (user.verification_code === code) {
            await db.updateUser(user.id, { is_verified: 1, verification_code: null });
            res.json({ message: 'Cuenta verificada correctamente.' });
        } else {
            res.status(400).json({ error: 'Código de verificación incorrecto.' });
        }
    } catch (err) {
        console.error('[VERIFY ERROR]', err);
        res.status(500).json({ error: 'Error al verificar.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await db.getUserByEmail(email);
        if (!user) user = await db.getUserByUsername(email);
        if (!user) return res.status(400).json({ error: 'Credenciales inválidas.' });

        if (user.is_verified === 0) {
            return res.status(403).json({ error: 'Debes verificar tu cuenta primero.', requiresVerification: true, email: user.email });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                chips: user.chips,
                goldTickets: user.goldTickets || 0,
                lastRoom: user.lastRoom || null,
                handsWon: user.handsWon || 0,
                totalChipsWon: user.totalChipsWon || 0,
                tournamentsWon: user.tournamentsWon || 0,
                bestHandName: user.bestHandName || 'N/A',
                bestHandRank: user.bestHandRank || 0,
                vipWins: user.vipWins || 0
            }
        });
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

// SOCKET IO LOGIC
const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('identify_user', (userData) => {
        roomManager.identifyUser(socket.id, userData);
    });

    socket.on('join_room', ({ roomId, playerName, tier, dbUserId }) => {
        roomManager.joinRoom(socket, roomId, playerName, tier, dbUserId);
    });

    socket.on('leave_room', () => {
        roomManager.leaveRoom(socket);
    });

    socket.on('player_action', (actionData) => {
        roomManager.handlePlayerAction(socket, actionData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        roomManager.disconnectUser(socket);
    });

    // Admin endpoints
    socket.on('admin_get_players', () => {
        const players = roomManager.getAllPlayers();
        socket.emit('admin_players_list', players);
    });

    socket.on('admin_grant_chips', ({ targetSocketId, amount, isGold }) => {
        const success = roomManager.grantChips(targetSocketId, amount, isGold);
        if (success) {
            const currency = isGold ? 'Gold Tickets' : 'Fichas';
            socket.emit('admin_msg', `Otorga ${amount} ${currency} al jugador con éxito.`);
        } else {
            socket.emit('admin_msg', `Error al otorgar fondos. Jugador no encontrado.`);
        }
    });

    socket.on('admin_grant_all', ({ amount, isGold }) => {
        roomManager.grantToAll(amount, isGold);
        const currency = isGold ? 'Gold Tickets' : 'Fichas';
        socket.emit('admin_msg', `Se enviaron ${amount} ${currency} a todos los conectados.`);
    });

    // Chat System
    socket.on('join_chat', (roomName) => {
        socket.join(roomName);
    });

    socket.on('send_chat_msg', (msgData) => {
        io.to(msgData.room).emit('chat_msg', msgData);
    });

    socket.on('get_ranking', async () => {
        const ranking = await roomManager.getRanking();
        socket.emit('receive_ranking', ranking);
    });
});

// Start server after DB is initialized
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`ItuPoker Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('[FATAL] Could not initialize database:', err.message);
    console.error('Make sure DATABASE_URL is set in your .env file');
    process.exit(1);
});
