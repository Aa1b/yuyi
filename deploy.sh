#!/bin/bash

# 文件服务自动化部署脚本
# 服务器: 149.104.29.197:5678
# 注意: 此脚本仅部署文件服务，数据库请使用 deploy-database.sh
# 使用方法: bash deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署文件服务..."
echo "服务器: 149.104.29.197:5678"
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

# 步骤1: 检查并安装Nginx
echo -e "\n${GREEN}[1/6] 检查Nginx安装...${NC}"
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
    echo "Nginx 已安装: $(nginx -v 2>&1)"
fi

# 步骤2: 创建存储目录
echo -e "\n${GREEN}[2/6] 创建存储目录...${NC}"
STORAGE_PATH="/data/uploads"
sudo mkdir -p "$STORAGE_PATH/images"
sudo mkdir -p "$STORAGE_PATH/videos"
sudo mkdir -p "$STORAGE_PATH/temp"

# 获取当前用户（如果使用sudo，获取实际用户）
if [ -n "$SUDO_USER" ]; then
    ACTUAL_USER="$SUDO_USER"
else
    ACTUAL_USER="$USER"
fi

echo "设置目录权限 (用户: $ACTUAL_USER)..."
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$STORAGE_PATH"
sudo chmod -R 755 "$STORAGE_PATH"
sudo chmod -R 777 "$STORAGE_PATH/temp"  # 临时目录需要写权限

echo "存储目录创建完成: $STORAGE_PATH"
ls -la "$STORAGE_PATH"

# 步骤3: 创建Nginx配置
echo -e "\n${GREEN}[3/6] 配置Nginx...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/file-storage"
NGINX_ENABLED="/etc/nginx/sites-enabled/file-storage"

# 创建配置文件
sudo tee "$NGINX_CONFIG" > /dev/null <<'EOF'
server {
    listen 5678;
    server_name 149.104.29.197;
    
    client_max_body_size 100M;
    
    location /uploads/ {
        alias /data/uploads/;
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

echo "Nginx配置文件已创建: $NGINX_CONFIG"

# 启用配置
if [ -L "$NGINX_ENABLED" ]; then
    echo "配置文件已存在，先删除旧链接..."
    sudo rm "$NGINX_ENABLED"
fi

sudo ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
echo "配置文件已启用: $NGINX_ENABLED"

# 测试配置
echo "测试Nginx配置..."
if sudo nginx -t; then
    echo -e "${GREEN}Nginx配置测试通过${NC}"
else
    echo -e "${RED}Nginx配置测试失败，请检查配置${NC}"
    exit 1
fi

# 步骤4: 重启Nginx
echo -e "\n${GREEN}[4/6] 重启Nginx服务...${NC}"

# 先停止可能存在的Nginx进程
sudo systemctl stop nginx 2>/dev/null || true
sudo pkill nginx 2>/dev/null || true

# 禁用default配置（避免80端口冲突）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "禁用default配置以避免端口冲突..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 重新加载systemd配置
sudo systemctl daemon-reload

# 检查并修复日志目录权限
if [ -d /var/log/nginx ]; then
    sudo chown -R www-data:www-data /var/log/nginx/ 2>/dev/null || sudo chown -R root:root /var/log/nginx/
    sudo chmod -R 755 /var/log/nginx/
fi

# 尝试启动Nginx
if sudo systemctl start nginx; then
    sudo systemctl enable nginx  # 设置开机自启
    sleep 2  # 等待服务启动
    
    # 检查Nginx状态
    if sudo systemctl is-active --quiet nginx; then
        echo -e "${GREEN}Nginx服务运行正常${NC}"
    else
        echo -e "${RED}Nginx服务启动失败${NC}"
        echo "查看错误日志:"
        sudo tail -n 20 /var/log/nginx/error.log
        echo ""
        echo "查看systemd日志:"
        sudo journalctl -xeu nginx.service --no-pager | tail -n 20
        echo ""
        echo "请运行故障排查脚本: bash troubleshoot-nginx.sh"
        exit 1
    fi
else
    echo -e "${RED}Nginx启动命令执行失败${NC}"
    echo "查看详细错误:"
    sudo systemctl status nginx
    echo ""
    echo "查看错误日志:"
    sudo tail -n 30 /var/log/nginx/error.log
    echo ""
    echo "请运行故障排查脚本: bash troubleshoot-nginx.sh"
    exit 1
fi

# 步骤5: 配置防火墙
echo -e "\n${GREEN}[5/6] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    echo "使用UFW配置防火墙..."
    sudo ufw allow 5678/tcp
    sudo ufw reload
    echo "防火墙规则已添加"
elif command -v firewall-cmd &> /dev/null; then
    echo "使用firewalld配置防火墙..."
    sudo firewall-cmd --permanent --add-port=5678/tcp
    sudo firewall-cmd --reload
    echo "防火墙规则已添加"
else
    echo -e "${YELLOW}警告: 未找到防火墙管理工具，请手动开放5678端口${NC}"
fi

# 步骤6: 测试部署
echo -e "\n${GREEN}[6/6] 测试部署...${NC}"
sleep 2  # 等待服务启动

# 测试健康检查
echo "测试健康检查端点..."
HEALTH_RESPONSE=$(curl -s http://149.104.29.197:5678/health || echo "FAILED")

if [ "$HEALTH_RESPONSE" = "healthy" ]; then
    echo -e "${GREEN}✓ 健康检查通过${NC}"
else
    echo -e "${RED}✗ 健康检查失败: $HEALTH_RESPONSE${NC}"
    echo "请检查Nginx日志: sudo tail -f /var/log/nginx/error.log"
fi

# 测试文件访问
echo "创建测试文件..."
TEST_FILE="$STORAGE_PATH/test.txt"
echo "Hello from file storage!" > "$TEST_FILE"
sudo chmod 644 "$TEST_FILE"

sleep 1
FILE_RESPONSE=$(curl -s http://149.104.29.197:5678/uploads/test.txt || echo "FAILED")

if [ "$FILE_RESPONSE" = "Hello from file storage!" ]; then
    echo -e "${GREEN}✓ 文件访问测试通过${NC}"
    rm "$TEST_FILE"  # 清理测试文件
else
    echo -e "${YELLOW}⚠ 文件访问测试失败，但服务可能正常${NC}"
    echo "响应: $FILE_RESPONSE"
fi

# 检查端口监听
echo "检查端口监听..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":5678 " || sudo ss -tlnp 2>/dev/null | grep -q ":5678 "; then
    echo -e "${GREEN}✓ 端口5678正在监听${NC}"
else
    echo -e "${YELLOW}⚠ 未检测到端口5678监听，请手动检查${NC}"
fi

# 部署完成
echo -e "\n=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "=========================================="
echo "配置信息:"
echo "  服务器IP: 149.104.29.197"
echo "  服务端口: 5678"
echo "  存储路径: $STORAGE_PATH"
echo "  访问URL: http://149.104.29.197:5678/uploads/"
echo ""
echo "下一步:"
echo "  1. 配置后端 .env 文件:"
echo "     STORAGE_BASE_URL=http://149.104.29.197:5678"
echo "  2. 重启后端服务"
echo "  3. 测试文件上传功能"
echo ""
echo "查看日志:"
echo "  sudo tail -f /var/log/nginx/access.log"
echo "  sudo tail -f /var/log/nginx/error.log"
echo "=========================================="
