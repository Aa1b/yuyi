# 记录生活管理系统

基于微信小程序的生活记录管理系统，支持图文、视频记录，好友互动，内容管理等功能。

## 📋 项目简介

这是一个轻量化、专注于记录生活的微信小程序应用，用户可以：
- 📝 记录生活瞬间（图文、视频）
- 🔒 设置内容可见性（公开、私密、好友可见）
- ❤️ 好友互动（点赞、评论）
- 🏷️ 分类和标签管理
- 👥 关注好友动态
- 🔔 消息通知

## 🛠️ 技术栈

### 前端
- **框架**: 微信小程序原生框架
- **UI组件**: TDesign 小程序组件库
- **状态管理**: 全局事件总线
- **数据请求**: 封装 wx.request

### 后端
- **框架**: Node.js + Express
- **数据库**: MySQL 5.7+
- **认证**: JWT Token
- **文件存储**: 本地存储（支持扩展云存储）
- **进程管理**: PM2

## 📁 项目结构

```
.
├── api/                    # API请求封装
├── backend/                # 后端服务
│   ├── controllers/        # 控制器
│   ├── routes/            # 路由
│   ├── middleware/        # 中间件
│   ├── database/          # 数据库脚本
│   └── services/          # 服务层
├── components/            # 小程序组件
├── pages/                # 小程序页面
├── mock/                 # Mock数据（开发用）
├── config.js             # 配置文件
└── deploy-*.sh           # 部署脚本
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- 微信开发者工具

### 2. 本地开发

#### 前端开发

```bash
# 安装依赖
npm install

# 在微信开发者工具中打开项目
# 配置：设置 → 项目设置 → 本地设置
# 勾选"不校验合法域名"（开发环境）
```

#### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库等信息

# 初始化数据库
mysql -u root -p < database/schema.sql

# 启动服务
npm run dev
```

### 3. 生产环境部署

#### 一键部署（推荐）

```bash
# 1. 上传部署脚本和代码到服务器
# 2. 执行一键部署
bash deploy-all.sh
```

#### 分步部署

```bash
# 1. 部署数据库
bash deploy-database.sh

# 2. 部署文件服务
bash deploy.sh

# 3. 部署后端服务
bash deploy-backend.sh
```

详细部署说明请查看：[快速部署指南](QUICK_START.md)

## ⚙️ 配置说明

### 前端配置

编辑 `config.js`：

```javascript
export default {
  isMock: false, // 生产环境设为 false
  baseUrl: 'http://your-api-domain.com/api', // API地址
};
```

### 后端配置

编辑 `backend/.env`：

```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=life_record_user
DB_PASSWORD=your_password
DB_NAME=life_record_db

# JWT配置
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# 文件存储配置
STORAGE_TYPE=local
STORAGE_PATH=/data/uploads
STORAGE_BASE_URL=http://your-domain.com:5678
```

详细配置说明请查看：[生产环境配置](PRODUCTION_CONFIG.md)

## 📚 主要功能

### 用户功能
- ✅ 微信登录/注册
- ✅ 个人资料管理
- ✅ 关注/取消关注用户
- ✅ 查看关注列表

### 内容管理
- ✅ 发布生活记录（图文/视频）
- ✅ 编辑/删除记录
- ✅ 分类和标签
- ✅ 隐私设置（公开/私密/好友可见）
- ✅ 搜索功能

### 互动功能
- ✅ 点赞/取消点赞
- ✅ 评论/回复
- ✅ 消息通知

### 文件管理
- ✅ 图片上传（压缩、缩略图）
- ✅ 视频上传（封面提取）
- ✅ 文件删除

## 🔌 API接口

### 认证相关
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息
- `PUT /api/auth/profile` - 更新用户信息

### 生活记录
- `GET /api/life/list` - 获取记录列表
- `GET /api/life/detail` - 获取记录详情
- `POST /api/life/record` - 创建记录
- `PUT /api/life/record` - 更新记录
- `DELETE /api/life/record` - 删除记录
- `GET /api/life/search` - 搜索记录

### 互动功能
- `POST /api/life/like` - 点赞
- `DELETE /api/life/like` - 取消点赞
- `GET /api/life/comments` - 获取评论
- `POST /api/life/comment` - 发表评论

### 用户相关
- `POST /api/user/follow` - 关注用户
- `DELETE /api/user/follow` - 取消关注
- `GET /api/user/following` - 关注列表
- `GET /api/user/profile/:userId` - 用户主页

### 文件上传
- `POST /api/upload/image` - 上传图片
- `POST /api/upload/video` - 上传视频
- `DELETE /api/upload/file` - 删除文件

### 通知
- `GET /api/notification/list` - 通知列表
- `GET /api/notification/unread-count` - 未读数量
- `POST /api/notification/read` - 标记已读
- `DELETE /api/notification` - 删除通知

详细API文档请查看：[后端README](backend/README.md)

## 📖 文档

- [快速部署指南](QUICK_START.md) - 快速部署步骤
- [生产环境配置](PRODUCTION_CONFIG.md) - 生产环境配置说明
- [后端文档](backend/README.md) - 后端API详细文档

## 🔧 部署脚本

- `deploy-all.sh` - 一键完整部署（数据库+文件服务+后端）
- `deploy-database.sh` - 数据库部署
- `deploy.sh` - 文件服务部署
- `deploy-backend.sh` - 后端服务部署
- `troubleshoot-nginx.sh` - Nginx故障排查
- `quick-fix-nginx.sh` - Nginx快速修复

## ⚠️ 注意事项

### 微信小程序配置

1. **域名配置**：生产环境需要在微信公众平台配置合法域名
2. **开发环境**：可在开发者工具中关闭域名校验
3. **HTTPS要求**：生产环境必须使用HTTPS（除文件服务外）

### 安全建议

1. 使用强密码和JWT密钥
2. 配置防火墙规则
3. 定期备份数据库
4. 使用HTTPS（生产环境）
5. 限制API访问频率

## 🐛 常见问题

### 1. 网络请求失败

**原因**: 未配置合法域名

**解决**: 
- 开发环境：在开发者工具中勾选"不校验合法域名"
- 生产环境：在微信公众平台配置合法域名

### 2. 数据库连接失败

**检查**:
- 数据库服务是否运行
- `.env` 文件配置是否正确
- 用户权限是否正确

### 3. 文件上传失败

**检查**:
- 文件服务是否运行
- 存储目录权限是否正确
- 文件大小是否超限

## 📝 开发规范

- 代码风格：遵循 ESLint 规范
- 提交信息：使用清晰的提交信息
- 分支管理：主分支用于生产，开发分支用于功能开发

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request。

---

**最后更新**: 2024-01-18
