# 🎬 电影清单 Movie Watchlist · 项目 Handoff 文档

> **版本**: 1.0.0 | **日期**: 2026-07-18  
> **项目类型**: 全栈 Web 应用 (Vue3 + Node.js + MySQL)  
> **部署目标**: GitHub + 云服务器

---

## 一、项目概览

### 1.1 产品定位
**电影清单** 是一个 C 端用户 + B 管理后台的影视记录与分享平台：

| 角色 | 页面 | 核心功能 |
|------|------|---------|
| **C 端用户** (`index.html`) | 发现页 / 详情 / 影单 / 影评 / AI推荐 | 浏览电影、写影评、管理想看/在看/已看、自定义分类、查看他人评论 |
| **B 端管理员** (`admin.html`) | 电影管控 / 精选管理 / 影评管理 / 用户管理 | 增删改电影、设置首页轮播、删除不当影评、查看用户列表 |

### 1.2 技术栈

```
┌─────────────────────────────────────────────────┐
│                    前端 (C端/B端)                  │
│  Vue3 CDN + Vue Router4 + localStorage/MySQL API │
│  HTML/CSS/JS 单文件架构（无构建工具）              │
├─────────────────────────────────────────────────┤
│                    后端 (Node.js)                 │
│  Express 4.x + mysql2 + bcryptjs + cors           │
│  RESTful API (6 个路由模块)                       │
├─────────────────────────────────────────────────┤
│                    数据层 (MySQL)                 │
│  8 张表: users/movies/reviews/watchlist/...      │
│  种子数据: 201部电影 + 138条影评                   │
└─────────────────────────────────────────────────┘
```

### 1.3 运行模式

| 模式 | 说明 | 数据存储 |
|------|------|---------|
| **离线演示模式** (默认) | 双击 `index.html` 直接打开，无需服务器 | 浏览器 `localStorage` |
| **联机部署模式** (生产) | 通过 Node.js 后端 + MySQL，多人共享数据 | MySQL 数据库 |

---

## 二、项目目录结构

```
movie-watchlist-prototype/
├── index.html              # C端入口页面
├── admin.html             # B端管理后台入口
├── client.js               # C端 Vue 组件 (首页/详情/影单/影评/AI推荐)
├── admin.js                # B端 Vue 组件 (管控/精选/影评/用户)
├── store.js                # 共享数据层: localStorage 模式
├── movies-db.js            # 扩展电影数据库 (155部，id 47~201)
├── styles.css              # Netflix Dark Cinema 风格全局样式 (~350行)
│
├── server/                 # ★ 后端服务（部署时使用）
│   ├── server.js           # Express 主入口
│   ├── db.js               # MySQL 连接池
│   ├── schema.sql          # 数据库建表 DDL
│   ├── db-init.js          # 数据库初始化+播种脚本
│   ├── package.json        # NPM 依赖声明
│   ├── .env                # 环境变量配置模板
│   ├── api-store.js        # 前端 API 调用封装
│   ├── seed-movies.json    # 201部种子电影 JSON
│   ├── seed-reviews.json   # 138条种子影评 JSON
│   └── routes/
│       ├── auth.js         # 认证路由 (/api/auth/*)
│       ├── movies.js      # 电影路由 (/api/movies/*)
│       ├── reviews.js     # 影评路由 (/api/reviews/*)
│       ├── watchlist.js   # 影单路由 (/api/watchlist/*)
│       └── featured.js    # 精选路由 (/api/featured/*)
│
├── .gitignore
└── README.md
```

---

## 三、快速启动指南

### 3.1 离线演示模式（无需安装任何东西）

直接用浏览器打开文件：
```
双击 index.html → C端前端（自动含46部种子电影）
双击 admin.html → B端后台（账号: admin / admin）
```

> ⚠️ 离线模式数据存在浏览器本地，刷新不丢，换浏览器即清空。

### 3.2 联机部署模式（完整后端）

#### 前置条件
- **Node.js** >= 16.0
- **MySQL** >= 5.7 或 MariaDB >= 10.3
- **Git**（用于版本控制）

#### 步骤一：克隆代码
```bash
git clone <你的仓库地址>
cd movie-watchlist-prototype/server
```

#### 步骤二：配置环境变量
编辑 `server/.env`，填入你的 MySQL 信息：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=movie_watchlist
PORT=3000
JWT_SECRET=随机字符串_建议32位以上
```

#### 步骤三：安装依赖并初始化数据库
```bash
npm install
node db-init.js
```
> 这会：创建数据库 → 建8张表 → 导入201部电影 → 导入138条影评 → 创建管理员账号

#### 步骤四：启动服务
```bash
npm start
# 或开发时:
node server.js
```

看到以下输出即成功：
```
🎬 电影清单服务已启动 → http://localhost:3000
   C端: http://localhost:3000/
   B端: http://localhost:3000/admin
```

### 3.3 切换到 API 模式（可选）

当前 `store.js` 使用 localStorage。要切换为 API 模式：

1. 在 `index.html` 和 `admin.html` 中加载 API 层：
```html
<script src="./server/api-store.js"></script>
<script src="./store.js"></script>
```

2. 修改 `store.js` 中各函数，优先调用 `MWS_API.*` 接口，失败时 fallback 到 localStorage。

> ⚠️ 此步骤需进一步开发，目前 `api-store.js` 已提供完整接口定义，可按需集成。

---

## 四、数据库设计

### 4.1 ER 关系图

```
users (用户)          movies (电影)          categories (自定义分类)
┌──────┐             ┌──────┐               ┌──────────┐
│ id PK│←────────────│ id PK│               │ id PK    │
│username            │ title                │ user_id FK→users
│password            │ genre                │ name      │
│role                │ rating               └────┬─────┘
└──────┘             └──┬───┘                    │
        │              │                        │ category_movies
        │              │                        ├──────────┐
        │              ▼                        │ movie_id FK→movies
        │     reviews (影评)                    └──────────┘
        │     ┌──────────┐
        └────>│ user_id FK│
              │ movie_id FK│
              │ rating     │
              │ comment    │
              │ deleted    │
              └──────────┘

watchlist (影单状态)     featured (首页精选)
┌──────────┐              ┌──────────┐
│ user_id FK│              │ movie_ids│ (JSON数组)
│ movie_id FK│             │ updated_by│
│ status    │              └──────────┘
│ user_rating│
└──────────┘
```

### 4.2 表结构速查

| 表名 | 用途 | 关键字段 | 记录量(种子) |
|------|------|----------|------------|
| `users` | 用户账号 | id, username, password, role | 11 (1管理员+10虚拟) |
| `movies` | 电影片库 | id, title, genre, rating, director, cast | **201** |
| `reviews` | 影评 | user_id, movie_id, rating, comment, deleted | **138** |
| `watchlist` | 想看/在看/已看 | user_id, movie_id, status | 0 (用户产生) |
| `categories` | 自定义分类 | user_id, name | 0 (用户产生) |
| `category_movies` | 分类-电影关联 | category_id, movie_id | 0 (用户产生) |
| `featured` | 首页轮播精选 | movie_ids(JSON), updated_by | 0 (B端设置) |

### 4.3 SQL 常用查询示例

```sql
-- 查询某部电影的所有有效影评
SELECT * FROM reviews WHERE movie_id = 1 AND deleted = 0 ORDER BY created_at DESC;

-- 查询某用户的观影统计
SELECT status, COUNT(*) as cnt FROM watchlist WHERE user_id = 1 GROUP BY status;

-- 查询评分最高的10部电影
SELECT * FROM movies ORDER BY rating DESC LIMIT 10;

-- B端: 查看所有已删除的影评（风控审计）
SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id=u.id 
WHERE r.deleted = 1 ORDER BY r.deleted_at DESC;
```

---

## 五、API 接口文档

### 5.1 认证模块 `/api/auth`

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| POST | `/register` | `{ username, password }` | 注册新用户 |
| POST | `/login` | `{ username, password }` | 登录返回用户信息 |
| GET | `/session?userId=` | — | 获取用户会话信息 |
| GET | `/users` | — | 获取全部用户列表(B端) |

**响应示例**:
```json
// POST /api/auth/login 成功
{ "ok": true, "user": { "id": 1, "username": "admin", "role": "admin" } }
// 失败
{ "ok": false, "msg": "用户名或密码错误" }
```

### 5.2 电影模块 `/api/movies`

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/` | — | 获取全部电影列表 |
| POST | `/` | `{ title, year, genre, ... }` | 新增电影 |
| PUT | `/:id` | 同上 | 编辑电影信息 |
| DELETE | `/:id` | — | 删除电影 |

### 5.3 影评模块 `/api/reviews`

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/` | — | 全部影评(B端管理) |
| GET | `/movie/:movieId` | — | **某电影的公开影评**(C端社区) |
| GET | `/my/:userId` | — | **用户的全部影评(含已删除)** |
| POST | `/` | `{ userId, username, movieId, rating, comment }` | 写/编辑影评(upsert) |
| PUT | `/:id` | `{ rating, comment }` | 更新影评 |
| DELETE | `/:id?byAdmin=0|1` | — | 删除影评(软删除) |

### 5.4 影单模块 `/api/watchlist`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/:userId` | 用户影单状态列表 |
| POST | `/` | 添加电影到影单 |
| PUT | `/:userId/:movieId` | 更新状态(want_to_watch/watching/watched) |
| DELETE | `/:userId/:movieId` | 从影单移除 |
| GET | `/categories/:userId` | 自定义分类列表 |
| POST | `/categories` | 新建分类 |
| DELETE | `/categories/:id` | 删除分类 |
| POST | `/categories/:id/toggle` | 分类中添加/移除电影 |

### 5.5 精选模块 `/api/featured`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取当前精选(3部电影ID数组) |
| PUT | `/` | 设置精选 `{ movieIds:[], updatedBy:'admin' }` |

---

## 六、核心业务逻辑说明

### 6.1 用户系统

- **假实名机制**: 注册时根据 username 哈希生成"假姓名"(如 `张伟芳`) 和脱敏身份证号，纯前端演示用途
- **管理员**: 默认账号 `admin / admin`，role 字段区分权限
- **虚拟种子用户**: 10个模拟用户(`影迷小王`等)，用于展示影评社区效果

### 6.2 电影数据

- **种子数据**: 201部经典电影（store.js 46部 + movies-db.js 155部），覆盖剧情/犯罪/动作/科幻/爱情/动画/喜剧/悬疑/战争/奇幻/西部
- **海报四级回退**: 本地 → OMDb(IMDb CDN) → TMDb → SVG 占位图（永不空白）
- **搜索**: 支持片名/英文名/导演/演员/类型 跨字段模糊匹配

### 6.3 影评系统（本次重点功能）

```
┌──────────────┐     写影评      ┌──────────────┐
│   电影详情页  │ ─────────────→ │   reviews表   │
│  (写影评按钮) │                │  (upsert)    │
└──────────────┘                └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
            │  影评社区    │   │  我的影评    │   │  B端影评管理  │
            │ (所有人的)   │   │ (自己的)     │   │  (全部+删除)  │
            │ 正常显示    │   │ 含🚫已删除   │   │ 软删除标记    │
            └─────────────┘   └──────────────┘   └──────────────┘
```

**关键逻辑**:
- 同一用户对同一电影只能有**一条有效影评**（upsert 语义）
- 删除采用**软删除** (`deleted=1`)，保留数据用于审计
- 我的影评页**展示已删除状态**: 半透明灰显 + 🚫标签 + 删除时间
- 种子影评在首次加载数据库时自动生成（每部电影 1-3 条）

### 6.4 B端管理增强功能

| 功能 | 实现细节 |
|------|---------|
| **电影搜索** | 实时过滤（片名/导演/演员/类型） |
| **电影编辑** | 弹窗 Modal 编辑任意字段 |
| **预览模式** | 一键切换 C端 卡片视图 vs 管理表格视图 |
| **草稿机制** | 存草稿/恢复/清除（localStorage） |
| **自动保存** | 切换 tab 时检测 dirty 状态自动保存 |
| **未保存警告** | beforeunload 弹窗 + 自动存草稿 |

---

## 七、部署方案

### 7.1 GitHub 部署流程

```bash
# 1. 创建仓库并推送
cd movie-watchlist-prototype
git init
git add .
git commit -m "init: 电影清单全栈项目 v1.0"
git remote add origin <你的GitHub仓库地址>
git push -u origin main

# 2. 服务器上克隆
ssh your-server
git clone <你的仓库地址>
cd movie-watchlist-prototype/server

# 3. 配置并启动（同 3.2 节）
npm install
node db-init.js
npm start
```

### 7.2 生产环境推荐配置

#### 使用 PM2 进程守护（推荐）
```bash
npm install -g pm2
pm2 start server.js --name "movie-watchlist"
pm2 save
pm2 startup   # 开机自启
```

#### 使用 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.3 免费部署选项

| 平台 | 说明 | 适用场景 |
|------|------|---------|
| **Railway** | Push 到 GitHub 即自动部署 | 小规模免费够用 |
| **Render** | 类似 Railway，支持 MySQL addon | 团队协作 |
| **Vercel + PlanetScale** | Vercel 部署前端 + PlanetScale MySQL | 无服务器运维 |
| **云服务器自建** | 阿里云/腾讯云轻量服务器 | 完全控制 |

---

## 八、已知问题 & 待办事项

### 8.1 已知问题
| 问题 | 状态 | 备注 |
|------|------|------|
| 离线模式下多浏览器数据不通 | 设计如此 | 部署到服务器后解决 |
| OMDb 海报需要网络 | 正常 | 有 SVG 四级回退兜底 |
| 种子影评是模拟生成的 | 可接受 | 用户写真实影评后自然覆盖 |

### 8.2 待办事项（后续迭代方向）
- [ ] **API 模式集成**: 将 `api-store.js` 完整接入 `store.js`，实现一键切换
- [ ] **JWT Token 认证**: 替代当前的明文 userId 传递
- [ ] **文件上传**: 支持上传自定义海报
- [ ] **分页优化**: 电影量大时的服务端分页
- [ ] **AI 推荐升级**: 接入真实 AI 接口做个性化推荐
- [ ] **国际化 i18n**: 英文版支持
- [ ] **PWA 离线支持**: Service Worker 缓存关键资源

---

## 九、联系 & 支持

| 项目 | 内容 |
|------|------|
| **技术栈** | Vue3 / Express / MySQL / Vanilla JS |
| **默认端口** | 3000 |
| **默认账号** | admin / admin |
| **数据库** | MySQL 8.0 (movie_watchlist) |
| **种子数据** | 201部电影 / 138条影评 / 11个用户 |

---

> 📄 本文档由 AI Coding 助手生成，最后更新于 2026-07-18。
> 如有问题，请检查 `server/.env` 配置和 MySQL 连接状态。
