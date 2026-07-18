/**
 * 精选管理路由（B端设置 / C端读取）
 */
const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/featured
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM featured ORDER BY updated_at DESC LIMIT 1');
    if (!rows.length) return res.json({ movieIds: [], auto: true });
    const r = rows[0];
    res.json({
      movieIds: JSON.parse(r.movie_ids || '[]'),
      updatedAt: r.updated_at, updatedBy: r.updated_by, auto: false
    });
  } catch(e) { res.json({ movieIds: [], auto: true }); }
});

// PUT /api/featured
router.put('/', async (req, res) => {
  try {
    const { movieIds, updatedBy } = req.body;
    await pool.query(
      'INSERT INTO featured (movie_ids, updated_by) VALUES (?,?)',
      [JSON.stringify(movieIds), updatedBy || 'admin']
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
