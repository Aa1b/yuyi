require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// 经 Nginx/Caddy 等反向代理时务必设为 TRUST_PROXY=1，否则 req.ip 可能是代理地址，
// 所有用户会共用同一条限流计数，极易在短时间内触发 429。
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// 导入路由
const authRoutes = require('./routes/auth');
const lifeRoutes = require('./routes/life');
const userRoutes = require('./routes/user');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notification');
const homeRoutes = require('./routes/home');
const statsRoutes = require('./routes/stats');
const messageRoutes = require('./routes/message');
const adminRoutes = require('./routes/admin');

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

// 速率限制（可通过环境变量调整；生产若前有代理务必配合 TRUST_PROXY=1）
const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
const rateLimitMax = Math.max(1, parseInt(process.env.RATE_LIMIT_MAX || '800', 10));
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  max: rateLimitMax,
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
});
app.use('/api/', limiter);

// 性能监控中间件
const { responseTimeMiddleware } = require('./utils/performance');
app.use(responseTimeMiddleware);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/life', lifeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/admin', adminRoutes);

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
