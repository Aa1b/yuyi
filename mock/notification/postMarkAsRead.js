/**
 * 标记通知为已读
 * POST /notification/read
 * body: { id: 1 } 或 { id: 'all' }
 */
export default {
  path: '/notification/read',
  method: 'POST',
  data: {
    code: 200,
    message: '标记成功',
    data: null,
  },
};
