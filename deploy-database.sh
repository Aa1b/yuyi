#!/bin/bash

# 数据库自动化部署脚本
# 使用方法: bash deploy-database.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署数据库..."
echo "数据库名: life_record_db"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示: 部分操作需要sudo权限${NC}"
fi

# 步骤1: 检查并安装MySQL
echo -e "\n${GREEN}[1/7] 检查MySQL安装...${NC}"
if ! command -v mysql &> /dev/null; then
    echo "正在安装MySQL..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y mysql-server
    elif command -v yum &> /dev/null; then
        sudo yum install -y mysql-server
    else
        echo -e "${RED}错误: 未找到包管理器 (apt-get/yum)${NC}"
        exit 1
    fi
else
    echo "MySQL 已安装: $(mysql --version)"
fi

# 步骤2: 启动MySQL服务
echo -e "\n${GREEN}[2/7] 启动MySQL服务...${NC}"
sudo systemctl start mysql
sudo systemctl enable mysql

if sudo systemctl is-active --quiet mysql; then
    echo -e "${GREEN}MySQL服务运行正常${NC}"
else
    echo -e "${RED}MySQL服务启动失败${NC}"
    sudo systemctl status mysql
    exit 1
fi

# 步骤3: 获取数据库配置
echo -e "\n${GREEN}[3/7] 配置数据库...${NC}"
read -p "请输入MySQL root密码: " ROOT_PASSWORD
read -p "请输入数据库用户名 (默认: life_record_user): " DB_USER
DB_USER=${DB_USER:-life_record_user}
read -sp "请输入数据库用户密码: " DB_PASSWORD
echo ""
read -p "请输入数据库名 (默认: life_record_db): " DB_NAME
DB_NAME=${DB_NAME:-life_record_db}

# 步骤4: 创建数据库和用户
echo -e "\n${GREEN}[4/7] 创建数据库和用户...${NC}"

# 创建SQL脚本
SQL_SCRIPT=$(mktemp)
cat > "$SQL_SCRIPT" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;

SHOW DATABASES;
EOF

# 执行SQL脚本
if [ -n "$ROOT_PASSWORD" ]; then
    mysql -u root -p"$ROOT_PASSWORD" < "$SQL_SCRIPT"
else
    sudo mysql < "$SQL_SCRIPT"
fi

rm "$SQL_SCRIPT"
echo -e "${GREEN}数据库和用户创建完成${NC}"

# 步骤5: 导入数据库结构
echo -e "\n${GREEN}[5/7] 导入数据库结构...${NC}"

# 查找schema.sql文件
SCHEMA_FILE=""
if [ -f "backend/database/schema.sql" ]; then
    SCHEMA_FILE="backend/database/schema.sql"
elif [ -f "./database/schema.sql" ]; then
    SCHEMA_FILE="./database/schema.sql"
else
    read -p "请输入schema.sql文件的完整路径: " SCHEMA_FILE
fi

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}错误: 找不到schema.sql文件: $SCHEMA_FILE${NC}"
    exit 1
fi

echo "导入文件: $SCHEMA_FILE"
if [ -n "$ROOT_PASSWORD" ]; then
    mysql -u root -p"$ROOT_PASSWORD" "$DB_NAME" < "$SCHEMA_FILE"
else
    sudo mysql "$DB_NAME" < "$SCHEMA_FILE"
fi

echo -e "${GREEN}数据库结构导入完成${NC}"

# 步骤6: 验证数据库
echo -e "\n${GREEN}[6/7] 验证数据库...${NC}"

# 创建验证SQL脚本
VERIFY_SCRIPT=$(mktemp)
cat > "$VERIFY_SCRIPT" <<EOF
USE ${DB_NAME};
SHOW TABLES;
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = '${DB_NAME}';
EOF

if [ -n "$ROOT_PASSWORD" ]; then
    mysql -u root -p"$ROOT_PASSWORD" < "$VERIFY_SCRIPT"
else
    sudo mysql < "$VERIFY_SCRIPT"
fi

rm "$VERIFY_SCRIPT"

# 步骤7: 生成.env配置
echo -e "\n${GREEN}[7/7] 生成后端配置文件...${NC}"

ENV_FILE="backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example "$ENV_FILE"
    else
        touch "$ENV_FILE"
    fi
fi

# 更新数据库配置
if grep -q "DB_HOST=" "$ENV_FILE"; then
    sed -i "s/^DB_HOST=.*/DB_HOST=localhost/" "$ENV_FILE"
else
    echo "DB_HOST=localhost" >> "$ENV_FILE"
fi

if grep -q "DB_PORT=" "$ENV_FILE"; then
    sed -i "s/^DB_PORT=.*/DB_PORT=3306/" "$ENV_FILE"
else
    echo "DB_PORT=3306" >> "$ENV_FILE"
fi

if grep -q "DB_USER=" "$ENV_FILE"; then
    sed -i "s/^DB_USER=.*/DB_USER=${DB_USER}/" "$ENV_FILE"
else
    echo "DB_USER=${DB_USER}" >> "$ENV_FILE"
fi

if grep -q "DB_PASSWORD=" "$ENV_FILE"; then
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" "$ENV_FILE"
else
    echo "DB_PASSWORD=${DB_PASSWORD}" >> "$ENV_FILE"
fi

if grep -q "DB_NAME=" "$ENV_FILE"; then
    sed -i "s/^DB_NAME=.*/DB_NAME=${DB_NAME}/" "$ENV_FILE"
else
    echo "DB_NAME=${DB_NAME}" >> "$ENV_FILE"
fi

echo -e "${GREEN}配置文件已更新: $ENV_FILE${NC}"

# 部署完成
echo -e "\n=========================================="
echo -e "${GREEN}数据库部署完成！${NC}"
echo "=========================================="
echo "配置信息:"
echo "  数据库名: $DB_NAME"
echo "  用户名: $DB_USER"
echo "  主机: localhost"
echo "  端口: 3306"
echo ""
echo "下一步:"
echo "  1. 检查 backend/.env 文件中的数据库配置"
echo "  2. 测试数据库连接: cd backend && node -e \"require('./config/database.js')\""
echo "  3. 继续部署文件服务和后端应用"
echo ""
echo "数据库管理命令:"
echo "  登录数据库: mysql -u $DB_USER -p $DB_NAME"
echo "  查看所有表: mysql -u $DB_USER -p $DB_NAME -e 'SHOW TABLES;'"
echo "=========================================="
