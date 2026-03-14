// pages/message/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

/** 将接口返回的时间格式化为相对时间展示 */
function formatNotifyTime(str) {
  if (!str) return '';
  const date = new Date(str.replace(/-/g, '/'));
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 172800) return '昨天';
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

Page({
  data: {
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    selectedType: 'all', // all | like | comment | follow
    unreadCount: 0,
    needLogin: false, // 401 时 true，展示“请先登录”
  },

  onLoad() {
    this.loadNotifications(true);
    this.loadUnreadCount();
  },

  onShow() {
    this.loadUnreadCount();
  },

  async loadNotifications(refresh = false) {
    if (this.data.loading) return;

    try {
      this.setData({ loading: true, needLogin: false });

      const { selectedType, page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        type: selectedType,
      };

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const res = await request(`/notification/list?${queryString}`);
      const { list = [], total = 0 } = res.data || {};
      const listWithTime = (list || []).map((n) => ({
        ...n,
        displayTime: formatNotifyTime(n.createdAt),
      }));

      if (refresh) {
        this.setData({
          notifications: listWithTime,
          page: 1,
          hasMore: listWithTime.length < total,
          loading: false,
        });
      } else {
        this.setData({
          notifications: [...this.data.notifications, ...listWithTime],
          page: page + 1,
          hasMore: this.data.notifications.length + listWithTime.length < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      const is401 = error.statusCode === 401 || error.code === 401;
      if (is401) {
        this.setData({
          needLogin: true,
          notifications: [],
          unreadCount: 0,
        });
        const app = getApp();
        if (app && app.setUnreadNum) app.setUnreadNum(0);
        return;
      }
      const is500 = error.statusCode === 500 || error.code === 500;
      const tip = is500 && (error.detail || error.message) ? `${error.message || '加载失败'}：${error.detail}` : '加载失败，请重试';
      console.error('加载通知失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: is500 ? 4000 : 2000,
        content: tip,
      });
    }
  },

  async loadUnreadCount() {
    try {
      const res = await request('/notification/unread-count');
      const count = res.data?.count ?? 0;
      this.setData({ unreadCount: count, needLogin: false });
      const app = getApp();
      if (app && app.setUnreadNum) app.setUnreadNum(count);
    } catch (error) {
      const is401 = error.statusCode === 401 || error.code === 401;
      if (is401) {
        this.setData({ unreadCount: 0 });
        if (getApp().setUnreadNum) getApp().setUnreadNum(0);
      }
    }
  },

  onTypeChange(e) {
    const value = (e.detail && e.detail.value) !== undefined ? e.detail.value : e.detail;
    this.setData({
      selectedType: value || 'all',
      notifications: [],
      page: 1,
    });
    this.loadNotifications(true);
  },
  
  async markAsRead(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    try {
      await request('/notification/read', 'POST', { id });
      const { notifications } = this.data;
      const index = notifications.findIndex((n) => n.id === id || n.id === Number(id));
      if (index > -1) {
        const next = [...notifications];
        next[index] = { ...next[index], isRead: 1 };
        const unread = Math.max(0, this.data.unreadCount - 1);
        this.setData({ notifications: next, unreadCount: unread });
        const app = getApp();
        if (app && app.setUnreadNum) app.setUnreadNum(unread);
      }
    } catch (err) {
      console.error('标记已读失败', err);
    }
  },

  async markAllAsRead() {
    try {
      await request('/notification/read', 'POST', { id: 'all' });
      const { notifications } = this.data;
      const next = notifications.map((n) => ({ ...n, isRead: 1 }));
      this.setData({ notifications: next, unreadCount: 0 });
      const app = getApp();
      if (app && app.setUnreadNum) app.setUnreadNum(0);
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '已全部标记为已读',
      });
    } catch (error) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '操作失败，请重试',
      });
    }
  },

  deleteNotification(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request(`/notification?id=${id}`, 'DELETE');
          const { notifications } = this.data;
          const index = notifications.findIndex((n) => n.id === id || n.id === Number(id));
          if (index > -1) {
            const next = notifications.slice(0, index).concat(notifications.slice(index + 1));
            this.setData({ notifications: next });
          }
        } catch (error) {
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: '删除失败，请重试',
          });
        }
      },
    });
  },

  /** 点击整条通知：有 recordId 跳详情，否则跳发件人主页 */
  goToDetail(e) {
    const { recordId, fromUserId } = e.currentTarget.dataset;
    if (recordId) {
      wx.navigateTo({ url: `/pages/life-detail/index?id=${recordId}` });
      return;
    }
    if (fromUserId) {
      wx.navigateTo({ url: `/pages/user-profile/index?userId=${fromUserId}` });
    }
  },

  goToUserProfile(e) {
    const { userId } = e.currentTarget.dataset;
    if (userId) {
      wx.navigateTo({ url: `/pages/user-profile/index?userId=${userId}` });
    }
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNotifications(true);
    this.loadUnreadCount();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNotifications();
    }
  },
});
