/* eslint-disable */
var __request = wx.request;
var Mock = require('./mock.js');
Object.defineProperty(wx, 'request', { writable: true });
wx.request = function (config) {
  // 处理URL，去除baseUrl和查询参数
  var url = config.url || '';
  // 分离URL和查询参数
  var urlParts = url.split('?');
  var baseUrl = urlParts[0];
  
  // 构建mock key，包含URL和方法
  var method = (config.method || 'GET').toUpperCase();
  var mockKey = baseUrl + '|' + method;
  var urlMockKey = baseUrl;
  
  // 优先匹配 URL+方法，再匹配仅URL（用于GET请求）
  var mockedData = Mock._mocked[mockKey] || Mock._mocked[urlMockKey];
  
  if (typeof mockedData == 'undefined') {
    __request(config);
    return;
  }
  
  var resTemplate = mockedData.template;
  var response;
  
  // 如果template是函数，传入config调用；否则使用Mock.mock
  if (typeof resTemplate === 'function') {
    response = resTemplate(config);
  } else {
    response = Mock.mock(resTemplate);
  }
  
  // 模拟延迟
  setTimeout(function() {
    if (typeof config.success == 'function') {
      config.success(response);
    }
    if (typeof config.complete == 'function') {
      config.complete(response);
    }
  }, 300);
};
module.exports = Mock;
