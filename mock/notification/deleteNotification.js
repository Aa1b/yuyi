/**
 * 删除通知
 * DELETE /notification?id=1
 */
export default {
  path: '/notification',
  method: 'DELETE',
  data: {
    code: 200,
    message: '删除成功',
    data: null,
  },
};
