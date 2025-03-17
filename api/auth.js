const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    const { action, username, email, password } = req.body;
    if (action === 'register') {
        const existing = await sql`SELECT 1 FROM users WHERE username = ${username} OR email = ${email}`;
        if (existing.rows.length) return res.status(400).json({ error: 'Username or email exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await sql`INSERT INTO users (username, email, password) VALUES (${username}, ${email}, ${hashedPassword}) RETURNING user_id`;
        return res.json({ user_id: rows[0].user_id, is_admin: false });
    } else if (action === 'login') {
        const { rows } = await sql`SELECT user_id, password, is_admin FROM users WHERE username = ${username}`;
        if (!rows.length || !await bcrypt.compare(password, rows[0].password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        return res.json({ user_id: rows[0].user_id, is_admin: rows[0].is_admin || false });
    }
    res.status(400).json({ error: 'Invalid action' });
};