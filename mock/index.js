import Mock from './WxMock';
// 导入包含path和data的对象
import loginMock from './login/index';
import homeMock from './home/index';
import searchMock from './search/index';
import dataCenter from './dataCenter/index';
import my from './my/index';
import lifeMock from './life/index';
import notificationMock from './notification/index';

export default () => {
  // 在这里添加新的mock数据
  const mockData = [...loginMock, ...homeMock, ...searchMock, ...dataCenter, ...my, ...lifeMock, ...notificationMock];
  mockData.forEach((item) => {
    const method = item.method || 'GET';
    const path = item.path;
    
    // 如果data是函数，直接使用；否则包装为对象
    let mockTemplate;
    if (typeof item.data === 'function') {
      mockTemplate = item.data;
    } else {
      mockTemplate = { code: 200, success: true, data: item.data };
    }
    
    // 注册URL+方法的组合key
    const mockKey = `${path}|${method.toUpperCase()}`;
    Mock.mock(mockKey, mockTemplate);
    
    // 同时也注册仅URL的key，以便GET请求可以匹配
    if (method === 'GET') {
      Mock.mock(path, mockTemplate);
    }
  });
};
