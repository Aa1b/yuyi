// 配置说明：
// isMock: true 使用Mock数据，false 使用真实API
// baseUrl: 后端 API（须 HTTPS，并在小程序后台配置 request 合法域名）
// publicBaseUrl: 图片/视频等静态资源根地址（不含 /api），与 Nginx 上 uploads 或反代一致；不填则从 baseUrl 自动去掉 /api

export default {
  isMock: false,
  baseUrl: 'https://api.zaoqidawang.xin/api',
  publicBaseUrl: 'https://api.zaoqidawang.xin',
};
