/**
 * 删除生活记录
 * DELETE /life/record?id=1
 */
export default {
  path: '/life/record',
  method: 'DELETE',
  data: {
    code: 200,
    message: '删除成功',
    data: null,
  },
};
