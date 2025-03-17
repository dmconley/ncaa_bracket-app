const { sql } = require('@vercel/postgres');
const { put } = require('@vercel/blob');
const { parse } = require('csv-parse/sync');

module.exports = async (req, res) => {
    const { user_id, action } = req.body || req.query;
    const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${user_id}`;
    if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Unauthorized' });

    if (action === 'upload_seeding' && req.method === 'POST') {
        const file = req.files?.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        const csvText = file.data.toString('utf-8');
        const teams = parse(csvText, { columns: true, skip_empty_lines: true });
        teams.sort((a, b) => a.seed - b.seed);

        await sql`DELETE FROM teams`;
        for (const team of teams) {
            const { rows } = await sql`INSERT INTO teams (team_name, seed) VALUES (${team.team_name}, ${team.seed}) RETURNING team_id`;
            team.team_id = rows[0].team_id;
        }
        for (let i = 0; i < 32; i++) {
            await sql`UPDATE games SET slot1_id = ${teams[i].team_id}, slot2_id = ${teams[63 - i].team_id} WHERE game_id = ${i + 1}`;
        }
        res.json({ message: 'Seeding uploaded' });
    } else if (action === 'edit_team' && req.method === 'POST') {
        const { team_id, team_name, seed } = req.body;
        const { rows } = await sql`UPDATE teams SET team_name = ${team_name}, seed = ${seed} WHERE team_id = ${team_id} RETURNING 1`;
        if (!rows.length) return res.status(404).json({ error: 'Team not found' });
        res.json({ message: 'Team updated' });
    } else if (action === 'upload_graphic' && req.method === 'POST') {
        const file = req.files?.file;
        const type = req.body.type;
        if (!file || !['banner', 'overlay'].includes(type)) return res.status(400).json({ error: 'Invalid request' });
        const { url } = await put(`${type}_${Date.now()}.png`, file.data, { access: 'public' });
        const { rows } = await sql`SELECT 1 FROM graphics WHERE type = ${type}`;
        if (rows.length) {
            await sql`UPDATE graphics SET file_path = ${url} WHERE type = ${type}`;
        } else {
            await sql`INSERT INTO graphics (type, file_path) VALUES (${type}, ${url})`;
        }
        res.json({ message: 'Graphic uploaded', file_path: url });
    } else if (action === 'get_graphics' && req.method === 'GET') {
        const { rows } = await sql`SELECT type, file_path FROM graphics`;
        res.json(Object.fromEntries(rows.map(r => [r.type, r.file_path])));
    } else {
        res.status(400).json({ error: 'Invalid action' });
    }
};