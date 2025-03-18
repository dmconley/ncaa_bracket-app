const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

const initBracket = async () => {
    let games = [];
    for (let i = 1; i <= 32; i++) games.push([i, 1, 'team', 0, 'team', 0]);
    for (let i = 33; i <= 48; i++) games.push([i, 2, 'game', (i - 33) * 2 + 1, 'game', (i - 33) * 2 + 2]);
    for (let i = 49; i <= 56; i++) games.push([i, 3, 'game', (i - 49) * 2 + 33, 'game', (i - 49) * 2 + 34]);
    for (let i = 57; i <= 60; i++) games.push([i, 4, 'game', (i - 57) * 2 + 49, 'game', (i - 57) * 2 + 50]);
    for (let i = 61; i <= 62; i++) games.push([i, 5, 'game', (i - 61) * 2 + 57, 'game', (i - 61) * 2 + 58]);
    games.push([63, 6, 'game', 61, 'game', 62]);
    await sql`CREATE TABLE IF NOT EXISTS teams (team_id SERIAL PRIMARY KEY, team_name VARCHAR(100), seed INTEGER)`;
    await sql`CREATE TABLE IF NOT EXISTS games (
        game_id INTEGER PRIMARY KEY,
        round_number INTEGER,
        slot1_type VARCHAR(10),
        slot1_id INTEGER,
        slot2_type VARCHAR(10),
        slot2_id INTEGER,
        actual_winner_slot VARCHAR(10)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(120) UNIQUE,
        password VARCHAR(120),
        is_admin BOOLEAN DEFAULT FALSE
    )`;
    await sql`CREATE TABLE IF NOT EXISTS user_selections (
        user_id INTEGER REFERENCES users(user_id),
        game_id INTEGER REFERENCES games(game_id),
        selected_slot VARCHAR(10),
        PRIMARY KEY (user_id, game_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS graphics (
        graphic_id SERIAL PRIMARY KEY,
        type VARCHAR(20),
        file_path VARCHAR(200),
        uploaded_at TIMESTAMP DEFAULT NOW()
    )`;
    for (const [id, round, s1t, s1i, s2t, s2i] of games) {
        await sql`INSERT INTO games (game_id, round_number, slot1_type, slot1_id, slot2_type, slot2_id) VALUES (${id}, ${round}, ${s1t}, ${s1i}, ${s2t}, ${s2i}) ON CONFLICT DO NOTHING`;
    }
    await sql`INSERT INTO users (username, email, password, is_admin) VALUES ('admin', 'admin@example.com', ${await bcrypt.hash('adminpass', 10)}, TRUE) ON CONFLICT DO NOTHING`;
};

initBracket().then(() => console.log('Database initialized')).catch(console.error);