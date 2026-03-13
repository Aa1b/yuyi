/**
 * 获取分类列表
 * GET /life/categories
 */
export default {
  path: '/life/categories',
  data: {
    code: 200,
    message: '获取成功',
    data: ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'],
  },
};
