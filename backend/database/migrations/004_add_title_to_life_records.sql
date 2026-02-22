-- 为生活记录表增加标题字段
ALTER TABLE life_records
  ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT '' COMMENT '记录标题' AFTER user_id;

-- 将已有记录的 content 首行或前100字作为标题（便于旧数据展示）
UPDATE life_records
SET title = TRIM(LEFT(IFNULL(content, ''), 100))
WHERE title = '' AND content IS NOT NULL AND content != '';
