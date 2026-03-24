const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Convert PostgreSQL snake_case row → camelCase JS object
function rowToUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        password: row.password,
        verification_code: row.verification_code,
        is_verified: row.is_verified,
        chips: row.chips,
        goldTickets: row.gold_tickets,
        lastRoom: row.last_room,
        handsWon: row.hands_won,
        totalChipsWon: row.total_chips_won,
        tournamentsWon: row.tournaments_won,
        bestHandName: row.best_hand_name,
        bestHandRank: row.best_hand_rank,
        vipWins: row.vip_wins
    };
}

// Map camelCase JS keys → snake_case DB columns
const FIELD_MAP = {
    chips: 'chips',
    goldTickets: 'gold_tickets',
    is_verified: 'is_verified',
    verification_code: 'verification_code',
    lastRoom: 'last_room',
    handsWon: 'hands_won',
    totalChipsWon: 'total_chips_won',
    tournamentsWon: 'tournaments_won',
    bestHandName: 'best_hand_name',
    bestHandRank: 'best_hand_rank',
    vipWins: 'vip_wins',
    username: 'username',
    email: 'email',
    phone: 'phone',
    password: 'password'
};

const initDb = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            verification_code TEXT,
            is_verified INTEGER DEFAULT 0,
            chips INTEGER DEFAULT 1000,
            gold_tickets INTEGER DEFAULT 0,
            last_room TEXT,
            hands_won INTEGER DEFAULT 0,
            total_chips_won INTEGER DEFAULT 0,
            tournaments_won INTEGER DEFAULT 0,
            best_hand_name TEXT DEFAULT 'N/A',
            best_hand_rank INTEGER DEFAULT 0,
            vip_wins INTEGER DEFAULT 0
        )
    `);
    console.log('[DB] PostgreSQL schema initialized ✅');
};

const db = {
    getUsers: async () => {
        const result = await pool.query('SELECT * FROM users');
        return result.rows.map(rowToUser);
    },

    getUserByEmail: async (email) => {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return rowToUser(result.rows[0]);
    },

    getUserByUsername: async (username) => {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return rowToUser(result.rows[0]);
    },

    getUserByPhone: async (phone) => {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        return rowToUser(result.rows[0]);
    },

    getUserById: async (id) => {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return rowToUser(result.rows[0]);
    },

    addUser: async (user) => {
        const newUser = {
            id: Date.now().toString(),
            username: user.username,
            email: user.email,
            phone: user.phone,
            password: user.password,
            verification_code: user.verification_code,
            is_verified: user.is_verified || 0,
            chips: user.chips || 1000,
            gold_tickets: user.goldTickets || 0,
        };
        await pool.query(
            `INSERT INTO users (id, username, email, phone, password, verification_code, is_verified, chips, gold_tickets)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [newUser.id, newUser.username, newUser.email, newUser.phone,
            newUser.password, newUser.verification_code, newUser.is_verified,
            newUser.chips, newUser.gold_tickets]
        );
        return db.getUserById(newUser.id);
    },

    updateUser: async (id, updates) => {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            const dbField = FIELD_MAP[key] || key;
            fields.push(`${dbField} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return rowToUser(result.rows[0]);
    }
};

module.exports = { db, initDb };
