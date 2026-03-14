-- 为「回复」通知跳转详情页定位到评论：为 notifications 增加 comment_id
-- 仅需在已有库上执行一次（新库 schema.sql 已含该字段）
ALTER TABLE notifications ADD COLUMN comment_id INT DEFAULT NULL COMMENT '关联的评论ID（回复通知时用于详情页定位）';
