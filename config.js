// 配置说明：
// isMock: true 使用Mock数据，false 使用真实API
// baseUrl: 后端API地址，isMock为false时生效（必须为 https，小程序要求）

export default {
  isMock: false,
  baseUrl: 'https://api.zaoqidawang.xin/api', // 后端API（HTTPS域名，需在小程序后台配置 request 合法域名）
};
