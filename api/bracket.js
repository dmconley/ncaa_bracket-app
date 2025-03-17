const { sql } = require('@vercel/postgres');

const resolveTeamName = async (game, slot, user_id) => {
    const slotType = slot === 'slot1' ? game.slot1_type : game.slot2_type;
    const slotId = slot === 'slot1' ? game.slot1_id : game.slot2_id;
    if (slotType === 'team') {
        const { rows } = await sql`SELECT team_name FROM teams WHERE team_id = ${slotId}`;
        return rows[0]?.team_name || 'TBD';
    } else if (slotType === 'game') {
        const { rows } = await sql`SELECT * FROM games WHERE game_id = ${slotId}`;
        if (!rows.length) return 'TBD';
        const prevGame = rows[0];
        const { rows: sel } = await sql`SELECT selected_slot FROM user_selections WHERE user_id = ${user_id} AND game_id = ${slotId}`;
        if (!sel.length) return 'Selection pending';
        return resolveTeamName(prevGame, sel[0].selected_slot, user_id);
    }
};

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const user_id = req.query.user_id;
        const { rows: games } = await sql`SELECT * FROM games ORDER BY game_id`;
        const bracket = await Promise.all(games.map(async game => {
            const slot1_name = await resolveTeamName(game, 'slot1', user_id);
            const slot2_name = await resolveTeamName(game, 'slot2', user_id);
            const { rows: sel } = await sql`SELECT selected_slot FROM user_selections WHERE user_id = ${user_id} AND game_id = ${game.game_id}`;
            return {
                game_id: game.game_id,
                round_number: game.round_number,
                slot1: { type: game.slot1_type, id: game.slot1_id, name: slot1_name },
                slot2: { type: game.slot2_type, id: game.slot2_id, name: slot2_name },
                selected_slot: sel[0]?.selected_slot || null
            };
        }));
        res.json(bracket);
    } else if (req.method === 'POST') {
        const { user_id, game_id, selected_slot } = req.body;
        const { rows } = await sql`SELECT 1 FROM user_selections WHERE user_id = ${user_id} AND game_id = ${game_id}`;
        if (rows.length) {
            await sql`UPDATE user_selections SET selected_slot = ${selected_slot} WHERE user_id = ${user_id} AND game_id = ${game_id}`;
        } else {
            await sql`INSERT INTO user_selections (user_id, game_id, selected_slot) VALUES (${user_id}, ${game_id}, ${selected_slot})`;
        }
        res.json({ message: 'Selection saved' });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};