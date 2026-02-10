-- 记录生活管理系统数据库设计
-- 数据库类型: MySQL 5.7+
-- 字符集: utf8mb4

-- 创建数据库
CREATE DATABASE IF NOT EXISTS life_record_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE life_record_db;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
  unionid VARCHAR(100) COMMENT '微信unionid',
  nickname VARCHAR(100) COMMENT '昵称',
  avatar VARCHAR(500) COMMENT '头像URL',
  gender TINYINT DEFAULT 0 COMMENT '性别：0未知，1男，2女',
  phone VARCHAR(20) COMMENT '手机号',
  password VARCHAR(255) COMMENT '密码(bcrypt)，手机号注册时使用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_openid (openid),
  INDEX idx_phone (phone),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 生活记录表
CREATE TABLE IF NOT EXISTS life_records (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  content TEXT COMMENT '内容描述',
  type ENUM('image', 'video') NOT NULL DEFAULT 'image' COMMENT '内容类型：image图片，video视频',
  privacy ENUM('public', 'private', 'friends') DEFAULT 'public' COMMENT '隐私设置：public公开，private私密，friends好友可见',
  category VARCHAR(50) COMMENT '分类',
  location VARCHAR(200) COMMENT '位置信息',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  comment_count INT DEFAULT 0 COMMENT '评论数',
  status TINYINT DEFAULT 1 COMMENT '状态：0删除，1正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_privacy (privacy),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_user_privacy (user_id, privacy),
  INDEX idx_category_privacy (category, privacy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生活记录表';

-- 3. 媒体文件表
CREATE TABLE IF NOT EXISTS life_media (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '媒体ID',
  record_id INT NOT NULL COMMENT '记录ID',
  media_type ENUM('image', 'video') NOT NULL COMMENT '媒体类型',
  url VARCHAR(500) NOT NULL COMMENT '文件URL',
  thumbnail_url VARCHAR(500) COMMENT '缩略图URL（视频封面）',
  duration INT COMMENT '视频时长（秒）',
  file_size INT COMMENT '文件大小（字节）',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE,
  INDEX idx_record_id (record_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='媒体文件表';

-- 4. 标签表
CREATE TABLE IF NOT EXISTS life_tags (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '标签ID',
  name VARCHAR(50) UNIQUE NOT NULL COMMENT '标签名称',
  count INT DEFAULT 0 COMMENT '使用次数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_name (name),
  INDEX idx_count (count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- 5. 记录标签关联表
CREATE TABLE IF NOT EXISTS life_record_tags (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '关联ID',
  record_id INT NOT NULL COMMENT '记录ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_record_tag (record_id, tag_id),
  FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES life_tags(id) ON DELETE CASCADE,
  INDEX idx_record_id (record_id),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='记录标签关联表';

-- 6. 点赞表
CREATE TABLE IF NOT EXISTS life_likes (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '点赞ID',
  record_id INT NOT NULL COMMENT '记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_record_user (record_id, user_id),
  FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_record_id (record_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞表';

-- 7. 评论表
CREATE TABLE IF NOT EXISTS life_comments (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
  record_id INT NOT NULL COMMENT '记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id INT DEFAULT 0 COMMENT '父评论ID（0表示顶级评论）',
  status TINYINT DEFAULT 1 COMMENT '状态：0删除，1正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_record_id (record_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- 8. 用户关注表
CREATE TABLE IF NOT EXISTS user_follows (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '关注ID',
  follower_id INT NOT NULL COMMENT '关注者ID',
  following_id INT NOT NULL COMMENT '被关注者ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_follow (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_follower_id (follower_id),
  INDEX idx_following_id (following_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注表';

-- 9. 触发器：更新点赞数
DELIMITER $$
CREATE TRIGGER update_like_count_insert
AFTER INSERT ON life_likes
FOR EACH ROW
BEGIN
  UPDATE life_records SET like_count = like_count + 1 WHERE id = NEW.record_id;
END$$

CREATE TRIGGER update_like_count_delete
AFTER DELETE ON life_likes
FOR EACH ROW
BEGIN
  UPDATE life_records SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.record_id;
END$$
DELIMITER ;

-- 10. 触发器：更新评论数
DELIMITER $$
CREATE TRIGGER update_comment_count_insert
AFTER INSERT ON life_comments
FOR EACH ROW
BEGIN
  IF NEW.status = 1 AND NEW.parent_id = 0 THEN
    UPDATE life_records SET comment_count = comment_count + 1 WHERE id = NEW.record_id;
  END IF;
END$$

CREATE TRIGGER update_comment_count_delete
AFTER UPDATE ON life_comments
FOR EACH ROW
BEGIN
  IF OLD.status = 1 AND NEW.status = 0 AND NEW.parent_id = 0 THEN
    UPDATE life_records SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.record_id;
  END IF;
END$$
DELIMITER ;

-- 11. 触发器：更新标签使用次数
DELIMITER $$
CREATE TRIGGER update_tag_count_insert
AFTER INSERT ON life_record_tags
FOR EACH ROW
BEGIN
  UPDATE life_tags SET count = count + 1 WHERE id = NEW.tag_id;
END$$

CREATE TRIGGER update_tag_count_delete
AFTER DELETE ON life_record_tags
FOR EACH ROW
BEGIN
  UPDATE life_tags SET count = GREATEST(count - 1, 0) WHERE id = OLD.tag_id;
END$$
DELIMITER ;

-- 10. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
  user_id INT NOT NULL COMMENT '接收通知的用户ID',
  type ENUM('like', 'comment', 'follow') NOT NULL COMMENT '通知类型：like点赞，comment评论，follow关注',
  record_id INT COMMENT '关联的记录ID（点赞和评论）',
  from_user_id INT NOT NULL COMMENT '触发通知的用户ID',
  content VARCHAR(500) COMMENT '通知内容',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读：0未读，1已读',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 11. 触发器：创建点赞通知
DELIMITER $$
CREATE TRIGGER create_like_notification
AFTER INSERT ON life_likes
FOR EACH ROW
BEGIN
  -- 获取记录作者ID
  DECLARE record_owner_id INT;
  SELECT user_id INTO record_owner_id FROM life_records WHERE id = NEW.record_id;
  
  -- 如果不是自己给自己点赞，创建通知
  IF record_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, record_id, from_user_id, content)
    VALUES (record_owner_id, 'like', NEW.record_id, NEW.user_id, '点赞了你的记录');
  END IF;
END$$
DELIMITER ;

-- 12. 触发器：创建评论通知
DELIMITER $$
CREATE TRIGGER create_comment_notification
AFTER INSERT ON life_comments
FOR EACH ROW
BEGIN
  -- 获取记录作者ID
  DECLARE record_owner_id INT;
  SELECT user_id INTO record_owner_id FROM life_records WHERE id = NEW.record_id;
  
  -- 如果不是自己给自己评论，创建通知
  IF record_owner_id != NEW.user_id AND NEW.parent_id = 0 THEN
    INSERT INTO notifications (user_id, type, record_id, from_user_id, content)
    VALUES (record_owner_id, 'comment', NEW.record_id, NEW.user_id, CONCAT('评论了你的记录：', LEFT(NEW.content, 50)));
  END IF;
END$$
DELIMITER ;

-- 13. 触发器：创建关注通知
DELIMITER $$
CREATE TRIGGER create_follow_notification
AFTER INSERT ON user_follows
FOR EACH ROW
BEGIN
  -- 创建关注通知
  INSERT INTO notifications (user_id, type, from_user_id, content)
  VALUES (NEW.following_id, 'follow', NEW.follower_id, '关注了你');
END$$
DELIMITER ;

-- 14. 初始化分类数据
INSERT INTO life_tags (name, count) VALUES
('日常', 0),
('旅行', 0),
('美食', 0),
('心情', 0),
('运动', 0),
('学习', 0),
('工作', 0),
('其他', 0)
ON DUPLICATE KEY UPDATE name = name;
