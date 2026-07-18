/**
 * 电影清单 · API 数据层（替换 localStorage，对接 MySQL 后端）
 * 在前端页面中加载此文件代替部分 store.js 逻辑
 * 使用方式: 部署到服务器后，前端通过 fetch 调用后端 API
 */
(function (global) {
  'use strict';

  const API = ''; // 同域部署时留空，跨域填完整 URL 如 'http://localhost:3000'

  async function fetchJSON(url, opts) {
    const resp = await fetch(API + url, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts || {}));
    if (!resp.ok) throw new Error(resp.status + ' ' + resp.statusText);
    return resp.json();
  }

  const MWS_API = {
    /* ─── 认证 ─── */
    register(username, password) {
      return fetchJSON('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ username, password })
      });
    },
    login(username, password) {
      return fetchJSON('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password })
      });
    },
    getSession(userId) {
      return fetchJSON('/api/auth/session?userId=' + userId);
    },
    getUsers() {
      return fetchJSON('/api/auth/users');
    },

    /* ─── 电影 ─── */
    getMovies() {
      return fetchJSON('/api/movies');
    },
    addMovie(data) {
      return fetchJSON('/api/movies', {
        method: 'POST', body: JSON.stringify(data)
      });
    },
    updateMovie(id, data) {
      return fetchJSON('/api/movies/' + id, {
        method: 'PUT', body: JSON.stringify(data)
      });
    },
    deleteMovie(id) {
      return fetchJSON('/api/movies/' + id, { method: 'DELETE' });
    },

    /* ─── 影评 ─── */
    getReviews() {
      return fetchJSON('/api/reviews');
    },
    getMovieReviews(movieId) {
      return fetchJSON('/api/reviews/movie/' + movieId);
    },
    myAllReviews(userId) {
      return fetchJSON('/api/reviews/my/' + userId);
    },
    addReview(userId, username, movieId, movieTitle, rating, comment) {
      return fetchJSON('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ userId, username, movieId, movieTitle, rating, comment })
      });
    },
    deleteReview(id, byAdmin) {
      return fetchJSON('/api/reviews/' + id + (byAdmin ? '?byAdmin=1' : ''), { method: 'DELETE' });
    },

    /* ─── 影单 ─── */
    getWatchlist(userId) {
      return fetchJSON('/api/watchlist/' + userId);
    },
    addToWatchlist(userId, movieId, status) {
      return fetchJSON('/api/watchlist', {
        method: 'POST', body: JSON.stringify({ userId, movieId, status })
      });
    },
    updateWlStatus(userId, movieId, status) {
      return fetchJSON('/api/watchlist/' + userId + '/' + movieId, {
        method: 'PUT', body: JSON.stringify({ status })
      });
    },
    removeFromWatchlist(userId, movieId) {
      return fetchJSON('/api/watchlist/' + userId + '/' + movieId, { method: 'DELETE' });
    },

    /* ─── 分类 ─── */
    getCategories(userId) {
      return fetchJSON('/api/watchlist/categories/' + userId);
    },
    addCategory(userId, category) {
      return fetchJSON('/api/watchlist/categories', {
        method: 'POST', body: JSON.stringify({ userId, category })
      });
    },
    removeCategory(id) {
      return fetchJSON('/api/watchlist/categories/' + id, { method: 'DELETE' });
    },
    toggleMovieInCategory(catId, movieId) {
      return fetchJSON('/api/watchlist/categories/' + catId + '/toggle', {
        method: 'POST', body: JSON.stringify({ movieId })
      });
    },

    /* ─── 精选 ─── */
    getFeatured() {
      return fetchJSON('/api/featured');
    },
    saveFeatured(movieIds, updatedBy) {
      return fetchJSON('/api/featured', {
        method: 'PUT', body: JSON.stringify({ movieIds, updatedBy })
      });
    }
  };

  global.MWS_API = MWS_API;
})(window);
