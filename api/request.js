import config from '~/config';

const { baseUrl } = config;
const delay = config.isMock ? 500 : 0;

function request(url, method = 'GET', data = {}) {
  const header = {
    'content-type': 'application/json',
    // 有其他content-type需求加点逻辑判断处理即可
  };
  
  // 获取token，有就丢进请求头
  const tokenString = wx.getStorageSync('access_token');
  if (tokenString) {
    header.Authorization = `Bearer ${tokenString}`;
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      dataType: 'json',
      header,
      timeout: 10000, // 10秒超时
      success(res) {
        setTimeout(() => {
          // 检查HTTP状态码
          if (res.statusCode === 200) {
            // 检查业务状态码
            if (res.data && res.data.code === 200) {
              resolve(res.data);
            } else {
              // 业务错误
              reject({
                ...res.data,
                statusCode: res.statusCode,
              });
            }
          } else {
            // HTTP错误
            reject({
              code: res.statusCode,
              message: `请求失败 (${res.statusCode})`,
              data: res.data,
              statusCode: res.statusCode,
            });
          }
        }, delay);
      },
      fail(err) {
        setTimeout(() => {
          // 网络错误或其他错误
          let errorMessage = '网络请求失败';
          
          if (err.errMsg) {
            if (err.errMsg.includes('timeout')) {
              errorMessage = '请求超时，请检查网络';
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '网络连接失败，请检查网络设置';
            } else {
              errorMessage = err.errMsg;
            }
          }
          
          reject({
            code: -1,
            message: errorMessage,
            errMsg: err.errMsg,
            error: err,
          });
        }, delay);
      },
    });
  });
}

// 导出请求和服务地址
export default request;
