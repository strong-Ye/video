const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, username: r.username, movieId: r.movie_id,
      movieTitle: r.movie_title, rating: r.rating, comment: r.comment,
      deleted: !!r.deleted, deletedBy: r.deleted_by, deletedAt: r.deleted_at,
      createdAt: r.created_at, updatedAt: r.updated_at
    })));
  } catch(e) { res.json([]); }
});

router.get('/movie/:movieId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE movie_id = ? AND deleted = 0 ORDER BY created_at DESC', [req.params.movieId]);
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, username: r.username, movieId: r.movie_id,
      movieTitle: r.movie_title, rating: r.rating, comment: r.comment,
      createdAt: r.created_at, updatedAt: r.updated_at
    })));
  } catch(e) { res.json([]); }
});

router.get('/my/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
    res.json(rows.map(r => ({
      id: r.id, userId: r.user_id, username: r.username, movieId: r.movie_id,
      movieTitle: r.movie_title, rating: r.rating, comment: r.comment,
      deleted: !!r.deleted, deletedBy: r.deleted_by, deletedAt: r.deleted_at,
      createdAt: r.created_at, updatedAt: r.updated_at
    })));
  } catch(e) { res.json([]); }
});

router.post('/', async (req, res) => {
  try {
    const { userId, username, movieId, movieTitle, rating, comment } = req.body;
    const [exist] = await pool.query('SELECT id FROM reviews WHERE user_id = ? AND movie_id = ? AND deleted = 0', [userId, movieId]);
    if (exist.length) {
      await pool.query('UPDATE reviews SET rating=?, comment=?, updated_at=NOW() WHERE id=?', [rating, comment, exist[0].id]);
      return res.json({ ok: true, id: exist[0].id });
    }
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, username, movie_id, movie_title, rating, comment) VALUES (?,?,?,?,?,?)',
      [userId, username, movieId, movieTitle, rating, comment]
    );
    res.json({ ok: true, id: result.insertId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    await pool.query('UPDATE reviews SET rating=?, comment=?, updated_at=NOW() WHERE id=?', [rating, comment, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const byAdmin = req.query.byAdmin === '1';
    await pool.query('UPDATE reviews SET deleted=1, deleted_by=?, deleted_at=NOW() WHERE id=?', [byAdmin ? 'admin' : 'self', req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
