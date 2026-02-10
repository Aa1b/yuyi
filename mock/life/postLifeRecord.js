/**
 * 发布生活记录
 * POST /life/record
 * body: { content, images, video, privacy, category, tags, location }
 */
export default {
  path: '/life/record',
  method: 'POST',
  data: {
    code: 200,
    message: '发布成功',
    data: {
      id: 5,
      createdAt: new Date().toISOString(),
    },
  },
};
