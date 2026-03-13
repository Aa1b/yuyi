#!/bin/bash

# ============================================
# 记录生活管理系统 - 一键完整部署脚本
# ============================================
# 功能：
#   1. 部署数据库（MySQL安装、创建数据库、导入结构）
#   2. 部署文件服务（Nginx配置）
#   3. 配置后端环境变量
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置信息
SERVER_IP="149.104.29.197"
FILE_PORT="5678"
STORAGE_PATH="/data/uploads"
DB_NAME="life_record_db"
DB_USER="life_record_user"
SCHEMA_FILE="backend/database/schema.sql"

echo "=========================================="
echo "记录生活管理系统 - 一键完整部署"
echo "=========================================="
echo "服务器IP: $SERVER_IP"
echo "文件服务端口: $FILE_PORT"
echo "数据库名: $DB_NAME"
echo "=========================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示: 部分操作需要sudo权限${NC}"
fi

# ============================================
# 第一部分：数据库部署
# ============================================

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}第一部分：数据库部署${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 步骤1: 检查并安装MySQL
echo -e "${GREEN}[1/8] 检查MySQL安装...${NC}"
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
    echo "✓ MySQL 已安装: $(mysql --version)"
fi

# 步骤2: 启动MySQL服务
echo -e "\n${GREEN}[2/8] 启动MySQL服务...${NC}"
sudo systemctl start mysql 2>/dev/null || true
sudo systemctl enable mysql 2>/dev/null || true

if sudo systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✓ MySQL服务运行正常${NC}"
else
    echo -e "${RED}✗ MySQL服务启动失败${NC}"
    sudo systemctl status mysql
    exit 1
fi

# 步骤3: 获取数据库配置
echo -e "\n${GREEN}[3/8] 配置数据库...${NC}"
read -p "请输入MySQL root密码（如果已设置，直接回车使用sudo方式）: " ROOT_PASSWORD
read -p "请输入数据库用户名 (默认: $DB_USER): " INPUT_DB_USER
DB_USER=${INPUT_DB_USER:-$DB_USER}
read -sp "请输入数据库用户密码: " DB_PASSWORD
echo ""
read -p "请输入数据库名 (默认: $DB_NAME): " INPUT_DB_NAME
DB_NAME=${INPUT_DB_NAME:-$DB_NAME}

# 步骤4: 创建数据库和用户
echo -e "\n${GREEN}[4/8] 创建数据库和用户...${NC}"

SQL_SCRIPT=$(mktemp)
cat > "$SQL_SCRIPT" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;
EOF

if [ -n "$ROOT_PASSWORD" ]; then
    mysql -u root -p"$ROOT_PASSWORD" < "$SQL_SCRIPT" 2>/dev/null || {
        echo -e "${YELLOW}使用密码登录失败，尝试使用sudo方式...${NC}"
        sudo mysql < "$SQL_SCRIPT"
    }
else
    sudo mysql < "$SQL_SCRIPT"
fi

rm "$SQL_SCRIPT"
echo -e "${GREEN}✓ 数据库和用户创建完成${NC}"

# 步骤5: 导入数据库结构
echo -e "\n${GREEN}[5/8] 导入数据库结构...${NC}"

# 查找schema.sql文件
if [ ! -f "$SCHEMA_FILE" ]; then
    # 尝试其他可能的位置
    if [ -f "./database/schema.sql" ]; then
        SCHEMA_FILE="./database/schema.sql"
    elif [ -f "/root/schema.sql" ]; then
        SCHEMA_FILE="/root/schema.sql"
    else
        echo -e "${RED}错误: 找不到schema.sql文件${NC}"
        echo "请确保文件存在于以下位置之一:"
        echo "  - backend/database/schema.sql"
        echo "  - ./database/schema.sql"
        echo "  - /root/schema.sql"
        read -p "请输入schema.sql文件的完整路径: " SCHEMA_FILE
    fi
fi

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}错误: 找不到schema.sql文件: $SCHEMA_FILE${NC}"
    exit 1
fi

echo "导入文件: $SCHEMA_FILE"
if [ -n "$ROOT_PASSWORD" ]; then
    mysql -u root -p"$ROOT_PASSWORD" "$DB_NAME" < "$SCHEMA_FILE" 2>/dev/null || {
        echo -e "${YELLOW}使用密码导入失败，尝试使用sudo方式...${NC}"
        sudo mysql "$DB_NAME" < "$SCHEMA_FILE"
    }
else
    sudo mysql "$DB_NAME" < "$SCHEMA_FILE"
fi

echo -e "${GREEN}✓ 数据库结构导入完成${NC}"

# 步骤6: 验证数据库
echo -e "\n${GREEN}[6/8] 验证数据库...${NC}"
TABLE_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" -s -N 2>/dev/null || echo "0")
if [ "$TABLE_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ 数据库验证成功，共 $TABLE_COUNT 个表${NC}"
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null || echo "无法显示表列表"
else
    echo -e "${YELLOW}⚠ 警告: 未检测到表，但继续执行...${NC}"
fi

# ============================================
# 第二部分：文件服务部署
# ============================================

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}第二部分：文件服务部署${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 步骤1: 检查并安装Nginx
echo -e "${GREEN}[1/6] 检查Nginx安装...${NC}"
if ! command -v nginx &> /dev/null; then
    echo "正在安装Nginx..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y nginx
    else
        echo -e "${RED}错误: 未找到包管理器 (apt-get/yum)${NC}"
        exit 1
    fi
else
    echo "✓ Nginx 已安装: $(nginx -v 2>&1)"
fi

# 步骤2: 创建存储目录
echo -e "\n${GREEN}[2/6] 创建存储目录...${NC}"
sudo mkdir -p "$STORAGE_PATH/images"
sudo mkdir -p "$STORAGE_PATH/videos"
sudo mkdir -p "$STORAGE_PATH/temp"

if [ -n "$SUDO_USER" ]; then
    ACTUAL_USER="$SUDO_USER"
else
    ACTUAL_USER="$USER"
fi

echo "设置目录权限 (用户: $ACTUAL_USER)..."
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$STORAGE_PATH"
sudo chmod -R 755 "$STORAGE_PATH"
sudo chmod -R 777 "$STORAGE_PATH/temp"

echo -e "${GREEN}✓ 存储目录创建完成: $STORAGE_PATH${NC}"

# 步骤3: 配置Nginx
echo -e "\n${GREEN}[3/6] 配置Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/file-storage"
NGINX_ENABLED="/etc/nginx/sites-enabled/file-storage"

sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen $FILE_PORT;
    server_name $SERVER_IP;
    
    client_max_body_size 100M;
    
    location /uploads/ {
        alias $STORAGE_PATH/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
        
        # 允许跨域（如果需要）
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        
        # 禁止目录浏览
        autoindex off;
        
        # 文件类型
        types {
            image/jpeg jpg jpeg;
            image/png png;
            image/webp webp;
            image/gif gif;
            video/mp4 mp4;
            video/quicktime mov;
        }
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
EOF

echo "✓ Nginx配置文件已创建: $NGINX_CONFIG"

# 禁用default配置（避免80端口冲突）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "禁用default配置以避免端口冲突..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 启用配置
if [ -L "$NGINX_ENABLED" ]; then
    sudo rm "$NGINX_ENABLED"
fi

sudo ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
echo "✓ 配置文件已启用: $NGINX_ENABLED"

# 测试配置
echo "测试Nginx配置..."
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx配置测试通过${NC}"
else
    echo -e "${RED}✗ Nginx配置测试失败${NC}"
    exit 1
fi

# 步骤4: 重启Nginx
echo -e "\n${GREEN}[4/6] 重启Nginx服务...${NC}"
sudo systemctl stop nginx 2>/dev/null || true
sudo pkill nginx 2>/dev/null || true
sudo systemctl daemon-reload

# 修复日志目录权限
if [ -d /var/log/nginx ]; then
    sudo chown -R www-data:www-data /var/log/nginx/ 2>/dev/null || sudo chown -R root:root /var/log/nginx/
    sudo chmod -R 755 /var/log/nginx/
fi

if sudo systemctl start nginx; then
    sudo systemctl enable nginx
    sleep 2
    
    if sudo systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx服务运行正常${NC}"
    else
        echo -e "${RED}✗ Nginx服务启动失败${NC}"
        sudo tail -n 20 /var/log/nginx/error.log
        exit 1
    fi
else
    echo -e "${RED}✗ Nginx启动命令执行失败${NC}"
    sudo systemctl status nginx
    exit 1
fi

# 步骤5: 配置防火墙
echo -e "\n${GREEN}[5/6] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw allow $FILE_PORT/tcp 2>/dev/null || true
    sudo ufw reload 2>/dev/null || true
    echo "✓ 防火墙规则已添加"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=$FILE_PORT/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
    echo "✓ 防火墙规则已添加"
else
    echo -e "${YELLOW}⚠ 未找到防火墙管理工具，请手动开放 $FILE_PORT 端口${NC}"
fi

# 步骤6: 测试文件服务
echo -e "\n${GREEN}[6/6] 测试文件服务...${NC}"
sleep 2

HEALTH_RESPONSE=$(curl -s http://$SERVER_IP:$FILE_PORT/health || echo "FAILED")
if [ "$HEALTH_RESPONSE" = "healthy" ]; then
    echo -e "${GREEN}✓ 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠ 健康检查失败: $HEALTH_RESPONSE${NC}"
fi

TEST_FILE="$STORAGE_PATH/test.txt"
echo "Hello from file storage!" > "$TEST_FILE"
sudo chmod 644 "$TEST_FILE" 2>/dev/null || true

sleep 1
FILE_RESPONSE=$(curl -s http://$SERVER_IP:$FILE_PORT/uploads/test.txt || echo "FAILED")
if [ "$FILE_RESPONSE" = "Hello from file storage!" ]; then
    echo -e "${GREEN}✓ 文件访问测试通过${NC}"
    rm "$TEST_FILE" 2>/dev/null || true
else
    echo -e "${YELLOW}⚠ 文件访问测试失败${NC}"
fi

# ============================================
# 第三部分：后端环境配置
# ============================================

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}第三部分：后端环境配置${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 步骤1: 生成.env文件
echo -e "${GREEN}[1/2] 生成后端配置文件...${NC}"

ENV_FILE="backend/.env"
if [ ! -d "backend" ]; then
    echo -e "${YELLOW}⚠ backend目录不存在，跳过环境变量配置${NC}"
else
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example "$ENV_FILE"
            echo "已从 .env.example 创建 .env 文件"
        else
            # 创建默认.env文件
            cat > "$ENV_FILE" <<EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# JWT配置
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change_this_secret_key_$(date +%s)")
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=*

# 文件存储配置
STORAGE_TYPE=local
STORAGE_PATH=${STORAGE_PATH}
STORAGE_BASE_URL=http://${SERVER_IP}:${FILE_PORT}
MAX_FILE_SIZE=52428800
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
ALLOWED_VIDEO_TYPES=video/mp4,video/quicktime
EOF
            echo "已创建默认 .env 文件"
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

    # 更新文件存储配置
    if grep -q "STORAGE_TYPE=" "$ENV_FILE"; then
        sed -i "s/^STORAGE_TYPE=.*/STORAGE_TYPE=local/" "$ENV_FILE"
    else
        echo "STORAGE_TYPE=local" >> "$ENV_FILE"
    fi

    if grep -q "STORAGE_PATH=" "$ENV_FILE"; then
        sed -i "s|^STORAGE_PATH=.*|STORAGE_PATH=${STORAGE_PATH}|" "$ENV_FILE"
    else
        echo "STORAGE_PATH=${STORAGE_PATH}" >> "$ENV_FILE"
    fi

    if grep -q "STORAGE_BASE_URL=" "$ENV_FILE"; then
        sed -i "s|^STORAGE_BASE_URL=.*|STORAGE_BASE_URL=http://${SERVER_IP}:${FILE_PORT}|" "$ENV_FILE"
    else
        echo "STORAGE_BASE_URL=http://${SERVER_IP}:${FILE_PORT}" >> "$ENV_FILE"
    fi

    # 设置JWT_SECRET（如果不存在）
    if ! grep -q "JWT_SECRET=" "$ENV_FILE"; then
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change_this_secret_key_$(date +%s)")
        echo "JWT_SECRET=${JWT_SECRET}" >> "$ENV_FILE"
    fi

    # 设置其他默认值
    if ! grep -q "JWT_EXPIRES_IN=" "$ENV_FILE"; then
        echo "JWT_EXPIRES_IN=7d" >> "$ENV_FILE"
    fi

    if ! grep -q "PORT=" "$ENV_FILE"; then
        echo "PORT=3000" >> "$ENV_FILE"
    fi

    if ! grep -q "NODE_ENV=" "$ENV_FILE"; then
        echo "NODE_ENV=production" >> "$ENV_FILE"
    fi

    echo -e "${GREEN}✓ 配置文件已更新: $ENV_FILE${NC}"
    echo -e "${YELLOW}⚠ 请检查并确认配置文件中的其他设置${NC}"
fi

# 步骤2: 验证配置
echo -e "\n${GREEN}[2/2] 部署验证...${NC}"

echo "数据库验证:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null || echo "无法验证数据库"

echo ""
echo "文件服务验证:"
curl -s http://$SERVER_IP:$FILE_PORT/health || echo "无法访问文件服务"

# ============================================
# 部署完成
# ============================================

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "配置信息总结:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  服务器IP: $SERVER_IP"
echo "  文件服务端口: $FILE_PORT"
echo "  存储路径: $STORAGE_PATH"
echo "  访问URL: http://$SERVER_IP:$FILE_PORT/uploads/"
echo ""
echo "  数据库名: $DB_NAME"
echo "  数据库用户: $DB_USER"
echo "  数据库主机: localhost:3306"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "下一步操作:"
echo "  1. 检查后端配置文件: backend/.env"
echo "  2. 部署后端服务:"
echo "     方法1（推荐）: bash deploy-backend.sh"
echo "     方法2（手动）:"
echo "       cd backend"
echo "       npm install --production"
echo "       pm2 start app.js --name life-record-api"
echo "       pm2 save"
echo ""
echo "验证命令:"
echo "  # 测试数据库"
echo "  mysql -u $DB_USER -p $DB_NAME -e 'SHOW TABLES;'"
echo ""
echo "  # 测试文件服务"
echo "  curl http://$SERVER_IP:$FILE_PORT/health"
echo ""
echo "  # 查看Nginx日志"
echo "  sudo tail -f /var/log/nginx/access.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
