/**
 * 获取评论列表
 * GET /life/comments?recordId=1&page=1&pageSize=10
 */
export default {
  path: '/life/comments',
  data: {
    code: 200,
    message: '获取成功',
    data: {
      list: [
        {
          id: 1,
          userId: 2,
          userName: '用户2',
          avatar: '/static/chat/avatar-Kingdom.png',
          content: '看起来很不错！',
          createdAt: '2024-01-15 15:00:00',
        },
        {
          id: 2,
          userId: 3,
          userName: '用户3',
          avatar: '/static/chat/avatar-Mollymolly.png',
          content: '我也想去野餐了😊',
          createdAt: '2024-01-15 16:20:00',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    },
  },
};
