// 配置说明：
// isMock: true 使用Mock数据，false 使用真实API
// baseUrl: 后端API地址，isMock为false时生效

export default {
  isMock: false, // 使用真实API（已部署到服务器）
  baseUrl: 'https://api.zaoqidawang.xin/api', // 后端API地址（使用域名，便于小程序配置合法域名）
  // 注意：微信小程序需要在后台配置合法域名，并确保该域名已备案且支持HTTPS
};
