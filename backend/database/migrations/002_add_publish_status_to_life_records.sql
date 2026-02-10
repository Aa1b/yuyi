-- 生活记录发布状态：draft 草稿，pending 审核中，published 已发布
USE life_record_db;

ALTER TABLE life_records
  ADD COLUMN publish_status VARCHAR(20) NOT NULL DEFAULT 'published'
  COMMENT '发布状态：draft草稿，pending审核中，published已发布'
  AFTER status;

UPDATE life_records SET publish_status = 'published' WHERE publish_status = '' OR publish_status IS NULL;

CREATE INDEX idx_publish_status ON life_records (publish_status);
