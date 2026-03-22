# 数据库脚本说明

## 版本对照

| 类型 | 版本 | 文件 | 说明 |
|------|------|------|------|
| 全量建库 | **2.0.0** | `schema.sql` | 新环境一次性创建库表；**勿**对已有生产库整文件覆盖执行 |
| 增量迁移 | **002 / 2.0.0** | `migrations/002_categories_tags_admin.sql` | 分类字典表、`life_tags` 排序与禁用 |

## 服务端更新（已有数据库）

1. **备份**：`mysqldump -u... life_record_db > backup.sql`
2. 按编号执行尚未跑过的迁移（本仓库当前为 **002**）：

```bash
mysql -u root -p life_record_db < backend/database/migrations/002_categories_tags_admin.sql
```

3. 若某条 `ALTER TABLE` 提示列已存在，说明该步已执行过，可注释对应行后重跑，或跳过。

4. 部署应用代码后重启 Node 服务。

## 新环境

直接导入全量脚本：

```bash
mysql -u root -p < backend/database/schema.sql
```

其中已包含 **SCHEMA_VERSION 2.0.0** 对应的全部结构（含 `life_categories` 与 `life_tags` 扩展列）。

## 历史迁移（参考）

早期零散脚本仍保留在 `migrations/` 下（如 `add_email_password.sql` 等）；若数据库自本版本 **2.0.0** 全新初始化，一般只需 `schema.sql`，无需再执行旧增量。
