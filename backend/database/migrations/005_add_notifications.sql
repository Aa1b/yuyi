-- 通知表及触发器：点赞、评论、关注时自动创建通知
-- 若数据库在添加通知功能前已创建，需执行本迁移才能收到消息
--
-- 执行方式：mysql -u 用户名 -p 数据库名 < backend/database/migrations/005_add_notifications.sql

-- 1. 创建通知表（若不存在）
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
  user_id INT NOT NULL COMMENT '接收通知的用户ID',
  type ENUM('like', 'comment', 'follow') NOT NULL COMMENT '通知类型：like点赞，comment评论，follow关注',
  record_id INT NULL COMMENT '关联的记录ID（点赞和评论）',
  from_user_id INT NOT NULL COMMENT '触发通知的用户ID',
  content VARCHAR(500) NULL COMMENT '通知内容',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读：0未读，1已读',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_user_read (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_from_user FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_record FOREIGN KEY (record_id) REFERENCES life_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 2. 删除旧触发器（若存在）并创建点赞通知触发器
DROP TRIGGER IF EXISTS create_like_notification;
DELIMITER $$
CREATE TRIGGER create_like_notification
AFTER INSERT ON life_likes
FOR EACH ROW
BEGIN
  DECLARE record_owner_id INT;
  SELECT user_id INTO record_owner_id FROM life_records WHERE id = NEW.record_id;
  IF record_owner_id IS NOT NULL AND record_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, record_id, from_user_id, content)
    VALUES (record_owner_id, 'like', NEW.record_id, NEW.user_id, '点赞了你的记录');
  END IF;
END$$
DELIMITER ;

-- 3. 删除旧触发器并创建评论通知触发器
DROP TRIGGER IF EXISTS create_comment_notification;
DELIMITER $$
CREATE TRIGGER create_comment_notification
AFTER INSERT ON life_comments
FOR EACH ROW
BEGIN
  DECLARE record_owner_id INT;
  SELECT user_id INTO record_owner_id FROM life_records WHERE id = NEW.record_id;
  IF record_owner_id IS NOT NULL AND record_owner_id != NEW.user_id AND (NEW.parent_id = 0 OR NEW.parent_id IS NULL) THEN
    INSERT INTO notifications (user_id, type, record_id, from_user_id, content)
    VALUES (record_owner_id, 'comment', NEW.record_id, NEW.user_id, CONCAT('评论了你的记录：', LEFT(IFNULL(NEW.content, ''), 50)));
  END IF;
END$$
DELIMITER ;

-- 4. 删除旧触发器并创建关注通知触发器
DROP TRIGGER IF EXISTS create_follow_notification;
DELIMITER $$
CREATE TRIGGER create_follow_notification
AFTER INSERT ON user_follows
FOR EACH ROW
BEGIN
  INSERT INTO notifications (user_id, type, from_user_id, content)
  VALUES (NEW.following_id, 'follow', NEW.follower_id, '关注了你');
END$$
DELIMITER ;
