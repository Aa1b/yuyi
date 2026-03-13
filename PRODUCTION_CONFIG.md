# 生产环境配置说明

## 📋 当前服务器配置

- **服务器IP**: 149.104.29.197
- **后端API端口**: 3000
- **文件服务端口**: 5678
- **API地址**: http://149.104.29.197:3000/api
- **文件服务地址**: http://149.104.29.197:5678/uploads/

## ✅ 已完成的配置

### 1. 本地小程序配置

已更新 `config.js`：
- `isMock: false` - 使用真实API
- `baseUrl: 'http://149.104.29.197:3000/api'` - 指向服务器API

### 2. 服务器后端配置

已配置 `backend/.env`：
- 数据库连接：life_record_user / your_password_here / life_record_db
- 文件存储：/data/uploads
- 文件服务URL：http://149.104.29.197:5678

## ⚠️ 重要提醒

### 微信小程序域名配置

微信小程序要求使用**合法域名**，不能直接使用IP地址。你需要：

1. **方案1：使用域名（推荐）**
   - 将服务器IP绑定到域名（如：api.yourdomain.com）
   - 配置SSL证书（HTTPS）
   - 在微信小程序后台配置合法域名

2. **方案2：开发环境使用IP（仅开发测试）**
   - 在微信开发者工具中：
     - 设置 → 项目设置 → 本地设置
     - 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
   - ⚠️ 此设置仅在开发工具中有效，真机预览和正式版仍需要合法域名

### 配置步骤

#### 1. 配置小程序合法域名

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入：开发 → 开发管理 → 开发设置
3. 在"服务器域名"中配置：
   - **request合法域名**：`https://api.yourdomain.com` 或 `http://149.104.29.197:3000`（开发环境）
   - **uploadFile合法域名**：`https://api.yourdomain.com` 或 `http://149.104.29.197:3000`（开发环境）
   - **downloadFile合法域名**：`http://149.104.29.197:5678`（文件服务）

#### 2. 配置Nginx反向代理（可选，推荐）

如果需要使用域名访问，配置Nginx反向代理：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

然后更新 `config.js`：
```javascript
baseUrl: 'https://api.yourdomain.com/api'
```

## 🔍 验证配置

### 1. 测试API连接

在微信开发者工具中：
1. 打开小程序
2. 尝试登录或访问任何需要API的功能
3. 查看控制台是否有网络请求
4. 检查请求是否成功

### 2. 检查后端服务

在服务器上执行：
```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs life-record-api

# 测试API
curl http://localhost:3000/api/health
```

### 3. 检查数据库连接

```bash
# 在服务器上测试
cd backend
node -e "require('./config/database.js')"
```

## 📝 配置文件位置

- **小程序配置**: `config.js`
- **后端配置**: `backend/.env`（在服务器上）
- **文件服务配置**: Nginx配置文件（在服务器上）

## 🔄 更新配置

如果需要修改配置：

1. **修改API地址**：编辑 `config.js` 中的 `baseUrl`
2. **修改后端配置**：在服务器上编辑 `backend/.env`
3. **重启服务**：修改后端配置后需要重启
   ```bash
   pm2 restart life-record-api
   ```

## 🐛 常见问题

### 问题1: 网络请求失败

**原因**: 微信小程序未配置合法域名

**解决**: 
- 开发环境：在开发者工具中勾选"不校验合法域名"
- 生产环境：配置合法域名或使用HTTPS域名

### 问题2: 跨域问题

**原因**: 后端CORS配置不正确

**解决**: 检查 `backend/.env` 中的 `CORS_ORIGIN` 配置

### 问题3: 文件上传失败

**原因**: 文件服务未配置或URL不正确

**解决**: 
- 检查文件服务是否运行：`curl http://149.104.29.197:5678/health`
- 检查后端 `STORAGE_BASE_URL` 配置

---

**最后更新**: 2024-01-18
