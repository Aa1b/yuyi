-- 用户表增加邮箱字段，用于邮箱注册/登录
ALTER TABLE users
  ADD COLUMN email VARCHAR(255) NULL COMMENT '邮箱（邮箱注册时使用）' AFTER phone,
  ADD UNIQUE KEY uk_email (email),
  ADD INDEX idx_email (email);
