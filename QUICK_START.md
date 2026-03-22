# 快速部署指南

## 🎯 目标配置

- **对外 HTTPS 域名**: `api.zaoqidawang.xin`（API + 静态资源同源，推荐）
- **存储路径**: /data/uploads/
- **数据库**: MySQL 5.7+
- **数据库名**: life_record_db

## ⚡ 快速部署（3个脚本）

### 1. 部署数据库（5分钟）

```bash
chmod +x deploy-database.sh
bash deploy-database.sh
```

### 2. 部署文件服务（5分钟）

```bash
chmod +x deploy.sh
bash deploy.sh
```

### 3. 部署后端服务（3分钟）

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 文件
npm start
```

## 📖 详细步骤

### 数据库部署（手动）

#### 安装MySQL

```bash
sudo apt update && sudo apt install mysql-server -y
sudo systemctl start mysql && sudo systemctl enable mysql
```

#### 创建数据库

```bash
sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS life_record_db 
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'life_record_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON life_record_db.* TO 'life_record_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

#### 导入数据库结构

```bash
cd backend
mysql -u life_record_user -p life_record_db < database/schema.sql
```

### 文件服务部署（手动）

#### 1. 安装Nginx

```bash
sudo apt update && sudo apt install nginx -y
```

#### 2. 创建存储目录

```bash
sudo mkdir -p /data/uploads/{images,videos,temp}
sudo chown -R $USER:$USER /data/uploads
sudo chmod -R 755 /data/uploads
```

#### 3. 配置 Nginx（HTTPS + 证书，与小程序合法域名一致）

生产环境请使用 **443 + SSL**，将 `server_name` 改为你的域名，`ssl_certificate` 指向证书路径；`/uploads/` 与 `/api/` 可同站或分路径反代。示例（需按实际证书路径修改）：

```nginx
server {
    listen 443 ssl;
    server_name api.zaoqidawang.xin;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    client_max_body_size 100M;
    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 4. 开放防火墙端口

```bash
sudo ufw allow 443/tcp && sudo ufw allow 80/tcp && sudo ufw reload
```

### 后端服务部署（手动）

#### 1. 安装Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. 配置后端

编辑 `backend/.env`:

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=life_record_user
DB_PASSWORD=your_password
DB_NAME=life_record_db

# 文件存储配置
STORAGE_TYPE=local
STORAGE_PATH=/data/uploads
STORAGE_BASE_URL=https://api.zaoqidawang.xin

# JWT配置
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

#### 3. 启动服务

```bash
cd backend
npm install
npm start
# 或使用 PM2
pm2 start app.js --name life-record-api
pm2 save
```

## ✅ 验证

```bash
# 测试数据库
mysql -u life_record_user -p life_record_db -e "SHOW TABLES;"

# 测试文件服务（HTTPS）
curl https://api.zaoqidawang.xin/health

# 测试后端API
curl http://localhost:3000/api/health
```

## 📝 完整文档

- **详细部署指南**: `DEPLOYMENT_GUIDE_CUSTOM.md`
- **完整部署指南**: `DEPLOYMENT_FULL.md`
