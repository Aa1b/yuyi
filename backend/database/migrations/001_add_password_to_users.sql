-- 为已有 users 表添加 password 与 idx_phone
-- 若列/索引已存在会报错，可忽略该条
ALTER TABLE users ADD COLUMN password VARCHAR(255) COMMENT '密码(bcrypt)' AFTER phone;
-- CREATE INDEX idx_phone ON users (phone);  -- 若已存在则跳过
