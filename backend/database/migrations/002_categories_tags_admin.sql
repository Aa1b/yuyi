-- =============================================================================
-- 增量迁移 MIGRATION 002（管理员：分类字典 + 标签排序/禁用）
-- =============================================================================
-- MIGRATION_ID:          002
-- MIGRATION_VERSION:     2.0.0
-- MIGRATION_DATE:        2026-03-04
-- 适用场景:              已在运行的数据库（已有 life_records / life_tags），执行前请备份
-- 前置:                  无强制依赖；若 life_tags 已含 sort_order/is_enabled 列，对应 ALTER 会报错，可注释后跳过
-- 执行示例:
--   mysql -u root -p life_record_db < backend/database/migrations/002_categories_tags_admin.sql
-- 执行后:                在库中可执行（可选）记录版本:
--   INSERT INTO _schema_migrations (id, applied_at) VALUES ('002', NOW());
--   （若未建 _schema_migrations 表可忽略，仅作人工备忘）
-- =============================================================================

USE life_record_db;

CREATE TABLE IF NOT EXISTS `life_categories` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序，数值越小越靠前',
  `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用：0否（仅发布不可选），1是',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生活记录分类字典表';

ALTER TABLE `life_tags`
  ADD COLUMN `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序，数值越小越靠前' AFTER `count`;
ALTER TABLE `life_tags`
  ADD COLUMN `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '0=仅发布页不可选' AFTER `sort_order`;

INSERT IGNORE INTO `life_categories` (`name`, `sort_order`, `is_enabled`) VALUES
('日常', 10, 1),
('旅行', 20, 1),
('美食', 30, 1),
('心情', 40, 1),
('运动', 50, 1),
('学习', 60, 1),
('工作', 70, 1),
('其他', 80, 1);

INSERT IGNORE INTO `life_categories` (`name`, `sort_order`, `is_enabled`)
SELECT DISTINCT TRIM(`category`) AS name, 100 AS sort_order, 1
FROM `life_records`
WHERE `category` IS NOT NULL AND TRIM(`category`) <> '' AND `status` = 1;
