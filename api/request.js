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
          // 2xx 视为 HTTP 成功（含 200 OK、201 Created）
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            if (res.data && res.data.code === 200) {
              resolve(res.data);
            } else {
              reject({
                ...res.data,
                statusCode: res.statusCode,
              });
            }
          } else {
            reject({
              code: res.statusCode,
              message: res.data?.message || `请求失败 (${res.statusCode})`,
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
