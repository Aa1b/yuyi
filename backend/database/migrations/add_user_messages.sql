-- 留言板表（用户间私信，非实时）
-- 仅需在已有库上执行一次（新库 schema.sql 已含该表）
CREATE TABLE IF NOT EXISTS `user_messages` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '留言ID',
  `from_user_id` int NOT NULL COMMENT '发送者ID',
  `to_user_id` int NOT NULL COMMENT '接收者ID',
  `content` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容',
  `is_read` tinyint NOT NULL DEFAULT '0' COMMENT '是否已读：0未读，1已读',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_from_user` (`from_user_id`),
  KEY `idx_to_user` (`to_user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_to_read` (`to_user_id`,`is_read`),
  CONSTRAINT `user_messages_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_messages_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言板消息表';
