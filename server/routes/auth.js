const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || username.length < 2) return res.json({ ok: false, msg: '用户名至少 2 个字符' });
    if (!password || password.length < 4) return res.json({ ok: false, msg: '密码至少 4 个字符' });
    const [exist] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exist.length) return res.json({ ok: false, msg: '用户名已存在' });
    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role, real_name, id_mask) VALUES (?,?,?,?,?)',
      [username, hash, 'user', username, '****']
    );
    res.json({ ok: true, user: { id: result.insertId, username, role: 'user', realName: username, idMask: '****' } });
  } catch(e) { res.json({ ok: false, msg: '注册失败: ' + e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT id, username, password, role, real_name, id_mask FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.json({ ok: false, msg: '用户名或密码错误' });
    const u = rows[0];
    if (!bcrypt.compareSync(password, u.password)) return res.json({ ok: false, msg: '用户名或密码错误' });
    res.json({ ok: true, user: { id: u.id, username: u.username, role: u.role, realName: u.real_name, idMask: u.id_mask } });
  } catch(e) { res.json({ ok: false, msg: '登录失败: ' + e.message }); }
});

router.get('/session', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);
    if (!userId) return res.json(null);
    const [rows] = await pool.query('SELECT id, username, role, real_name, id_mask FROM users WHERE id = ?', [userId]);
    res.json(rows.length ? rows[0] : null);
  } catch(e) { res.json(null); }
});

router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, real_name, id_mask, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch(e) { res.json([]); }
});

module.exports = router;
