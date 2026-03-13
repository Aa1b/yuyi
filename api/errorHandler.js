/**
 * API 错误处理工具
 */

/**
 * 处理API错误
 */
export function handleApiError(error, defaultMessage = '操作失败，请重试') {
  console.error('API错误:', error);
  
  let message = defaultMessage;
  
  if (error && error.data) {
    // 后端返回的错误
    if (error.data.message) {
      message = error.data.message;
    } else if (typeof error.data === 'string') {
      message = error.data;
    }
  } else if (error && error.errMsg) {
    // 微信API错误
    if (error.errMsg.includes('timeout')) {
      message = '请求超时，请检查网络';
    } else if (error.errMsg.includes('fail')) {
      message = '网络请求失败，请检查网络连接';
    } else {
      message = error.errMsg;
    }
  } else if (error && error.message) {
    message = error.message;
  }
  
  return message;
}

/**
 * 显示错误提示
 */
export function showError(message, context) {
  const Message = require('tdesign-miniprogram/message/index').default;
  Message.error({
    context,
    offset: [120, 32],
    duration: 3000,
    content: message,
  });
}

/**
 * 显示成功提示
 */
export function showSuccess(message, context) {
  const Message = require('tdesign-miniprogram/message/index').default;
  Message.success({
    context,
    offset: [120, 32],
    duration: 2000,
    content: message,
  });
}

/**
 * 显示警告提示
 */
export function showWarning(message, context) {
  const Message = require('tdesign-miniprogram/message/index').default;
  Message.warning({
    context,
    offset: [120, 32],
    duration: 2000,
    content: message,
  });
}
