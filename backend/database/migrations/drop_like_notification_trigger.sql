-- 点赞通知已改由 Node（lifeController.like）写入。
-- 若数据库里仍存在以下触发器，执行本脚本可移除，避免同一赞产生两条通知。
DROP TRIGGER IF EXISTS create_like_notification;
