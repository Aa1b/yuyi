// 配置说明：
// isMock: true 使用Mock数据，false 使用真实API
// baseUrl: 后端API地址，isMock为false时生效

export default {
  isMock: false, // 使用真实API（已部署到服务器）
  baseUrl: 'http://149.104.29.197:3000/api', // 后端API地址（服务器IP:端口）
  // 注意：微信小程序需要在后台配置合法域名，如果使用IP需要在小程序后台配置
  // 建议：使用域名访问，例如：https://api.yourdomain.com/api
};
