const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

// 小程序环境：静态资源直接返回路径，不复制（避免 copyFileSync 在部分环境报错）
const getLocalUrl = (path, name) => {
  if (typeof wx === 'undefined') return path;
  if (!path || path.startsWith('/static') || path.startsWith('http')) return path;
  try {
    const fs = wx.getFileSystemManager();
    const tempFileName = `${wx.env.USER_DATA_PATH}/${name || 'temp'}`;
    fs.copyFileSync(path, tempFileName);
    return tempFileName;
  } catch (e) {
    return path;
  }
};

module.exports = {
  formatTime,
  getLocalUrl,
};
