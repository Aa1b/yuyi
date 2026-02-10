/**
 * 点赞
 * POST /life/like
 * body: { recordId }
 */
export default {
  path: '/life/like',
  method: 'POST',
  data: {
    code: 200,
    message: '点赞成功',
    data: {
      likeCount: 16,
    },
  },
};
