# 记录生活管理系统 - 后端API

基于 Node.js + Express + MySQL 的后端API服务。

## 技术栈

- **框架**: Express 4.18+
- **数据库**: MySQL 5.7+
- **认证**: JWT (jsonwebtoken)
- **文件上传**: Multer
- **安全**: Helmet, CORS, Rate Limiting

## 项目结构

```
backend/
├── app.js                 # 应用入口
├── package.json           # 项目配置
├── .env.example          # 环境变量示例
├── config/               # 配置文件
│   └── database.js       # 数据库配置
├── controllers/          # 控制器
│   ├── authController.js # 认证控制器
│   ├── lifeController.js # 生活记录控制器
│   ├── userController.js # 用户控制器
│   └── uploadController.js # 上传控制器
├── middleware/           # 中间件
│   ├── auth.js          # 认证中间件
│   ├── errorHandler.js  # 错误处理
│   ├── notFound.js      # 404处理
│   └── upload.js        # 文件上传
├── routes/              # 路由
│   ├── auth.js         # 认证路由
│   ├── life.js         # 生活记录路由
│   ├── user.js         # 用户路由
│   └── upload.js       # 上传路由
└── database/           # 数据库
    └── schema.sql      # 数据库结构
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

修改 `.env` 文件中的数据库配置和其他配置项。

**微信小程序登录**（可选）：若需使用「微信一键登录」，在 `.env` 中增加：

- `WECHAT_APPID`：小程序 AppID（微信公众平台 → 开发 → 开发管理 → 开发设置）
- `WECHAT_SECRET`：小程序 AppSecret（同上）

未配置时，点击微信登录会返回 503 提示「微信登录未配置」。

### 3. 初始化数据库

执行 `database/schema.sql` 文件创建数据库和表：

```bash
mysql -u root -p < database/schema.sql
```

### 4. 启动服务

开发模式（使用 nodemon）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务默认运行在 `http://localhost:3000`

## API 接口

### 认证相关

- `POST /api/auth/login` - 用户登录（微信小程序）
- `POST /api/auth/register` - 用户注册（备用）
- `GET /api/auth/profile` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新用户信息

### 生活记录相关

- `GET /api/life/list` - 获取生活记录列表
- `GET /api/life/detail` - 获取生活记录详情
- `POST /api/life/record` - 创建生活记录
- `PUT /api/life/record` - 更新生活记录
- `DELETE /api/life/record` - 删除生活记录
- `POST /api/life/like` - 点赞
- `DELETE /api/life/like` - 取消点赞
- `GET /api/life/comments` - 获取评论列表
- `POST /api/life/comment` - 发表评论
- `GET /api/life/categories` - 获取分类列表
- `GET /api/life/tags` - 获取标签列表

### 用户相关

- `POST /api/user/follow` - 关注用户
- `DELETE /api/user/follow` - 取消关注
- `GET /api/user/following` - 获取关注列表
- `GET /api/user/followers` - 获取粉丝列表
- `GET /api/user/profile/:userId` - 获取用户信息

### 文件上传

- `POST /api/upload/image` - 上传图片
- `POST /api/upload/video` - 上传视频
- `DELETE /api/upload/file` - 删除文件

## 认证方式

使用 JWT Token 进行认证。在请求头中添加：

```
Authorization: Bearer <token>
```

## 响应格式

所有接口统一返回格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

- `code`: 状态码（200成功，4xx客户端错误，5xx服务器错误）
- `message`: 提示信息
- `data`: 数据内容

## 数据库设计

详见 `database/schema.sql` 文件。

## 开发说明

### 添加新接口

1. 在 `controllers/` 中创建或修改控制器
2. 在 `routes/` 中定义路由
3. 在 `app.js` 中注册路由

### 错误处理

所有错误通过 `errorHandler` 中间件统一处理。

### 安全措施

- 使用 Helmet 加强 HTTP 头安全
- 使用 CORS 控制跨域访问
- 使用 Rate Limiting 防止请求泛滥
- JWT Token 认证
- SQL 参数化查询防止注入
- 文件类型和大小验证

## 部署

### 生产环境配置

1. 设置 `NODE_ENV=production`
2. 配置数据库连接
3. 设置安全的 JWT_SECRET
4. 配置云存储（如使用）
5. 使用 PM2 或类似工具管理进程

### 使用 PM2

```bash
npm install -g pm2
pm2 start app.js --name life-record-api
pm2 save
pm2 startup
```

## 注意事项

1. **微信登录**: 当前登录接口使用模拟数据，实际部署需要集成微信小程序登录API
2. **文件上传**: 当前使用本地存储，生产环境建议使用云存储（微信云开发或OSS）
3. **视频处理**: 视频封面提取和时长获取需要额外处理，可使用 FFmpeg
4. **数据库索引**: 已创建必要的索引，根据实际查询情况可进一步优化

## 待完善功能

- [ ] 集成微信小程序登录API
- [ ] 实现云存储上传（微信云开发/OSS）
- [ ] 视频封面提取和时长获取
- [ ] 图片压缩和缩略图生成
- [ ] 实现搜索功能
- [ ] 实现消息通知功能
- [ ] 添加 API 文档（Swagger）
- [ ] 单元测试和集成测试

## License

MIT
