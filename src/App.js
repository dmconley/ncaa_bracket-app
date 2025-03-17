import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

function App() {
    const [user, setUser] = useState(null);
    const [section, setSection] = useState('login');
    const [bracket, setBracket] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [graphics, setGraphics] = useState({});

    const showSection = (sectionId) => setSection(sectionId);

    const login = async (e) => {
        e.preventDefault();
        const username = e.target[0].value;
        const password = e.target[1].value;
        try {
            const res = await axios.post('/api/auth', { action: 'login', username, password });
            setUser(res.data);
            showSection('bracket');
            loadBracket();
            loadGraphics();
        } catch (err) {
            alert(err.response?.data?.error || 'Login failed');
        }
    };

    const register = async (e) => {
        e.preventDefault();
        const username = e.target[0].value;
        const email = e.target[1].value;
        const password = e.target[2].value;
        try {
            const res = await axios.post('/api/auth', { action: 'register', username, email, password });
            setUser(res.data);
            showSection('bracket');
            loadBracket();
            loadGraphics();
        } catch (err) {
            alert(err.response?.data?.error || 'Registration failed');
        }
    };

    const loadBracket = async () => {
        if (!user) return;
        const res = await axios.get(`/api/bracket?user_id=${user.user_id}`);
        setBracket(res.data);
    };

    const saveSelection = async (gameId, selectedSlot) => {
        if (!user) return;
        await axios.post('/api/bracket', { user_id: user.user_id, game_id: gameId, selected_slot: selectedSlot });
        loadBracket();
    };

    const loadLeaderboard = async () => {
        const res = await axios.get('/api/leaderboard');
        setLeaderboard(res.data);
    };

    const loadGraphics = async () => {
        const res = await axios.get('/api/admin?action=get_graphics');
        setGraphics(res.data);
    };

    const handleAdminSubmit = async (e, action) => {
        e.preventDefault();
        if (!user?.is_admin) return alert('Unauthorized');
        const formData = new FormData(e.target);
        formData.append('user_id', user.user_id);
        formData.append('action', action);
        try {
            const res = await axios.post('/api/admin', formData);
            alert(res.data.message);
            if (action === 'upload_seeding') loadBracket();
            if (action === 'upload_graphic') loadGraphics();
        } catch (err) {
            alert(err.response?.data?.error || 'Admin action failed');
        }
    };

    useEffect(() => {
        if (section === 'leaderboard') loadLeaderboard();
    }, [section]);

    const renderBracket = () => (
        <div>
            {graphics.banner && <img src={graphics.banner} alt="Banner" className="banner" />}
            <h2>Your Bracket</h2>
            <p>
                <a href="#" onClick={() => showSection('leaderboard')}>Leaderboard</a> | 
                {user?.is_admin && <a href="#" onClick={() => showSection('admin')}>Admin</a>}
            </p>
            <div className="bracket-container">
                {[...Array(6)].map((_, round) => (
                    <div key={round} className="round">
                        <h3>Round {round + 1}</h3>
                        {bracket.filter(g => g.round_number === round + 1).map(game => (
                            <div key={game.game_id} className="game">
                                <div>{game.slot1.name} vs {game.slot2.name}</div>
                                <button
                                    onClick={() => saveSelection(game.game_id, 'slot1')}
                                    disabled={game.slot1.name === 'TBD' || game.slot1.name === 'Selection pending'}
                                    style={{ backgroundColor: game.selected_slot === 'slot1' ? '#90ee90' : '' }}
                                >
                                    Select {game.slot1.name}
                                </button>
                                <button
                                    onClick={() => saveSelection(game.game_id, 'slot2')}
                                    disabled={game.slot2.name === 'TBD' || game.slot2.name === 'Selection pending'}
                                    style={{ backgroundColor: game.selected_slot === 'slot2' ? '#90ee90' : '' }}
                                >
                                    Select {game.slot2.name}
                                </button>
                            </div>
                        ))}
                    </div>
                ))}
                {graphics.overlay && <img src={graphics.overlay} alt="Overlay" className="overlay" />}
            </div>
        </div>
    );

    return (
        <div id="app">
            {section === 'login' && (
                <div className="section">
                    <h2>Login</h2>
                    <form onSubmit={login}>
                        <input type="text" placeholder="Username" required />
                        <input type="password" placeholder="Password" required />
                        <button type="submit">Login</button>
                    </form>
                    <p>Don't have an account? <a href="#" onClick={() => showSection('register')}>Register</a></p>
                </div>
            )}
            {section === 'register' && (
                <div className="section">
                    <h2>Register</h2>
                    <form onSubmit={register}>
                        <input type="text" placeholder="Username" required />
                        <input type="email" placeholder="Email" required />
                        <input type="password" placeholder="Password" required />
                        <button type="submit">Register</button>
                    </form>
                    <p>Already have an account? <a href="#" onClick={() => showSection('login')}>Login</a></p>
                </div>
            )}
            {section === 'bracket' && renderBracket()}
            {section === 'leaderboard' && (
                <div className="section">
                    <h2>Leaderboard</h2>
                    <p><a href="#" onClick={() => showSection('bracket')}>Back to Bracket</a></p>
                    <div className="leaderboard">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Username</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{entry.username}</td>
                                        <td>{entry.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {section === 'admin' && user?.is_admin && (
                <div className="section">
                    <h2>Admin Panel</h2>
                    <p><a href="#" onClick={() => showSection('bracket')}>Back to Bracket</a></p>
                    <h3>Upload Seeding (CSV: team_name,seed)</h3>
                    <form onSubmit={(e) => handleAdminSubmit(e, 'upload_seeding')}>
                        <input type="file" name="file" accept=".csv" required />
                        <button type="submit">Upload</button>
                    </form>
                    <h3>Edit Team</h3>
                    <form onSubmit={(e) => handleAdminSubmit(e, 'edit_team')}>
                        <input type="number" name="team_id" placeholder="Team ID" required />
                        <input type="text" name="team_name" placeholder="Team Name" required />
                        <input type="number" name="seed" placeholder="Seed" required />
                        <button type="submit">Update</button>
                    </form>
                    <h3>Upload Graphic</h3>
                    <form onSubmit={(e) => handleAdminSubmit(e, 'upload_graphic')}>
                        <select name="type">
                            <option value="banner">Banner</option>
                            <option value="overlay">Overlay</option>
                        </select>
                        <input type="file" name="file" accept="image/*" required />
                        <button type="submit">Upload</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default App;