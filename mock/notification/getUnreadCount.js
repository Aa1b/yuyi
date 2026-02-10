/**
 * 获取未读通知数量
 * GET /notification/unread-count
 */
export default {
  path: '/notification/unread-count',
  data: {
    code: 200,
    message: '获取成功',
    data: {
      count: 2,
    },
  },
};
