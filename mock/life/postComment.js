/**
 * 发表评论
 * POST /life/comment
 * body: { recordId, content }
 */
export default {
  path: '/life/comment',
  method: 'POST',
  data: {
    code: 200,
    message: '评论成功',
    data: {
      id: 4,
      userId: 1,
      userName: '当前用户',
      avatar: '/static/chat/avatar.png',
      content: '谢谢大家的支持！',
      createdAt: new Date().toISOString(),
    },
  },
};
