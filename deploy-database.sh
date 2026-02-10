#!/bin/bash
# 数据库部署脚本（从项目根目录执行，使用 backend/database/schema.sql）
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/backend/database/schema.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "错误: 未找到 $SQL_FILE"
    exit 1
fi

echo "使用 SQL 文件: $SQL_FILE"
echo "请确保已创建数据库 life_record_db 及用户（见 QUICK_START.md）。"
echo "导入结构..."
mysql -u life_record_user -p life_record_db < "$SQL_FILE"
echo "数据库结构导入完成。"
