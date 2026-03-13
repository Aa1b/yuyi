require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// 导入路由
const authRoutes = require('./routes/auth');
const lifeRoutes = require('./routes/life');
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notification');
const homeRoutes = require('./routes/home');

// 导入中间件
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// 日志中间件
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP最多100次请求
  message: '请求过于频繁，请稍后再试',
});
app.use('/api/', limiter);

// 性能监控中间件
const { responseTimeMiddleware } = require('./utils/performance');
app.use(responseTimeMiddleware);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/life', lifeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/home', homeRoutes);

// 404 处理
app.use(notFound);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
