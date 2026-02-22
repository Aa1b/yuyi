-- 审核功能：管理员标识、驳回原因
USE life_record_db;

-- 用户表：是否管理员（0普通用户 1管理员）
ALTER TABLE users
  ADD COLUMN is_admin TINYINT NOT NULL DEFAULT 0 COMMENT '是否管理员：0否，1是' AFTER password;

-- 生活记录表：驳回原因（审核不通过时填写）
ALTER TABLE life_records
  ADD COLUMN rejected_reason VARCHAR(500) NULL DEFAULT NULL COMMENT '驳回原因（审核不通过时由管理员填写）' AFTER publish_status;

-- 将指定用户设为主管理员（请把 1 改为你的用户 id，或执行：SELECT id FROM users ORDER BY id LIMIT 1; 后替换）
-- UPDATE users SET is_admin = 1 WHERE id = 1 LIMIT 1;
