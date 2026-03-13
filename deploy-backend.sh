#!/bin/bash

# ============================================
# 后端服务部署脚本
# ============================================
# 功能：
#   1. 检查Node.js环境
#   2. 安装后端依赖
#   3. 配置环境变量
#   4. 使用PM2部署后端服务
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_DIR="backend"
SERVICE_NAME="life-record-api"
PORT=${PORT:-3000}

echo "=========================================="
echo "后端服务部署"
echo "=========================================="
echo "服务名称: $SERVICE_NAME"
echo "端口: $PORT"
echo "=========================================="
echo ""

# 检查backend目录
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}错误: 找不到 $BACKEND_DIR 目录${NC}"
    echo "请确保在项目根目录执行此脚本"
    exit 1
fi

cd "$BACKEND_DIR"

# ============================================
# 步骤1: 检查Node.js环境
# ============================================

echo -e "${GREEN}[1/6] 检查Node.js环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装Node.js${NC}"
    echo "正在安装Node.js..."
    
    # 使用nvm安装（如果可用）
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
        nvm install 18
        nvm use 18
    else
        # 使用apt安装
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
        else
            echo -e "${RED}错误: 无法自动安装Node.js，请手动安装${NC}"
            exit 1
        fi
    fi
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ Node.js版本: $NODE_VERSION${NC}"
echo -e "${GREEN}✓ npm版本: $NPM_VERSION${NC}"

# ============================================
# 步骤2: 检查环境变量文件
# ============================================

echo -e "\n${GREEN}[2/6] 检查环境变量配置...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env 文件不存在，正在创建...${NC}"
    
    # 尝试从.env.example复制
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已从 .env.example 创建 .env 文件${NC}"
    else
        # 创建默认.env文件
        cat > .env <<'ENVEOF'
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=life_record_user
DB_PASSWORD=your_password_here
DB_NAME=life_record_db

# JWT配置
JWT_SECRET=your_very_secure_jwt_secret_key_change_this
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=*

# 文件存储配置
STORAGE_TYPE=local
STORAGE_PATH=/data/uploads
STORAGE_BASE_URL=http://149.104.29.197:5678
MAX_FILE_SIZE=52428800
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
ALLOWED_VIDEO_TYPES=video/mp4,video/quicktime
ENVEOF
        echo -e "${GREEN}✓ 已创建默认 .env 文件${NC}"
    fi
    
    echo -e "${YELLOW}⚠ 请编辑 .env 文件配置数据库密码和其他设置${NC}"
    echo "使用命令: nano .env"
    read -p "按回车继续（请确保已配置.env文件）..."
else
    echo -e "${GREEN}✓ .env 文件存在${NC}"
    echo -e "${YELLOW}⚠ 请确认 .env 文件中的配置正确${NC}"
fi

# ============================================
# 步骤3: 安装依赖
# ============================================

echo -e "\n${GREEN}[3/6] 安装后端依赖...${NC}"

if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 找不到 package.json 文件${NC}"
    exit 1
fi

echo "正在安装npm依赖..."
npm install --production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${RED}✗ 依赖安装失败${NC}"
    exit 1
fi

# ============================================
# 步骤4: 测试数据库连接
# ============================================

echo -e "\n${GREEN}[4/6] 测试数据库连接...${NC}"

if node -e "require('./config/database.js')" 2>/dev/null; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${YELLOW}⚠ 数据库连接测试失败，请检查 .env 配置${NC}"
    echo "继续部署，但请确保数据库配置正确"
fi

# ============================================
# 步骤5: 安装PM2（如果未安装）
# ============================================

echo -e "\n${GREEN}[5/6] 检查PM2安装...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo "正在安装PM2..."
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
else
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✓ PM2 已安装: v$PM2_VERSION${NC}"
fi

# ============================================
# 步骤6: 部署服务
# ============================================

echo -e "\n${GREEN}[6/6] 部署后端服务...${NC}"

# 停止现有服务（如果存在）
if pm2 list | grep -q "$SERVICE_NAME"; then
    echo "停止现有服务..."
    pm2 stop "$SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
fi

# 启动服务
echo "启动后端服务..."
cd "$(pwd)"
pm2 start app.js --name "$SERVICE_NAME" --instances 1

# 保存PM2配置
pm2 save

# 设置开机自启
echo "配置PM2开机自启..."
pm2 startup | tail -1 | bash || {
    echo -e "${YELLOW}⚠ PM2开机自启配置失败，请手动执行: pm2 startup${NC}"
}

# 等待服务启动
sleep 3

# 检查服务状态
if pm2 list | grep -q "$SERVICE_NAME.*online"; then
    echo -e "${GREEN}✓ 后端服务启动成功${NC}"
    
    # 显示服务信息
    echo ""
    echo "服务状态:"
    pm2 show "$SERVICE_NAME" | grep -E "(status|pid|port|uptime|restarts)" | head -10
    
    # 显示日志
    echo ""
    echo "最近日志:"
    pm2 logs "$SERVICE_NAME" --lines 5 --nostream
else
    echo -e "${RED}✗ 后端服务启动失败${NC}"
    echo "查看错误日志:"
    pm2 logs "$SERVICE_NAME" --lines 20 --nostream
    exit 1
fi

# ============================================
# 部署完成
# ============================================

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}后端服务部署完成！${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "服务信息:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  服务名称: $SERVICE_NAME"
echo "  运行端口: $PORT (检查.env文件)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "常用命令:"
echo "  # 查看服务状态"
echo "  pm2 status"
echo ""
echo "  # 查看服务详情"
echo "  pm2 show $SERVICE_NAME"
echo ""
echo "  # 查看日志"
echo "  pm2 logs $SERVICE_NAME"
echo ""
echo "  # 重启服务"
echo "  pm2 restart $SERVICE_NAME"
echo ""
echo "  # 停止服务"
echo "  pm2 stop $SERVICE_NAME"
echo ""
echo "  # 查看实时日志"
echo "  pm2 logs $SERVICE_NAME --lines 50"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 测试API（如果端口已配置）
if [ -n "$PORT" ] && [ "$PORT" != "3000" ]; then
    echo ""
    echo "测试API:"
    echo "  curl http://localhost:$PORT/api/health"
fi
