/**
 * 电影清单 · Express 后端服务
 * 启动: node server.js  (默认 :3000)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes     = require('./routes/auth');
const movieRoutes    = require('./routes/movies');
const reviewRoutes   = require('./routes/reviews');
const watchlistRoutes = require('./routes/watchlist');
const featuredRoutes = require('./routes/featured');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/auth',      authRoutes);
app.use('/api/movies',    movieRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/featured',  featuredRoutes);

// 静态文件（前端）
app.use(express.static(path.join(__dirname, '..'), {
  index: false // 不自动跳转 index.html
}));

// SPA 回退
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'index.html'))
);
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'admin.html'))
);

app.listen(PORT, () => {
  console.log(`🎬 电影清单服务已启动 → http://localhost:${PORT}`);
  console.log(`   C端: http://localhost:${PORT}/`);
  console.log(`   B端: http://localhost:${PORT}/admin`);
});
