/**
 * 获取标签列表（热门标签）
 * GET /life/tags
 */
export default {
  path: '/life/tags',
  data: {
    code: 200,
    message: '获取成功',
    data: [
      { name: '户外', count: 45 },
      { name: '朋友', count: 38 },
      { name: '旅行', count: 32 },
      { name: '美食', count: 28 },
      { name: '自然', count: 25 },
      { name: '风景', count: 22 },
      { name: '心情', count: 20 },
      { name: '日记', count: 18 },
      { name: '运动', count: 15 },
      { name: '学习', count: 12 },
    ],
  },
};
