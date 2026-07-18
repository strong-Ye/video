const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM watchlist WHERE user_id = ?', [req.params.userId]);
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, movieId: r.movie_id, status: r.status,
      userRating: Number(r.user_rating), notes: r.notes, watchedAt: r.watched_at, addedAt: r.created_at
    })));
  } catch(e) { res.json([]); }
});

router.post('/', async (req, res) => {
  try {
    const { userId, movieId, status } = req.body;
    const [exist] = await pool.query('SELECT id FROM watchlist WHERE user_id = ? AND movie_id = ?', [userId, movieId]);
    if (exist.length) return res.json({ ok: false, msg: '已在清单中' });
    const [result] = await pool.query('INSERT INTO watchlist (user_id, movie_id, status) VALUES (?,?,?)', [userId, movieId, status]);
    res.json({ ok: true, id: result.insertId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:userId/:movieId', async (req, res) => {
  try {
    const { status } = req.body;
    const watchedAt = status === 'watched' ? new Date() : null;
    await pool.query('UPDATE watchlist SET status=?, watched_at=? WHERE user_id=? AND movie_id=?', [status, watchedAt, req.params.userId, req.params.movieId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:userId/:movieId', async (req, res) => {
  try {
    await pool.query('DELETE FROM watchlist WHERE user_id=? AND movie_id=?', [req.params.userId, req.params.movieId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/categories/:userId', async (req, res) => {
  try {
    const [cats] = await pool.query('SELECT * FROM categories WHERE user_id = ?', [req.params.userId]);
    const result = [];
    for (const c of cats) {
      const [movies] = await pool.query('SELECT movie_id FROM category_movies WHERE category_id = ?', [c.id]);
      result.push({ id: c.id, userId: c.user_id, category: c.name, movieIds: movies.map(m => m.movie_id), createdAt: c.created_at });
    }
    res.json(result);
  } catch(e) { res.json([]); }
});

router.post('/categories', async (req, res) => {
  try {
    const { userId, category } = req.body;
    const [result] = await pool.query('INSERT INTO categories (user_id, name) VALUES (?,?)', [userId, category]);
    res.json({ ok: true, id: result.insertId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/categories/:id/toggle', async (req, res) => {
  try {
    const { movieId } = req.body;
    const [exist] = await pool.query('SELECT id FROM category_movies WHERE category_id=? AND movie_id=?', [req.params.id, movieId]);
    if (exist.length) {
      await pool.query('DELETE FROM category_movies WHERE id=?', [exist[0].id]);
    } else {
      await pool.query('INSERT INTO category_movies (category_id, movie_id) VALUES (?,?)', [req.params.id, movieId]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
