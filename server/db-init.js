/**
 * 数据库初始化脚本：建表 + 播种种子数据
 * 使用方法: node db-init.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function init() {
  // 先连接 MySQL（不指定数据库）
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  console.log('✓ MySQL 连接成功');

  // 执行 schema.sql
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const sql of statements) {
    try { await conn.query(sql); } catch(e) {
      if (!e.message.includes('already exists')) console.error('  ⚠', e.message);
    }
  }
  console.log('✓ 数据表创建完成');

  await conn.query('USE movie_watchlist');

  // ─── 播种管理员 ───
  const adminPwd = bcrypt.hashSync('admin', 10);
  await conn.query(
    'INSERT IGNORE INTO users (username, password, role, real_name, id_mask) VALUES (?, ?, ?, ?, ?)',
    ['admin', adminPwd, 'admin', '管理员', '****']
  );
  console.log('✓ 管理员账号: admin / admin');

  // ─── 播种种子电影（来自前端 movies-db.js + store.js 的 SEED_MOVIES 整合）───
  const allMovies = require('./seed-movies');
  if (allMovies && allMovies.length) {
    const stmt = 'INSERT IGNORE INTO movies (id, tmdb_id, title, en_title, year, genre, poster, rating, director, cast_list, runtime, overview) VALUES ?';
    const values = allMovies.map(m => [
      m.id, m.tmdbId||'', m.title, m.enTitle||'', m.year||null, m.genre||'剧情',
      m.poster||'', m.rating||8.0, m.director||'', m.cast||'', m.runtime||0, m.overview||''
    ]);
    await conn.query(stmt, [values]);
    console.log(`✓ 种子电影已导入 ${allMovies.length} 部`);
  }

  // ─── 播种种子影评 ───
  const seedReviews = require('./seed-reviews');
  if (seedReviews && seedReviews.length) {
    const fakeUserIds = {};
    for (const r of seedReviews) {
      if (!fakeUserIds[r.username]) {
        const pwd = bcrypt.hashSync('123456', 10);
        await conn.query(
          'INSERT IGNORE INTO users (username, password, role, real_name) VALUES (?, ?, ?, ?)',
          [r.username, pwd, 'user', r.username]
        );
        const [rows] = await conn.query('SELECT id FROM users WHERE username = ?', [r.username]);
        if (rows.length) fakeUserIds[r.username] = rows[0].id;
      }
      const uid = fakeUserIds[r.username];
      await conn.query(
        'INSERT IGNORE INTO reviews (id, user_id, username, movie_id, movie_title, rating, comment, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, uid, r.username, r.movieId, r.movieTitle, r.rating, r.comment, r.createdAt]
      );
    }
    console.log(`✓ 种子影评已导入 ${seedReviews.length} 条`);
  }

  await conn.end();
  console.log('\n🎬 数据库初始化完成！运行 npm start 启动服务');
}

init().catch(err => { console.error('❌ 初始化失败:', err.message); process.exit(1); });
