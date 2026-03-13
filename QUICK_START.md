# 快速部署指南

## 🎯 目标配置

- **服务器IP**: 149.104.29.197
- **文件服务端口**: 5678
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

#### 3. 配置Nginx

```bash
sudo tee /etc/nginx/sites-available/file-storage > /dev/null <<EOF
server {
    listen 5678;
    server_name 149.104.29.197;
    client_max_body_size 100M;
    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/file-storage /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

#### 4. 开放防火墙端口

```bash
sudo ufw allow 5678/tcp && sudo ufw reload
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
STORAGE_BASE_URL=http://149.104.29.197:5678

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

# 测试文件服务
curl http://149.104.29.197:5678/health

# 测试后端API
curl http://localhost:3000/api/health
```

## 📝 完整文档

- **详细部署指南**: `DEPLOYMENT_GUIDE_CUSTOM.md`
- **完整部署指南**: `DEPLOYMENT_FULL.md`
