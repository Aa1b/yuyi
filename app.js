// app.js
import config from './config';
import createBus from './utils/eventBus';

// Mock 勿顶层 import，否则会整套打进主包；仅 isMock 时再加载
if (config.isMock) {
  require('./mock/index')();
}

App({
  onLaunch() {
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      // console.log(res.hasUpdate)
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });

    this.getUnreadNum();
    this.connect();
  },
  globalData: {
    userInfo: null,
    unreadNum: 0, // 未读消息数量
    socket: null, // SocketTask 对象
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  /** 初始化WebSocket */
  connect() {
    if (!config.isMock) {
      return;
    }
    const { connectSocket } = require('./mock/chat');
    const socket = connectSocket();
    socket.onMessage((data) => {
      data = JSON.parse(data);
      if (data.type === 'message' && !data.data.message.read) this.setUnreadNum(this.globalData.unreadNum + 1);
    });
    this.globalData.socket = socket;
  },

  /** 获取未读消息数量（仅在有 token 时请求后端，否则为 0） */
  getUnreadNum() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.globalData.unreadNum = 0;
      this.eventBus.emit('unread-num-change', 0);
      return;
    }
    const request = require('./api/request').default;
    request('/notification/unread-count')
      .then((res) => {
        const count = res.data?.count ?? 0;
        this.globalData.unreadNum = count;
        this.eventBus.emit('unread-num-change', count);
      })
      .catch(() => {
        this.globalData.unreadNum = 0;
        this.eventBus.emit('unread-num-change', 0);
      });
  },

  /** 设置未读消息数量 */
  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },
});
