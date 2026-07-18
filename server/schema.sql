-- ============================================================
-- 电影清单 · MySQL 数据库建表脚本
-- 使用方式: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS movie_watchlist
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE movie_watchlist;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id        INT           AUTO_INCREMENT PRIMARY KEY,
  username  VARCHAR(50)   NOT NULL UNIQUE,
  password  VARCHAR(255)  NOT NULL COMMENT 'bcrypt 加密',
  role      VARCHAR(20)   NOT NULL DEFAULT 'user' COMMENT 'admin|user',
  real_name VARCHAR(50)   DEFAULT NULL,
  id_mask   VARCHAR(20)   DEFAULT NULL COMMENT '身份证脱敏',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 电影表
CREATE TABLE IF NOT EXISTS movies (
  id        INT           AUTO_INCREMENT PRIMARY KEY,
  tmdb_id   VARCHAR(50)   DEFAULT ''    COMMENT 'IMDb/TMDb ID',
  title     VARCHAR(200)  NOT NULL,
  en_title  VARCHAR(300)  DEFAULT '',
  year      INT           DEFAULT NULL,
  genre     VARCHAR(50)   DEFAULT '剧情',
  poster    VARCHAR(500)  DEFAULT '',
  rating    DECIMAL(3,1)  DEFAULT 8.0,
  director  VARCHAR(200)  DEFAULT '',
  cast_list VARCHAR(500)  DEFAULT ''    COMMENT '主演（逗号分隔）',
  runtime   INT           DEFAULT 0     COMMENT '片长/分钟',
  overview  TEXT          DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 影评表
CREATE TABLE IF NOT EXISTS reviews (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  username    VARCHAR(50)   NOT NULL,
  movie_id    INT           NOT NULL,
  movie_title VARCHAR(200)  NOT NULL,
  rating      INT           NOT NULL COMMENT '1-5星',
  comment     TEXT          DEFAULT NULL,
  deleted     TINYINT(1)    NOT NULL DEFAULT 0,
  deleted_by  VARCHAR(20)   DEFAULT NULL COMMENT 'self|admin',
  deleted_at  DATETIME      DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  INDEX idx_movie (movie_id),
  INDEX idx_user  (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 影单状态表（想看/在看/已看）
CREATE TABLE IF NOT EXISTS watchlist (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  movie_id    INT           NOT NULL,
  status      VARCHAR(20)   NOT NULL COMMENT 'want_to_watch|watching|watched',
  user_rating DECIMAL(3,1)  DEFAULT 0,
  notes       TEXT          DEFAULT NULL,
  watched_at  DATETIME      DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_movie (user_id, movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 自定义分类表
CREATE TABLE IF NOT EXISTS categories (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  name        VARCHAR(100)  NOT NULL COMMENT '分类名',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分类-电影关联表
CREATE TABLE IF NOT EXISTS category_movies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  movie_id    INT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id)    REFERENCES movies(id)    ON DELETE CASCADE,
  UNIQUE KEY uk_cat_movie (category_id, movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 精选表（B端设置首页轮播）
CREATE TABLE IF NOT EXISTS featured (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  movie_ids  TEXT         NOT NULL COMMENT 'JSON数组，如 [3,15,22]',
  updated_by VARCHAR(50)  DEFAULT 'system',
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
