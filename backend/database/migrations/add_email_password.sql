-- 为已有 users 表增加邮箱与密码字段
-- 若表已包含这些字段会报错，可忽略或先检查表结构

ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE COMMENT '邮箱（邮箱注册时使用）';
ALTER TABLE users ADD COLUMN password VARCHAR(255) COMMENT '密码（邮箱注册时使用，bcrypt 加密）';
