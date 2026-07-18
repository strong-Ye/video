/* ════════════════════════════════════════════════════════════════════
 * 电影清单 · C端客户端 (client.js)
 * 依赖：Vue3 / VueRouter (CDN) + store.js (window.MWS)
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MWS = window.MWS;
  const { createApp, ref, reactive, computed } = Vue;
  const { createRouter, createWebHashHistory } = VueRouter;

  /* ───── 海报加载：Vue 响应式 posterMap + OMDb 批量预加载 ───── */
  const posterMap = reactive({});  // 成功加载的真实海报 URL，按 movie.id 索引

  function posterSrc(m) {
    if (!m) return '';
    return posterMap[m.id] || m.poster || MWS.svgPoster(m);
  }
  function onPosterErr(m) {
    if (!m || posterMap[m.id]) return;
    // TMDb 加载失败，回退 SVG（OMDb 异步获取后会自动覆盖）
    posterMap[m.id] = MWS.svgPoster(m);
  }

  // 批量预加载所有电影的 OMDb 海报（限制并发，不阻塞渲染）
  async function batchLoadPosters() {
    const all = MWS.allMovies();
    for (const m of all) {
      if (!m.tmdbId || posterMap[m.id]) continue;
      MWS.fetchOmdbPoster(m.tmdbId).then(function(url) {
        if (url) posterMap[m.id] = url;
      });
    }
  }

  /* ───── 全局共享状态 ───── */
  const S = reactive({
    user: MWS.getCurrentUser(),
    movies: MWS.getMovies(),
    recommend: MWS.RECOMMEND,
    wl: MWS.getWl(),
    toasts: [],
    dataVer: 0   // ★ 版本号：任何 localStorage 变更时 +1，驱动 computed 刷新
  });

  function bump() { S.dataVer++; }

  // 跨 tab 同步：B端修改电影/影评/精选后，C端实时刷新
  window.addEventListener('storage', function(e) {
    if (e.key === MWS.keys.movies) { S.movies = MWS.getMovies(); bump(); }
    if (e.key === MWS.keys.reviews) bump();
    if (e.key === MWS.keys.watchlists) bump();
    if (e.key === MWS.keys.featured) bump();
  });

  function toast(msg, type = 'success') {
    const id = Date.now() + Math.random();
    S.toasts.push({ id, msg, type });
    setTimeout(() => { S.toasts = S.toasts.filter(t => t.id !== id); }, 2600);
  }
  function allMovies() { return S.movies.concat(S.recommend); }
  function getMovie(id) { return allMovies().find(m => m.id === id); }

  /* ───── 影单(状态式) 按当前用户隔离 ───── */
  function myWl() { return S.user ? S.wl.filter(w => w.userId === S.user.id) : []; }
  function saveWlAll() { MWS.saveWl(S.wl); }
  function watchlistMap() {
    const map = {};
    myWl().forEach(w => { map[w.movieId] = w; });
    return map;
  }
  function addToWl(movieId, status) {
    if (!S.user) { toast('请先登录', 'error'); return; }
    const uid = S.user.id;
    if (S.wl.some(w => w.userId === uid && w.movieId === movieId)) { toast('已在清单中', 'error'); return; }
    S.wl.push({ id: Date.now(), userId: uid, movieId, status, userRating: 0, notes: '', addedAt: new Date().toISOString() });
    saveWlAll(); bump(); toast('已添加到清单 ✓');
  }
  function removeFromWl(movieId) {
    const uid = S.user.id;
    S.wl = S.wl.filter(w => !(w.userId === uid && w.movieId === movieId));
    saveWlAll(); bump(); toast('已移除');
  }
  function updateWlStatus(movieId, status) {
    const it = S.wl.find(w => w.userId === S.user.id && w.movieId === movieId);
    if (it) { it.status = status; if (status === 'watched') it.watchedAt = new Date().toISOString(); saveWlAll(); bump(); }
  }

  /* ═══════════════ 组件：电影卡片 ═══════════════ */
  const STATUS_MAP = [
    { key: 'want_to_watch', label: '📌 想看', cls: 'status-want' },
    { key: 'watching', label: '▶️ 在看', cls: 'status-watching' },
    { key: 'watched', label: '✅ 已看', cls: 'status-watched' }
  ];
  function statusLabel(s) { const it = STATUS_MAP.find(x => x.key === s); return it ? it.label : '📌 想看'; }
  function statusCls(s) { const it = STATUS_MAP.find(x => x.key === s); return it ? it.cls : 'status-want'; }

  const MovieCard = {
    props: ['movie', 'inList', 'showStatusMenu'],
    emits: ['add', 'remove', 'change-status'],
    data() { return { ddOpen: false }; },
    template: `
    <div class="movie-card" @click="$router.push('/movie/'+movie.id)">
      <div class="poster">
        <img :src="posterSrc(movie)" :data-movie-id="movie.id" :alt="movie.title" loading="lazy" referrerpolicy="no-referrer" @error="onPosterErr(movie)">
        <span v-if="movie.genre" class="genre-tag">{{movie.genre}}</span>
        <span class="rating-badge">★{{movie.rating}}</span>
      </div>
      <div class="info">
        <div class="title">{{movie.title}}</div>
        <div class="meta">{{movie.year}} · {{movie.director}}</div>
        <div class="actions" @click.stop>
          <template v-if="inList">
            <div class="status-dropdown" :class="{open:ddOpen}">
              <span :class="['status-badge', statusCls(inList.status)]" @click="ddOpen=!ddOpen">
                {{statusLabel(inList.status)}}
                <span class="dd-arrow">▾</span>
              </span>
              <div class="dd-menu" v-if="ddOpen">
                <div v-for="st in STATUS_MAP" :key="st.key" :class="['dd-item', {current:inList.status===st.key}]"
                     @click="$emit('change-status', movie.id, st.key); ddOpen=false">
                  {{st.label}}
                </div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" @click="$emit('remove', movie.id)" title="移出清单">✕</button>
          </template>
          <template v-else>
            <button class="btn btn-primary btn-sm" style="flex:1" @click="$emit('add', movie, 'want_to_watch')">+ 想看</button>
            <button class="btn btn-outline btn-sm" @click="$emit('add', movie, 'watched')" title="标记已看">✓</button>
          </template>
        </div>
      </div>
    </div>`,
    methods: { posterSrc, onPosterErr, statusLabel, statusCls },
    mounted() {
      const self = this;
      document.addEventListener('click', function closeDd() { self.ddOpen = false; });
    }
  };

  /* ═══════════════ 登录 / 注册 ═══════════════ */
  const LoginPage = {
    template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="brand"><span>🎬</span> 电影清单</div>
        <div class="sub">{{isReg?'创建你的观影账号':'欢迎回来，继续你的影单'}}</div>
        <div class="form-row">
          <label>用户名</label>
          <input v-model="username" @keyup.enter="submit" placeholder="请输入用户名">
        </div>
        <div class="form-row">
          <label>密码</label>
          <input v-model="password" type="password" @keyup.enter="submit" placeholder="至少 4 位">
        </div>
        <div class="form-error">{{err}}</div>
        <button class="btn btn-primary btn-lg" style="width:100%" @click="submit">{{isReg?'注册并进入':'登录'}}</button>
        <div class="demo-tip" v-if="!isReg">演示提示：已内置管理员账号 <b>admin / admin</b>，可前往 B端后台登录管理。</div>
        <div class="switch">
          <template v-if="!isReg">还没有账号？<a @click="isReg=true;err=''">立即注册</a></template>
          <template v-else>已有账号？<a @click="isReg=false;err=''">去登录</a></template>
        </div>
      </div>
    </div>`,
    data() { return { isReg: false, username: '', password: '', err: '' }; },
    methods: {
      submit() {
        if (this.isReg) {
          const r = MWS.register(this.username, this.password);
          if (!r.ok) { this.err = r.msg; return; }
          S.user = r.user;
          this.$router.push('/');
          toast('注册成功，欢迎 ' + r.user.username + '！');
        } else {
          const r = MWS.login(this.username, this.password);
          if (!r.ok) { this.err = r.msg; return; }
          S.user = r.user;
          this.$router.push('/');
        }
      }
    }
  };

  /* ═══════════════ 首页：发现 + 分页 + 跨页搜索 ═══════════════ */
  const HomePage = {
    components: { MovieCard },
    template: `
    <div class="page">
      <!-- ★ 精选轮播 Hero -->
      <div v-if="!hasSearched && featuredMovies.length" class="hero-carousel">
        <div v-for="(fm, idx) in featuredMovies" :key="fm.id"
             :class="['hero-slide', {active:idx===carouselIndex}]"
             :style="{backgroundImage:'url('+posterSrc(fm)+')'}">
          <div class="hero-content">
            <div class="badge-row">
              <span class="tag">⭐ 精选推荐 #{{idx+1}}</span>
              <span class="tag">★ {{fm.rating}}</span>
            </div>
            <h1>{{fm.title}}</h1>
            <p>{{fm.overview}}</p>
            <div class="btn-row">
              <button class="btn btn-primary" @click="$router.push('/movie/'+fm.id)">▶ 查看详情</button>
              <button class="btn btn-secondary" v-if="loggedIn && !inList(fm.id)" @click="addToWl(fm.id,'want_to_watch')">+ 我的清单</button>
              <button class="btn btn-secondary" v-else-if="loggedIn" disabled>已在清单中</button>
              <router-link v-else to="/login" class="btn btn-secondary">登录后添加</router-link>
            </div>
          </div>
        </div>
        <!-- 轮播控制器 -->
        <button class="carousel-arrow carousel-prev" @click="prevSlide">‹</button>
        <button class="carousel-arrow carousel-next" @click="nextSlide">›</button>
        <div class="carousel-dots">
          <span v-for="(fm, idx) in featuredMovies" :key="'dot'+idx"
                :class="['carousel-dot', {active:idx===carouselIndex}]"
                @click="goToSlide(idx)"></span>
        </div>
      </div>

      <div class="search-box">
        <input v-model="keyword" placeholder="搜索电影名称 / 导演 / 演员 / 类型（跨全部 5 页）..." @keyup.enter="doSearch" ref="searchInput">
        <button class="s-btn" @click="doSearch">🔍</button>
      </div>

      <div v-if="loading" class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="sk-card"><div class="sk-poster"></div><div class="sk-line"></div><div class="sk-line short"></div></div>
      </div>

      <div v-else-if="hasSearched">
        <div class="section-label">搜索结果 <span class="count">「{{lastKw}}」— 跨 5 页命中 {{searchResults.length}} 部</span></div>
        <div v-if="searchResults.length===0" class="empty-state">
          <div class="icon">🔎</div><h3>未找到相关电影</h3><p>试试片名、导演或演员，或换个关键词</p>
        </div>
        <div v-else class="movie-grid">
          <movie-card v-for="m in searchResults" :key="m.id" :movie="m" :in-list="wlMap[m.id]"
            @add="(movie,status)=>addToWl(movie.id,status)" @remove="removeFromWl" @change-status="updateWlStatus"></movie-card>
        </div>
        <button class="btn btn-outline" style="margin-top:24px" @click="clearSearch">← 返回浏览</button>
      </div>

      <div v-else>
        <div class="section-label">🔥 全部影片 <span class="count">共 {{movies.length}} 部 · 第 {{currentPage}}/{{totalPages}} 页</span></div>
        <div class="movie-grid">
          <movie-card v-for="m in pagedMovies" :key="m.id" :movie="m" :in-list="wlMap[m.id]"
            @add="(movie,status)=>addToWl(movie.id,status)" @remove="removeFromWl" @change-status="updateWlStatus"></movie-card>
        </div>
        <div class="pager">
          <button :disabled="currentPage===1" @click="go(currentPage-1)">‹ 上一页</button>
          <button v-for="p in pageList" :key="p" :class="{active:p===currentPage}" :disabled="p==='...'" @click="typeof p==='number'&&go(p)">{{p}}</button>
          <button :disabled="currentPage===totalPages" @click="go(currentPage+1)">下一页 ›</button>
          <span class="pager-info">共 {{totalPages}} 页</span>
        </div>
      </div>
    </div>`,
    data() { return { keyword: '', lastKw: '', currentPage: 1, loading: false, hasSearched: false, searchResults: [], carouselIndex: 0, carouselTimer: null }; },
    computed: {
      movies() { return S.movies; },
      loggedIn() { return !!S.user; },
      wlMap() { return watchlistMap(); },
      totalPages() { return Math.max(1, Math.ceil(this.movies.length / 9)); },
      pagedMovies() { const ps = 9; return this.movies.slice((this.currentPage - 1) * ps, this.currentPage * ps); },
      /* ★ B端精选 → C端轮播 */
      featuredMovies() {
        const _ = S.dataVer;
        const f = MWS.getFeatured();
        const all = allMovies();
        return (f.movieIds || []).map(id => all.find(m => m.id === id)).filter(Boolean);
      },
      pageList() {
        const t = this.totalPages, c = this.currentPage;
        if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
        const arr = [1];
        if (c > 3) arr.push('...');
        for (let p = Math.max(2, c - 1); p <= Math.min(t - 1, c + 1); p++) arr.push(p);
        if (c < t - 2) arr.push('...');
        arr.push(t);
        return arr;
      }
    },
    methods: {
      posterSrc, onPosterErr, addToWl, removeFromWl, updateWlStatus,
      inList(id) { return !!this.wlMap[id]; },
      go(p) { if (p < 1 || p > this.totalPages) return; this.currentPage = p; window.scrollTo({ top: 0, behavior: 'smooth' }); },
      doSearch() {
        const kw = (this.keyword || '').trim().toLowerCase();
        if (!kw) { this.clearSearch(); return; }
        this.loading = true; this.lastKw = this.keyword;
        setTimeout(() => {
          this.searchResults = allMovies().filter(m =>
            (m.title && m.title.toLowerCase().includes(kw)) ||
            (m.enTitle && m.enTitle.toLowerCase().includes(kw)) ||
            (m.director && m.director.toLowerCase().includes(kw)) ||
            (m.cast && m.cast.toLowerCase().includes(kw)) ||
            (m.genre && m.genre.toLowerCase().includes(kw))
          );
          this.hasSearched = true; this.loading = false;
        }, 300);
      },
      clearSearch() { this.hasSearched = false; this.keyword = ''; this.searchResults = []; },
      /* 轮播控制 */
      nextSlide() { const n = this.featuredMovies.length; if (n) { this.carouselIndex = (this.carouselIndex + 1) % n; } },
      prevSlide() { const n = this.featuredMovies.length; if (n) { this.carouselIndex = (this.carouselIndex - 1 + n) % n; } },
      goToSlide(idx) { this.carouselIndex = idx; },
      startCarousel() { this.stopCarousel(); this.carouselTimer = setInterval(() => { this.nextSlide(); }, 6000); },
      stopCarousel() { if (this.carouselTimer) { clearInterval(this.carouselTimer); this.carouselTimer = null; } }
    },
    mounted() { this.startCarousel(); },
    beforeUnmount() { this.stopCarousel(); }
  };

  /* ═══════════════ 电影详情 + 写影评 ═══════════════ */
  const DetailPage = {
    template: `
    <div class="page">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <div v-if="!movie" class="empty-state"><div class="icon">🎬</div><h3>电影未找到</h3></div>
      <div v-else class="detail-layout">
        <div class="detail-poster">
          <img v-if="movie" :src="posterSrc(movie)" :data-movie-id="movie.id" :alt="movie.title" referrerpolicy="no-referrer" @error="onPosterErr(movie)">
        </div>
        <div class="detail-info">
          <h2>{{movie.title}}</h2>
          <p class="en-title">{{movie.enTitle}}</p>
          <div class="detail-meta">
            <span>📅 {{movie.year}}</span><span>★ {{movie.rating}}</span>
            <span v-if="movie.runtime">⏱ {{movie.runtime}}分钟</span>
            <span v-if="movie.genre">🎭 {{movie.genre}}</span>
          </div>
          <p class="detail-crew"><strong>导演</strong>{{movie.director}}</p>
          <p class="detail-crew"><strong>主演</strong>{{movie.cast}}</p>
          <p class="detail-overview">{{movie.overview}}</p>
          <div class="detail-actions">
            <template v-if="myReview">
              <span class="status-badge status-watched">✍️ 已写影评 ★{{myReview.rating}}</span>
              <button class="btn btn-outline" @click="openEdit(myReview)">编辑影评</button>
              <button class="btn btn-outline" @click="delReview(myReview)">删除影评</button>
            </template>
            <button v-else-if="loggedIn" class="btn btn-primary btn-lg" @click="openWrite()">✍️ 写影评</button>
            <router-link v-else to="/login" class="btn btn-primary btn-lg">登录后写影评</router-link>
            <template v-if="inList">
              <span :class="['status-badge', statusCls(inList.status)]">{{statusLabel(inList.status)}}</span>
              <select class="status-select" @change="changeStatus($event)" :value="inList.status">
                <option value="want_to_watch">📌 想看</option>
                <option value="watching">▶️ 在看</option>
                <option value="watched">✅ 已看</option>
              </select>
              <button class="btn btn-outline" @click="removeFromWl(movie.id)">移出清单</button>
            </template>
            <template v-else-if="loggedIn">
              <button class="btn btn-primary" @click="addWithStatus('want_to_watch')">📌 想看</button>
              <button class="btn btn-outline" @click="addWithStatus('watching')">▶️ 在看</button>
              <button class="btn btn-outline" @click="addWithStatus('watched')">✅ 已看</button>
            </template>
          </div>

          <!-- 🎬 在线观看 -->
          <div v-if="watchLinks.length" class="watch-links">
            <h4>🎬 在线观看</h4>
            <div class="watch-platforms">
              <a v-for="link in watchLinks" :key="link.platform" :href="link.url"
                 target="_blank" rel="noopener noreferrer"
                 class="watch-btn" :style="{borderColor:link.color,color:link.color}">
                {{link.icon}} {{link.platform}}
              </a>
            </div>
            <p class="watch-hint">点击跳转至对应平台搜索该影片</p>
          </div>
        </div>
      </div>

      <!-- ★ 影评社区：所有人的影评 -->
      <div v-if="movie" class="review-community">
        <div class="rc-header">
          <h3>💬 影评社区</h3>
          <span class="rc-count">共 {{movieReviews.length}} 条影评</span>
        </div>
        <div v-if="movieReviews.length===0" class="rc-empty">
          <p>暂无影评，成为第一个评价的人吧！</p>
        </div>
        <div v-else class="rc-list">
          <div v-for="r in movieReviews" :key="r.id" class="rc-item">
            <div class="rc-avatar">{{(r.username||'?')[0]}}</div>
            <div class="rc-body">
              <div class="rc-head">
                <span class="rc-user">{{r.username}}</span>
                <span class="rc-stars">★ {{r.rating}}</span>
                <span class="rc-time">{{formatTime(r.updatedAt||r.createdAt)}}</span>
              </div>
              <div class="rc-comment">{{r.comment||'（无文字评价）'}}</div>
            </div>
            <span v-if="loggedIn && r.userId===currentUserId" class="rc-mine-tag">我的</span>
          </div>
        </div>
      </div>

      <div class="modal-overlay" v-if="reviewModal.show" @click.self="reviewModal.show=false">
        <div class="modal-content">
          <button class="modal-close" @click="reviewModal.show=false">×</button>
          <h3>{{reviewModal.editing?'编辑影评':'写影评 — '+(movie&&movie.title)}}</h3>
          <div class="star-rating">
            <button v-for="n in 5" :key="n" class="star-btn" :class="{active:reviewModal.rating>=n}" @click="reviewModal.rating=n">★</button>
          </div>
          <p class="rating-text">{{reviewModal.rating?reviewModal.rating+' 星':''}}</p>
          <div class="form-row">
            <textarea v-model="reviewModal.comment" placeholder="说说你的观影感受..." maxlength="300"></textarea>
          </div>
          <div class="form-error">{{reviewModal.err}}</div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="reviewModal.show=false">取消</button>
            <button class="btn btn-primary" :disabled="reviewModal.rating===0" @click="saveReview">保存影评</button>
          </div>
        </div>
      </div>
    </div>`,
        
    data() { return { reviewModal: { show: false, editing: false, rating: 0, comment: '', err: '', id: null } }; },
    computed: {
      movie() { return getMovie(parseInt(this.$route.params.id)); },
      loggedIn() { return !!S.user; },
      currentUserId() { return S.user ? S.user.id : null; },
      inList() { return !!watchlistMap()[this.movie && this.movie.id]; },
      myReview() {
        const _ = S.dataVer;
        if (!S.user || !this.movie) return null;
        return MWS.myReviews(S.user.id).find(r => r.movieId === this.movie.id) || null;
      },
      movieReviews() {
        const _ = S.dataVer;
        if (!this.movie || !this.movie.id) return [];
        try { return MWS.getMovieReviews(this.movie.id) || []; }
        catch(e) { console.error('getMovieReviews error:', e); return []; }
      },
      watchLinks() { return this.movie ? MWS.getWatchLinks(this.movie) : []; }
    },
    methods: {
      posterSrc, onPosterErr, addToWl, removeFromWl, updateWlStatus,
      statusLabel, statusCls,
      formatTime(t) { try { return new Date(t).toLocaleString('zh-CN'); } catch(e) { return ''; } },
      addWithStatus(status) { addToWl(this.movie.id, status); },
      changeStatus(e) { updateWlStatus(this.movie.id, e.target.value); },
      openWrite() { this.reviewModal = { show: true, editing: false, rating: 0, comment: '', err: '', id: null }; },
      openEdit(r) { this.reviewModal = { show: true, editing: true, rating: r.rating, comment: r.comment, err: '', id: r.id }; },
      saveReview() {
        if (!S.user) return;
        if (this.reviewModal.rating === 0) { this.reviewModal.err = '请先打分'; return; }
        if (this.reviewModal.editing) {
          MWS.updateReview(this.reviewModal.id, this.reviewModal.rating, this.reviewModal.comment);
          toast('影评已更新');
        } else {
          MWS.addReview(S.user.id, S.user.username, this.movie.id, this.movie.title, this.reviewModal.rating, this.reviewModal.comment);
          toast('影评已发布 ✓');
        }
        this.reviewModal.show = false;
        bump();
      },
      delReview(r) {
        MWS.deleteReview(r.id, false);
        bump(); toast('影评已删除');
      }
    }
  };

  /* ═══════════════ 我的影评 ═══════════════ */
  const ReviewsPage = {
    template: `
    <div class="page">
      <div class="page-header"><h1 class="page-title">我的影评</h1><p class="page-subtitle">你写过的所有评价都在这里（含被管理员删除的影评）</p></div>
      <div v-if="reviews.length===0" class="empty-state">
        <div class="icon">✍️</div><h3>还没有影评</h3><p>去电影详情页写下你的第一篇影评吧</p>
        <router-link to="/" class="btn btn-primary">去发现电影</router-link>
      </div>
      <div v-else class="list-grid">
        <div v-for="r in reviews" :key="r.id" :class="['review-item', {deleted:r.deleted}]">
          <img class="r-poster" :src="posterSrc(getMovie(r.movieId))" :data-movie-id="r.movieId" :alt="r.movieTitle" referrerpolicy="no-referrer" @error="onPosterErr(getMovie(r.movieId))">
          <div class="r-body">
            <div class="r-head">
              <span class="r-title" @click="$router.push('/movie/'+r.movieId)">{{r.movieTitle}}</span>
              <span class="r-stars">★ {{r.rating}}</span>
              <span v-if="r.deleted" class="status-badge status-want">🚫 已删除</span>
            </div>
            <div class="r-comment" v-if="!r.deleted">{{r.comment || '（无文字评价）'}}</div>
            <div class="r-comment r-comment-deleted" v-else>
              该影评已被管理员删除
              <span v-if="r.deletedBy==='admin'" class="deleted-by">（管理员操作）</span>
              <span v-else class="deleted-by">（自行删除）</span>
            </div>
            <div class="r-time">
              {{formatTime(r.updatedAt||r.createdAt)}}
              <span v-if="r.deleted && r.deletedAt" class="deleted-time"> · 删除于 {{formatTime(r.deletedAt)}}</span>
            </div>
          </div>
          <div class="r-actions" v-if="!r.deleted">
            <button class="btn btn-outline btn-sm" @click="edit(r)">编辑</button>
            <button class="btn btn-danger btn-sm" @click="del(r)">删除</button>
          </div>
          <div class="r-actions" v-else>
            <span class="deleted-badge">已处理</span>
          </div>
        </div>
      </div>

      <div class="modal-overlay" v-if="reviewModal.show" @click.self="reviewModal.show=false">
        <div class="modal-content">
          <button class="modal-close" @click="reviewModal.show=false">×</button>
          <h3>编辑影评 — {{editing&&editing.movieTitle}}</h3>
          <div class="star-rating">
            <button v-for="n in 5" :key="n" class="star-btn" :class="{active:reviewModal.rating>=n}" @click="reviewModal.rating=n">★</button>
          </div>
          <div class="form-row"><textarea v-model="reviewModal.comment" maxlength="300"></textarea></div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="reviewModal.show=false">取消</button>
            <button class="btn btn-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </div>`,
    data() { return { reviewModal: { show: false, rating: 0, comment: '' }, editing: null }; },
    computed: {
      reviews() { const _ = S.dataVer; return S.user ? MWS.myAllReviews(S.user.id).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []; }
    },
    methods: {
      posterSrc, onPosterErr, getMovie,
      formatTime(t) { try { return new Date(t).toLocaleString('zh-CN'); } catch (e) { return ''; } },
      edit(r) { this.editing = r; this.reviewModal = { show: true, rating: r.rating, comment: r.comment }; },
      save() { MWS.updateReview(this.editing.id, this.reviewModal.rating, this.reviewModal.comment); this.reviewModal.show = false; bump(); toast('影评已更新'); },
      del(r) { MWS.deleteReview(r.id, false); bump(); toast('影评已删除'); }
    }
  };

  /* ═══════════════ 我的影单（三分类标签页 + 自定义分类） ═══════════════ */
  const WatchlistPage = {
    components: { MovieCard },
    template: `
    <div class="page">
      <div class="page-header"><h1 class="page-title">我的影单</h1><p class="page-subtitle">管理你的观影清单，想看/在看/已看一目了然</p></div>

      <!-- ★ 三分类 Tab 切换 -->
      <div class="tabs">
        <button v-for="tab in statusTabs" :key="tab.key"
                :class="['tab-btn', {active:currentTab===tab.key}]"
                @click="currentTab=tab.key">
          {{tab.icon}} {{tab.label}}
          <span class="count">({{tab.count}})</span>
        </button>
        <button :class="['tab-btn', {active:currentTab==='custom'}]" @click="currentTab='custom'">
          🗂️ 自定义分类
          <span class="count">({{cats.length}})</span>
        </button>
      </div>

      <!-- 三分类内容区 -->
      <template v-if="currentTab!=='custom'">
        <div class="section-label">
          {{currentStatusInfo.icon}} {{currentStatusInfo.label}}
          <span class="count">共 {{currentMovies.length}} 部</span>
        </div>
        <div v-if="currentMovies.length===0" class="empty-state">
          <div class="icon">{{currentStatusInfo.emptyIcon}}</div>
          <h3>{{currentStatusInfo.emptyTitle}}</h3>
          <p>{{currentStatusInfo.emptyDesc}}</p>
          <router-link to="/" class="btn btn-primary">去发现电影</router-link>
        </div>
        <div v-else class="movie-grid">
          <movie-card v-for="m in currentMovies" :key="m.id" :movie="m" :in-list="wlMap[m.id]"
            @add="(movie,status)=>addToWl(movie.id,status)"
            @remove="removeFromWl"
            @change-status="updateWlStatus"></movie-card>
        </div>
      </template>

      <!-- 自定义分类区 -->
      <template v-else>
        <div class="cat-add">
          <input v-model="newCat" @keyup.enter="createCat" placeholder="新建分类，如：周末必看 / 科幻神作">
          <button class="btn btn-primary" @click="createCat">+ 新建分类</button>
        </div>
        <div v-if="cats.length===0" class="empty-state">
          <div class="icon">🗂️</div><h3>还没有分类</h3><p>在上面输入框创建你的第一个影单分类</p>
        </div>
        <div class="cat-grid">
          <div class="cat-card" v-for="c in cats" :key="c.id">
            <div class="cat-head"><span class="cat-name">{{c.category}}</span><span class="cat-count">{{c.movieIds.length}} 部</span></div>
            <div class="cat-movies">
              <img v-for="mid in c.movieIds" :key="mid" class="mini-poster" :src="posterSrc(getMovie(mid))" :data-movie-id="mid" :alt="(getMovie(mid)||{}).title||'海报'" referrerpolicy="no-referrer" @error="onPosterErr(getMovie(mid))" :title="(getMovie(mid)||{}).title">
              <span v-if="c.movieIds.length===0" style="color:var(--text-muted);font-size:12px">暂无影片，点击添加</span>
            </div>
            <div class="cat-actions">
              <button class="btn btn-outline btn-sm" @click="openPicker(c)">+ 添加影片</button>
              <button class="btn btn-danger btn-sm" @click="rmCat(c)">删除分类</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 添加影片到分类的 picker -->
      <div class="modal-overlay" v-if="picker.show" @click.self="picker.show=false">
        <div class="modal-content" style="width:680px">
          <button class="modal-close" @click="picker.show=false">×</button>
          <h3>为「{{picker.cat&&picker.cat.category}}」添加影片</h3>
          <div class="picker-grid">
            <div v-for="m in allMovies" :key="m.id" class="picker-item" :class="{selected:picker.cat&&picker.cat.movieIds.includes(m.id)}" @click="toggle(m.id)">
              <img :src="posterSrc(m)" :data-movie-id="m.id" :alt="m.title" referrerpolicy="no-referrer" @error="onPosterErr(m)">
              <div class="p-name">{{m.title}}</div>
            </div>
          </div>
          <div class="modal-actions"><button class="btn btn-primary" @click="picker.show=false">完成</button></div>
        </div>
      </div>
    </div>`,
    data() { return { newCat: '', currentTab: 'want_to_watch', picker: { show: false, cat: null } }; },
    computed: {
      cats() { const _ = S.dataVer; return S.user ? MWS.myWatchlists(S.user.id) : []; },
      allMovies() { return allMovies(); },
      wlMap() { return watchlistMap(); },
      statusTabs() {
        const _ = S.dataVer;
        if (!S.user) return [];
        const c = MWS.countWlStatus(S.user.id);
        return [
          { key: 'want_to_watch', label: '想看', icon: '📌', count: c.want_to_watch },
          { key: 'watching', label: '在看', icon: '▶️', count: c.watching },
          { key: 'watched', label: '已看', icon: '✅', count: c.watched }
        ];
      },
      currentMovies() {
        const _ = S.dataVer;
        if (!S.user) return [];
        const status = this.currentTab;
        const ids = MWS.getWlByStatus(S.user.id, status).map(w => w.movieId);
        const movies = allMovies();
        return ids.map(id => movies.find(m => m.id === id)).filter(Boolean);
      },
      currentStatusInfo() {
        const _ = S.dataVer;
        const tmpls = {
          want_to_watch:  { label: '📌 想看', icon: '📌', emptyIcon: '🎯', emptyTitle: '还没有想看的电影', emptyDesc: '发现好电影时，点击"+ 想看"添加到清单' },
          watching:       { label: '▶️ 在看', icon: '▶️', emptyIcon: '🍿', emptyTitle: '还没有在看的电影', emptyDesc: '开始观影时，把它标记为"在看"追踪进度' },
          watched:        { label: '✅ 已看', icon: '✅', emptyIcon: '🏆', emptyTitle: '还没有已看的电影', emptyDesc: '看完电影记得评分，让AI推荐更精准' }
        };
        return tmpls[this.currentTab] || tmpls.want_to_watch;
      }
    },
    methods: {
      posterSrc, onPosterErr, getMovie, addToWl, removeFromWl, updateWlStatus,
      createCat() {
        const name = this.newCat.trim();
        if (!name) return;
        MWS.addCategory(S.user.id, name);
        this.newCat = ''; bump(); toast('分类已创建');
      },
      rmCat(c) { MWS.removeCategory(c.id); bump(); toast('分类已删除'); },
      openPicker(c) {
        const freshCats = MWS.myWatchlists(S.user.id);
        const fresh = freshCats.find(w => w.id === c.id) || c;
        this.picker = { show: true, cat: fresh };
      },
      toggle(mid) {
        MWS.toggleMovieInCategory(this.picker.cat.id, mid);
        const freshCats = MWS.myWatchlists(S.user.id);
        const fresh = freshCats.find(w => w.id === this.picker.cat.id);
        if (fresh) this.picker.cat = fresh;
        bump();
      }
    }
  };

  /* ═══════════════ AI 推荐 ═══════════════ */
  const RecommendPage = {
    components: { MovieCard },
    template: `
    <div class="page">
      <div class="page-header"><h1 class="page-title">AI 智能推荐</h1><p class="page-subtitle">基于你的评分与影评，发现下一部好电影</p></div>
      <div class="rec-header">
        <div class="ai-icon">🧠</div>
        <div>
          <h3>{{count>0?'个性化推荐':'热门推荐'}}</h3>
          <p>{{count>0?'AI 已分析你的观影偏好，为你精选以下影片':'写影评越多，推荐越精准'}}</p>
        </div>
      </div>
      <div class="movie-grid">
        <movie-card v-for="m in recommend" :key="m.id" :movie="m" :in-list="wlMap[m.id]"
          @add="(movie,status)=>addToWl(movie.id,status)" @remove="removeFromWl" @change-status="updateWlStatus"></movie-card>
      </div>
    </div>`,
    computed: {
      recommend() { return S.recommend; },
      wlMap() { return watchlistMap(); },
      count() { const _ = S.dataVer; return S.user ? MWS.myReviews(S.user.id).length : 0; }
    },
    methods: { addToWl, removeFromWl, updateWlStatus }
  };

  /* ═══════════════ 根应用 + 路由 ═══════════════ */
  const routes = [
    { path: '/login', component: LoginPage },
    { path: '/', component: HomePage, meta: { requiresAuth: false } },
    { path: '/movie/:id', component: DetailPage },
    { path: '/reviews', component: ReviewsPage, meta: { requiresAuth: true } },
    { path: '/watchlist', component: WatchlistPage, meta: { requiresAuth: true } },
    { path: '/recommendations', component: RecommendPage }
  ];
  const router = createRouter({ history: createWebHashHistory(), routes });

  router.beforeEach((to, from, next) => {
    const user = MWS.getCurrentUser();
    S.user = user;
    if (to.meta.requiresAuth && !user) { next('/login'); }
    else next();
  });

  const app = createApp({
    setup() {
      function logout() { MWS.logout(); S.user = null; router.push('/login'); }
      return { S, posterSrc, onPosterErr, logout };
    },
    mounted() {
      batchLoadPosters();
    },
    template: `
    <div>
      <nav class="top-nav">
        <div class="nav-brand" @click="$router.push('/')"><span>🎬</span>电影清单</div>
        <ul class="nav-links">
          <li><router-link to="/">发现</router-link></li>
          <li><router-link to="/recommendations">AI推荐</router-link></li>
          <li v-if="S.user"><router-link to="/watchlist">我的影单</router-link></li>
          <li v-if="S.user"><router-link to="/reviews">我的影评</router-link></li>
        </ul>
        <div class="nav-right">
          <template v-if="S.user">
            <span class="nav-user">👤 <b>{{S.user.username}}</b></span>
            <button class="btn btn-outline btn-sm" @click="logout">退出</button>
          </template>
          <router-link v-else to="/login" class="btn btn-primary btn-sm">登录</router-link>
        </div>
      </nav>

      <router-view :wl-map="watchlistMap()"></router-view>

      <div class="toast-container">
        <div v-for="t in S.toasts" :key="t.id" :class="['toast',t.type]"><span>{{t.type==='success'?'✓':'✕'}}</span> {{t.msg}}</div>
      </div>

      <footer class="app-footer">
        <p>🎬 电影清单 Movie Watchlist · C端客户端</p>
        <p>Powered by <span class="accent">Vue 3</span> + <span class="accent">Vue Router</span> · 演示数据存于本地浏览器</p>
      </footer>
    </div>`,
    methods: { watchlistMap }
  });

  app.use(router);
  app.mount('#app');
})();
