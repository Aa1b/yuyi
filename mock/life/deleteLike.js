/**
 * 取消点赞
 * DELETE /life/like?recordId=1
 */
export default {
  path: '/life/like',
  method: 'DELETE',
  data: {
    code: 200,
    message: '取消点赞成功',
    data: {
      likeCount: 15,
    },
  },
};
