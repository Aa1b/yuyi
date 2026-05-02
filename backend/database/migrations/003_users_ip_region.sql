-- 用户最近访问时的 IP 归属城市（在 GET /auth/profile 时由服务端写入），他人主页可展示
-- 已上线库执行一次即可；若报 Duplicate column 说明已加过，可忽略

ALTER TABLE users
  ADD COLUMN ip_region varchar(64) DEFAULT NULL COMMENT '最近访问时 IP 解析城市（腾讯地图）' AFTER introduction;
