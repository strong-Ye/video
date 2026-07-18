/**
 * 电影路由: 增删改查
 */
const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/movies  — 获取全部电影
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM movies ORDER BY id');
    // 转换为前端格式
    const movies = rows.map(r => ({
      id: r.id, tmdbId: r.tmdb_id, title: r.title, enTitle: r.en_title,
      year: r.year, genre: r.genre, poster: r.poster, rating: Number(r.rating),
      director: r.director, cast: r.cast_list, runtime: r.runtime, overview: r.overview
    }));
    res.json(movies);
  } catch(e) { res.json([]); }
});

// POST /api/movies  — 新增电影
router.post('/', async (req, res) => {
  try {
    const f = req.body;
    const [result] = await pool.query(
      'INSERT INTO movies (tmdb_id, title, en_title, year, genre, poster, rating, director, cast_list, runtime, overview) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [f.tmdbId||'', f.title, f.enTitle||'', f.year||null, f.genre||'剧情',
       f.poster||'', f.rating||8.0, f.director||'', f.cast||'', f.runtime||0, f.overview||'']
    );
    const [rows] = await pool.query('SELECT * FROM movies WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/movies/:id  — 编辑电影
router.put('/:id', async (req, res) => {
  try {
    const f = req.body;
    await pool.query(
      'UPDATE movies SET title=?, en_title=?, year=?, genre=?, poster=?, rating=?, director=?, cast_list=?, runtime=?, overview=? WHERE id=?',
      [f.title, f.enTitle||'', f.year, f.genre, f.poster||'', f.rating,
       f.director||'', f.cast||'', f.runtime||0, f.overview||'', req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM movies WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/movies/:id  — 删除电影
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM movies WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
