const { sql } = require('@vercel/postgres');

const calculateScore = async (user_id) => {
    const points = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };
    const { rows } = await sql`SELECT game_id, selected_slot FROM user_selections WHERE user_id = ${user_id}`;
    let score = 0;
    for (const sel of rows) {
        const { rows: game } = await sql`SELECT round_number, actual_winner_slot FROM games WHERE game_id = ${sel.game_id}`;
        if (game[0].actual_winner_slot && game[0].actual_winner_slot === sel.selected_slot) {
            score += points[game[0].round_number];
        }
    }
    return score;
};

module.exports = async (req, res) => {
    const { rows } = await sql`SELECT user_id, username FROM users WHERE is_admin = FALSE`;
    const leaderboard = await Promise.all(rows.map(async user => ({
        username: user.username,
        score: await calculateScore(user.user_id)
    })));
    leaderboard.sort((a, b) => b.score - a.score);
    res.json(leaderboard);
};