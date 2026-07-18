/* ════════════════════════════════════════════════════════════════════
 * 电影清单 · B端管理后台 (admin.js)
 * 功能：电影增删管控 / 影评删除(含"上门查水表"玩笑) / 用户列表(假实名)
 * 依赖：Vue3 (CDN) + store.js (window.MWS)
 * ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const MWS = window.MWS;
  const { createApp, ref, reactive, computed } = Vue;

  const posterIdx = reactive({});
  function posterSrc(m) {
    if (!m) return '';
    const cs = MWS.posterCandidates(m);
    const i = posterIdx[m.id] || 0;
    return cs[Math.min(i, cs.length - 1)];
  }
  function onPosterErr(m) {
    if (!m) return;
    const cs = MWS.posterCandidates(m);
    const i = posterIdx[m.id] || 0;
    if (i < cs.length - 1) posterIdx[m.id] = i + 1;
  }

  const app = createApp({
    setup() {
      const loggedIn = ref(false);
      const user = ref(null);
      const tab = ref('movies');
      const toasts = ref([]);
      const movies = ref(MWS.getMovies());
      const users = ref(MWS.getUsers());
      const reviews = ref(MWS.getReviews());
      const keyword = ref('');
      const movieKeyword = ref('');          // ★ 电影搜索
      const previewMode = ref(false);        // ★ 预览模式（C端卡片视图）
      const dirty = ref(false);             // ★ 是否有未保存的编辑
      const lastSaved = ref('');            // ★ 最后保存时间
      const scrollPos = ref(0);             // ★ 滚动位置（切换保持）
      const showAddForm = ref(false);       // ★ 新增表单折叠

      // 登录表单
      const loginForm = reactive({ username: '', password: '', err: '' });

      // 新增电影表单
      const movieForm = reactive({ title: '', enTitle: '', year: '', genre: '剧情', director: '', cast: '', runtime: '', rating: '', overview: '', err: '' });

      // ★ 编辑电影弹窗
      const editModal = reactive({ show: false, movie: null, title: '', enTitle: '', year: '', genre: '剧情', director: '', cast: '', runtime: '', rating: '', overview: '', err: '' });

      // 影评删除确认弹窗
      const delModal = reactive({ show: false, review: null });

      // 精选管理
      const featuredData = MWS.getFeatured();
      const featuredIds = reactive({ ids: [...featuredData.movieIds], updatedAt: featuredData.updatedAt, updatedBy: featuredData.updatedBy, auto: featuredData.auto });

      function toast(msg, type = 'success') {
        const id = Date.now() + Math.random();
        toasts.value.push({ id, msg, type });
        setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 2600);
      }
      function refresh() { movies.value = MWS.getMovies(); users.value = MWS.getUsers(); reviews.value = MWS.getReviews(); }
      function logout() { MWS.logout(); loggedIn.value = false; user.value = null; }

      function doLogin() {
        const r = MWS.login(loginForm.username, loginForm.password);
        if (!r.ok) { loginForm.err = r.msg; return; }
        if (r.user.role !== 'admin') { loginForm.err = '该账号不是管理员，请前往 C端客户端登录'; MWS.logout(); return; }
        user.value = r.user; loggedIn.value = true; loginForm.err = '';
      }

      function addMovie() {
        const f = movieForm;
        if (!f.title.trim()) { f.err = '请填写电影名称'; return; }
        MWS.addMovie({
          title: f.title.trim(), enTitle: f.enTitle.trim(),
          year: parseInt(f.year) || new Date().getFullYear(),
          genre: f.genre, director: f.director.trim(),
          cast: f.cast.trim(), runtime: parseInt(f.runtime) || 0,
          rating: parseFloat(f.rating) || 8.0, overview: f.overview.trim()
        });
        refresh();
        Object.assign(f, { title: '', enTitle: '', year: '', genre: '剧情', director: '', cast: '', runtime: '', rating: '', overview: '', err: '' });
        toast('电影已添加 ✓');
      }
      function delMovie(m) {
        if (!confirm('确认从片库删除《' + m.title + '》？C端将同步减少。')) return;
        MWS.deleteMovie(m.id); refresh(); toast('已删除《' + m.title + '》');
      }

      // ★ 打开编辑弹窗
      function openEdit(m) {
        dirty.value = true;
        Object.assign(editModal, {
          show: true, movie: m,
          title: m.title, enTitle: m.enTitle || '',
          year: m.year || '', genre: m.genre || '剧情',
          director: m.director || '', cast: m.cast || '',
          runtime: m.runtime || '', rating: m.rating || '',
          overview: m.overview || '', err: ''
        });
      }
      // ★ 保存编辑
      function saveEdit() {
        const f = editModal;
        if (!f.title.trim()) { f.err = '请填写电影名称'; return; }
        const idx = movies.value.findIndex(m => m.id === f.movie.id);
        if (idx >= 0) {
          movies.value[idx].title = f.title.trim();
          movies.value[idx].enTitle = f.enTitle.trim();
          movies.value[idx].year = parseInt(f.year) || f.movie.year;
          movies.value[idx].genre = f.genre;
          movies.value[idx].director = f.director.trim();
          movies.value[idx].cast = f.cast.trim();
          movies.value[idx].runtime = parseInt(f.runtime) || 0;
          movies.value[idx].rating = parseFloat(f.rating) || 8.0;
          movies.value[idx].overview = f.overview.trim();
          MWS.saveMovies(movies.value);
        }
        editModal.show = false;
        dirty.value = false;
        lastSaved.value = new Date().toLocaleTimeString('zh-CN');
        toast('电影信息已更新 ✓');
      }

      // ★ 预览模式切换
      function togglePreview() {
        previewMode.value = !previewMode.value;
        if (previewMode.value) toast('已切换到 C端预览视图 📱', 'success');
        else toast('已切换回管理表格视图 📋', 'success');
      }

      // ★ 页面切换时自动保存
      function switchTab(t) {
        if (tab.value !== t && dirty.value) {
          // 保存当前状态
          MWS.saveMovies(movies.value);
          lastSaved.value = new Date().toLocaleTimeString('zh-CN');
          dirty.value = false;
        }
        tab.value = t;
        scrollPos.value = 0;
      }

      // ★ 手动保存
      function manualSave() {
        MWS.saveMovies(movies.value);
        dirty.value = false;
        lastSaved.value = new Date().toLocaleTimeString('zh-CN');
        toast('已保存全部修改 ✓');
      }

      // ★ 搜索过滤电影
      const filteredMovies = computed(() => {
        const kw = movieKeyword.value.trim().toLowerCase();
        if (!kw) return movies.value;
        return movies.value.filter(m =>
          (m.title && m.title.toLowerCase().includes(kw)) ||
          (m.enTitle && m.enTitle.toLowerCase().includes(kw)) ||
          (m.director && m.director.toLowerCase().includes(kw)) ||
          (m.cast && m.cast.toLowerCase().includes(kw)) ||
          (m.genre && m.genre.toLowerCase().includes(kw))
        );
      });

      // ★ 存草稿到 localStorage
      function saveDraft() {
        try { localStorage.setItem('mw_admin_draft', JSON.stringify({ movies: movies.value, ts: Date.now() })); }
        catch(e) {}
        lastSaved.value = new Date().toLocaleTimeString('zh-CN');
        toast('草稿已保存 ✓');
      }
      function loadDraft() {
        try {
          const d = JSON.parse(localStorage.getItem('mw_admin_draft'));
          if (d && d.movies && d.movies.length) {
            movies.value = d.movies;
            dirty.value = true;
            toast('已恢复上次草稿 📝');
          } else { toast('没有可恢复的草稿', 'error'); }
        } catch(e) { toast('草稿加载失败', 'error'); }
      }
      function clearDraft() {
        localStorage.removeItem('mw_admin_draft');
        movies.value = MWS.getMovies();
        dirty.value = false;
        toast('草稿已清除，数据已重置');
      }

      // 精选管理
      function toggleFeatured(movieId) {
        const i = featuredIds.ids.indexOf(movieId);
        if (i >= 0) { featuredIds.ids.splice(i, 1); }
        else { if (featuredIds.ids.length >= 3) { toast('最多选择 3 部精选影片', 'error'); return; } featuredIds.ids.push(movieId); }
      }
      function saveFeatured() {
        if (featuredIds.ids.length === 0) { toast('请至少选择 1 部影片', 'error'); return; }
        MWS.saveFeatured([...featuredIds.ids], user.value.username);
        const f = MWS.getFeatured();
        featuredIds.ids = [...f.movieIds];
        featuredIds.updatedAt = f.updatedAt;
        featuredIds.updatedBy = f.updatedBy;
        featuredIds.auto = f.auto;
        toast('精选影片已保存 ✓（C端即刻生效）');
      }
      function resetFeatured() {
        localStorage.removeItem(MWS.keys.featured);
        const f = MWS.getFeatured();
        featuredIds.ids = [...f.movieIds];
        featuredIds.updatedAt = f.updatedAt;
        featuredIds.updatedBy = f.updatedBy;
        featuredIds.auto = f.auto;
        toast('已重置为系统默认精选（评分最高3部）');
      }
      function featuredMovie(id) { return movies.value.find(m => m.id === id); }

      function openDelReview(r) { delModal.review = r; delModal.show = true; }
      function confirmDelReview() {
        if (!delModal.review || !delModal.review.id) return;
        MWS.deleteReview(delModal.review.id, true);
        delModal.show = false; refresh(); toast('影评已删除，已记录风控');
      }

      const allReviews = computed(() => reviews.value.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      const visibleReviews = computed(() => {
        const kw = keyword.value.trim().toLowerCase();
        if (!kw) return allReviews.value;
        return allReviews.value.filter(r =>
          (r.username && r.username.toLowerCase().includes(kw)) ||
          (r.movieTitle && r.movieTitle.toLowerCase().includes(kw)) ||
          (r.comment && r.comment.toLowerCase().includes(kw))
        );
      });
      const stats = computed(() => ({
        movies: movies.value.length,
        users: users.value.filter(u => u.role !== 'admin').length,
        reviews: allReviews.value.filter(r => !r.deleted).length,
        deleted: allReviews.value.filter(r => r.deleted).length
      }));
      function fmt(t) { try { return new Date(t).toLocaleString('zh-CN'); } catch (e) { return ''; } }

      // ★ 页面关闭/刷新前警告未保存修改
      window.addEventListener('beforeunload', function(e) {
        if (dirty.value) {
          saveDraft();
          e.preventDefault();
          e.returnValue = '您有未保存的修改，确定要离开吗？';
          return e.returnValue;
        }
      });

      return {
        loggedIn, user, tab, toasts, movies, users, reviews, keyword, movieKeyword,
        loginForm, movieForm, delModal, editModal, featuredIds,
        previewMode, dirty, lastSaved, scrollPos, showAddForm,
        posterSrc, onPosterErr, toast, logout, doLogin, addMovie, delMovie,
        openEdit, saveEdit, togglePreview, switchTab, manualSave,
        saveDraft, loadDraft, clearDraft, filteredMovies,
        openDelReview, confirmDelReview, fmt, stats, visibleReviews,
        toggleFeatured, saveFeatured, resetFeatured, featuredMovie
      };
    },
    template: `
    <div>
      <!-- 管理员登录 -->
      <div v-if="!loggedIn" class="auth-wrap">
        <div class="auth-card">
          <div class="brand"><span>🛡️</span> 管理后台</div>
          <div class="sub">电影清单 · B端运营控制台</div>
          <div class="form-row"><label>管理员账号</label><input v-model="loginForm.username" @keyup.enter="doLogin" placeholder="admin"></div>
          <div class="form-row"><label>密码</label><input v-model="loginForm.password" type="password" @keyup.enter="doLogin" placeholder="admin"></div>
          <div class="form-error">{{loginForm.err}}</div>
          <button class="btn btn-primary btn-lg" style="width:100%" @click="doLogin">进入后台</button>
          <div class="demo-tip">演示账号：<b>admin / admin</b>。普通用户账号无法进入本后台。</div>
        </div>
      </div>

      <!-- 后台主体 -->
      <template v-else>
        <nav class="top-nav">
          <div class="nav-brand" @click="switchTab('movies')"><span>🛡️</span>管理后台</div>
          <ul class="nav-links">
            <li><a :class="{active:tab==='movies'}" @click="switchTab('movies')">🎬 电影管控</a></li>
            <li><a :class="{active:tab==='featured'}" @click="switchTab('featured')">⭐ 精选管理</a></li>
            <li><a :class="{active:tab==='reviews'}" @click="switchTab('reviews')">💬 影评管理</a></li>
            <li><a :class="{active:tab==='users'}" @click="switchTab('users')">👥 用户管理</a></li>
          </ul>
          <div class="nav-right">
            <span class="nav-user">🛡️ <b>{{user.username}}</b></span>
            <a href="./index.html" class="btn btn-ghost btn-sm">前往C端</a>
            <button class="btn btn-outline btn-sm" @click="logout">退出</button>
          </div>
        </nav>

        <div class="page">
          <!-- 统计卡 -->
          <div class="admin-stat-row">
            <div class="stat-card"><div class="s-num">{{stats.movies}}</div><div class="s-label">电影总数</div></div>
            <div class="stat-card"><div class="s-num">{{stats.users}}</div><div class="s-label">注册用户</div></div>
            <div class="stat-card"><div class="s-num">{{stats.reviews}}</div><div class="s-label">有效影评</div></div>
            <div class="stat-card"><div class="s-num">{{stats.deleted}}</div><div class="s-label">已处置影评</div></div>
          </div>

          <!-- 电影管控 -->
          <div v-show="tab==='movies'">
            <div class="page-header"><h1 class="page-title">电影管控</h1><p class="page-subtitle">新增 / 编辑 / 删除影片，管控片库总量 · 共 {{movies.length}} 部</p></div>

            <!-- ★ 草稿/保存工具栏 -->
            <div class="admin-toolbar admin-draft-toolbar">
              <div class="draft-status">
                <span v-if="dirty" class="draft-indicator">● 有未保存的修改</span>
                <span v-else class="draft-saved">✓ 已同步</span>
                <span v-if="lastSaved" class="draft-time">最后保存：{{lastSaved}}</span>
              </div>
              <div class="draft-actions">
                <button class="btn btn-outline btn-sm" @click="saveDraft">💾 存草稿</button>
                <button class="btn btn-outline btn-sm" @click="loadDraft">📥 恢复草稿</button>
                <button class="btn btn-outline btn-sm" @click="clearDraft">🗑 清除草稿</button>
                <button class="btn btn-primary btn-sm" @click="manualSave" :disabled="!dirty">📤 保存并发布</button>
                <button :class="['btn btn-sm', previewMode?'btn-primary':'btn-outline']" @click="togglePreview">
                  {{previewMode?'📋 表格视图':'📱 C端预览'}}
                </button>
              </div>
            </div>

            <!-- ★ 搜索+ 新增折叠 -->
            <div class="admin-toolbar">
              <div class="admin-search" style="flex:1;margin-bottom:0">
                <input v-model="movieKeyword" placeholder="🔍 搜索电影名称 / 导演 / 演员 / 类型..." style="width:100%">
              </div>
              <button class="btn btn-primary btn-sm" @click="showAddForm=!showAddForm">{{showAddForm?'收起':'➕ 新增电影'}}</button>
            </div>

            <!-- 新增电影表单（可折叠） -->
            <div class="modal-content" v-if="showAddForm" style="margin-bottom:28px;animation:fadeIn .3s">
              <h3>➕ 新增电影</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                <div class="form-row" style="margin:0"><label>片名 *</label><input v-model="movieForm.title" placeholder="如：肖申克的救赎"></div>
                <div class="form-row" style="margin:0"><label>英文名</label><input v-model="movieForm.enTitle" placeholder="The Shawshank..."></div>
                <div class="form-row" style="margin:0"><label>年份</label><input v-model="movieForm.year" placeholder="2027"></div>
                <div class="form-row" style="margin:0"><label>类型</label>
                  <select v-model="movieForm.genre"><option>剧情</option><option>犯罪</option><option>动作</option><option>科幻</option><option>爱情</option><option>动画</option><option>喜剧</option><option>悬疑</option><option>战争</option><option>奇幻</option><option>西部</option></select>
                </div>
                <div class="form-row" style="margin:0"><label>导演</label><input v-model="movieForm.director" placeholder="导演名"></div>
                <div class="form-row" style="margin:0"><label>主演</label><input v-model="movieForm.cast" placeholder="主演1, 主演2,..."></div>
                <div class="form-row" style="margin:0"><label>片长(分钟)</label><input v-model="movieForm.runtime" placeholder="120"></div>
                <div class="form-row" style="margin:0"><label>评分(0-10)</label><input v-model="movieForm.rating" placeholder="9.0"></div>
              </div>
              <div class="form-row" style="margin-top:14px"><label>简介</label><textarea v-model="movieForm.overview" placeholder="一句话剧情简介"></textarea></div>
              <div class="form-error">{{movieForm.err}}</div>
              <div class="modal-actions"><button class="btn btn-primary" @click="addMovie">确认新增</button></div>
            </div>

            <!-- ★ 预览模式：C端卡片网格 -->
            <div v-if="previewMode">
              <div class="section-label">📱 C端预览效果 <span class="count">当前共 {{filteredMovies.length}} 部影片</span></div>
              <div v-if="filteredMovies.length===0" class="empty-state">
                <div class="icon">🔍</div><h3>无匹配电影</h3><p>尝试其他搜索关键词</p>
              </div>
              <div v-else class="movie-grid">
                <div v-for="m in filteredMovies" :key="m.id" class="movie-card">
                  <div class="poster">
                    <img :src="posterSrc(m)" :alt="m.title" loading="lazy" referrerpolicy="no-referrer" @error="onPosterErr(m)">
                    <span v-if="m.genre" class="genre-tag">{{m.genre}}</span>
                    <span class="rating-badge">★{{m.rating}}</span>
                  </div>
                  <div class="info">
                    <div class="title">{{m.title}}</div>
                    <div class="meta">{{m.year}} · {{m.director}}</div>
                    <div class="actions" @click.stop>
                      <button class="btn btn-outline btn-sm" @click="openEdit(m)">✏️ 编辑</button>
                      <button class="btn btn-danger btn-sm" @click="delMovie(m)">🗑 删除</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="preview-footer">📱 以上为C端用户看到的卡片效果（无编辑按钮），当前为管理员预览视图</div>
            </div>

            <!-- ★ 管理表格模式 -->
            <table v-else class="admin-table">
              <thead><tr><th>海报</th><th>片名</th><th>类型</th><th>年份</th><th>评分</th><th>导演</th><th>主演</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="m in filteredMovies" :key="m.id">
                  <td><img class="thumb" :src="posterSrc(m)" :alt="m.title" referrerpolicy="no-referrer" @error="onPosterErr(m)"></td>
                  <td>{{m.title}}<div class="u-id">{{m.enTitle}}</div></td>
                  <td><span class="tag-pill">{{m.genre}}</span></td>
                  <td>{{m.year}}</td>
                  <td><b style="color:var(--gold)">★ {{m.rating}}</b></td>
                  <td>{{m.director}}</td>
                  <td style="max-width:180px;font-size:11px;color:var(--text-dim)">{{m.cast||'—'}}</td>
                  <td class="admin-actions-col">
                    <button class="btn btn-outline btn-sm" @click="openEdit(m)">✏️ 编辑</button>
                    <button class="btn btn-danger btn-sm" @click="delMovie(m)">🗑 删除</button>
                  </td>
                </tr>
                <tr v-if="filteredMovies.length===0"><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px">未找到匹配电影</td></tr>
              </tbody>
            </table>
          </div>

          <!-- ★ 精选管理 -->
          <div v-show="tab==='featured'">
            <div class="page-header">
              <h1 class="page-title">⭐ 精选管理</h1>
              <p class="page-subtitle">每日选出 3 部高分电影，在 C端首页 Hero区轮换展示。未手动更新则自动沿用前日精选</p>
            </div>

            <!-- 当前精选预览 -->
            <div class="featured-preview">
              <div class="fp-header">
                <div>
                  <span class="fp-badge" v-if="featuredIds.auto">🤖 系统默认</span>
                  <span class="fp-badge fp-manual" v-else>✋ 手动设置</span>
                  <span class="fp-time">更新于 {{fmt(featuredIds.updatedAt)}} · 操作人：{{featuredIds.updatedBy||'system'}}</span>
                </div>
              </div>
              <div class="fp-cards">
                <div class="fp-card" v-for="mid in featuredIds.ids" :key="mid">
                  <img :src="posterSrc(featuredMovie(mid))" :alt="(featuredMovie(mid)||{}).title" referrerpolicy="no-referrer" @error="onPosterErr(featuredMovie(mid))" @click="switchTab('movies')">
                  <div class="fp-info">
                    <div class="fp-title">#{{featuredIds.ids.indexOf(mid)+1}} {{(featuredMovie(mid)||{}).title||'未知影片'}}</div>
                    <div class="fp-meta">{{(featuredMovie(mid)||{}).year||''}} · ★{{(featuredMovie(mid)||{}).rating||''}} · {{(featuredMovie(mid)||{}).genre||''}}</div>
                  </div>
                </div>
                <div v-if="featuredIds.ids.length===0" class="fp-empty">暂未选择精选影片，请从下方片库中挑选</div>
              </div>
              <div class="fp-actions">
                <button class="btn btn-primary" @click="saveFeatured" :disabled="featuredIds.ids.length===0">💾 保存精选</button>
                <button class="btn btn-outline" @click="resetFeatured">🔄 重置为默认</button>
              </div>
            </div>

            <!-- 片库选片 -->
            <div class="section-label" style="margin-top:32px">📋 从片库中挑选（点击勾选/取消，最多3部）<span class="count">已选 {{featuredIds.ids.length}}/3</span></div>
            <div class="picker-grid featured-picker">
              <div v-for="m in movies" :key="m.id"
                   :class="['picker-item', {selected:featuredIds.ids.includes(m.id)}]"
                   @click="toggleFeatured(m.id)">
                <img :src="posterSrc(m)" :data-movie-id="m.id" :alt="m.title" referrerpolicy="no-referrer" @error="onPosterErr(m)">
                <div class="p-name">★{{m.rating}} {{m.title}}</div>
              </div>
            </div>
          </div>

          <!-- 影评管理 -->
          <div v-show="tab==='reviews'">
            <div class="page-header"><h1 class="page-title">影评管理</h1><p class="page-subtitle">处置不当言论与恶意差评</p></div>
            <div class="admin-search">
              <input v-model="keyword" placeholder="搜索 用户名 / 片名 / 内容...">
            </div>
            <table class="admin-table">
              <thead><tr><th>用户</th><th>影片</th><th>评分</th><th>评论</th><th>时间</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="r in visibleReviews" :key="r.id">
                  <td><b>{{r.username}}</b></td>
                  <td>{{r.movieTitle}}</td>
                  <td><span style="color:var(--gold)">★ {{r.rating}}</span></td>
                  <td style="max-width:360px">{{r.comment||'（无文字）'}}</td>
                  <td style="color:var(--text-muted);font-size:11px">{{fmt(r.createdAt)}}</td>
                  <td><span :class="['status-badge', r.deleted?'status-want':'status-watched']">{{r.deleted?'已删除':'正常'}}</span></td>
                  <td>
                    <button v-if="!r.deleted" class="btn btn-danger btn-sm" @click="openDelReview(r)">删除</button>
                    <span v-else style="color:var(--text-muted);font-size:12px">—</span>
                  </td>
                </tr>
                <tr v-if="visibleReviews.length===0"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px">暂无影评</td></tr>
              </tbody>
            </table>
          </div>

          <!-- 用户管理 -->
          <div v-show="tab==='users'">
            <div class="page-header"><h1 class="page-title">用户管理</h1><p class="page-subtitle">查看注册用户与实名信息（演示用假实名）</p></div>
            <table class="admin-table">
              <thead><tr><th>用户名</th><th>实名(演示)</th><th>证件号(脱敏)</th><th>注册时间</th></tr></thead>
              <tbody>
                <tr v-for="u in users" :key="u.id">
                  <td><b>{{u.username}}</b> <span v-if="u.role==='admin'" class="tag-pill" style="background:rgba(229,9,20,.15);color:var(--accent)">管理员</span></td>
                  <td class="u-real">{{u.realName}}</td>
                  <td class="u-id">{{u.idMask||'****'}}</td>
                  <td style="color:var(--text-muted);font-size:11px">{{fmt(u.createdAt)}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 影评删除确认（含玩笑文案） -->
        <div class="modal-overlay" v-if="delModal.show" @click.self="delModal.show=false">
          <div class="modal-content" style="max-width:460px">
            <button class="modal-close" @click="delModal.show=false">×</button>
            <h3>⚠️ 确认删除该影评？</h3>
            <div class="joke-box">
              用户 <b>{{delModal.review.username}}</b> 在《{{delModal.review.movieTitle}}》下的评价将被下架。<br><br>
              🚪 友情提示：若用户持续发布不实言论、恶意差评或扰乱社区，本平台有权依法采取进一步措施，
              包括但不限于对其账号实施风控，必要时提供 <b>「上门查水表」</b> 服务（手动狗头 🐶，本提示纯属玩笑，仅用于演示社区治理话术）。
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" @click="delModal.show=false">取消</button>
              <button class="btn btn-danger" @click="confirmDelReview">确认删除并风控</button>
            </div>
          </div>
        </div>

        <!-- 编辑电影弹窗 -->
        <div class="modal-overlay" v-if="editModal.show" @click.self="editModal.show=false">
          <div class="modal-content" style="max-width:640px;width:90vw">
            <button class="modal-close" @click="editModal.show=false">×</button>
            <h3>✏️ 编辑电影 — {{editModal.movie&&editModal.movie.title}}</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              <div class="form-row" style="margin:0"><label>片名 *</label><input v-model="editModal.title"></div>
              <div class="form-row" style="margin:0"><label>英文名</label><input v-model="editModal.enTitle"></div>
              <div class="form-row" style="margin:0"><label>年份</label><input v-model="editModal.year"></div>
              <div class="form-row" style="margin:0"><label>类型</label>
                <select v-model="editModal.genre"><option>剧情</option><option>犯罪</option><option>动作</option><option>科幻</option><option>爱情</option><option>动画</option><option>喜剧</option><option>悬疑</option><option>战争</option><option>奇幻</option><option>西部</option></select>
              </div>
              <div class="form-row" style="margin:0"><label>导演</label><input v-model="editModal.director"></div>
              <div class="form-row" style="margin:0"><label>主演</label><input v-model="editModal.cast"></div>
              <div class="form-row" style="margin:0"><label>片长(分钟)</label><input v-model="editModal.runtime"></div>
              <div class="form-row" style="margin:0"><label>评分(0-10)</label><input v-model="editModal.rating"></div>
            </div>
            <div class="form-row" style="margin-top:14px"><label>简介</label><textarea v-model="editModal.overview" placeholder="剧情简介"></textarea></div>
            <div class="form-error">{{editModal.err}}</div>
            <div class="form-hint">⚠️ 编辑后需点击"保存并发布"才会同步到C端</div>
            <div class="modal-actions">
              <button class="btn btn-outline" @click="editModal.show=false">取消</button>
              <button class="btn btn-primary" @click="saveEdit">💾 保存编辑</button>
            </div>
          </div>
        </div>

        <footer class="app-footer">
          <p>🛡️ 电影清单 · B端管理后台（演示）</p>
          <p>数据存于本地浏览器，与 C端客户端共享</p>
          <p v-if="lastSaved">📝 最近保存：{{lastSaved}} <span v-if="dirty" style="color:var(--gold)">· 有未发布的修改</span></p>
        </footer>
      </template>

      <div class="toast-container">
        <div v-for="t in toasts" :key="t.id" :class="['toast',t.type]"><span>{{t.type==='success'?'✓':'✕'}}</span> {{t.msg}}</div>
      </div>
    </div>`
  });

  app.mount('#app');
})();
