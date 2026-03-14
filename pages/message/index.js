// pages/message/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

function formatNotifyTime(str) {
  if (!str) return '';
  const date = new Date(String(str).replace(/-/g, '/'));
  if (Number.isNaN(date.getTime())) return '';
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

const VALID_TYPES = ['all', 'like', 'comment', 'follow'];

Page({
  data: {
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    selectedType: 'all',
    unreadCount: 0,
    needLogin: false,
  },

  onLoad() {
    if (!this.hasToken()) {
      this.setNeedLogin();
      return;
    }
    this.loadNotifications(true);
    this.loadUnreadCount();
  },

  onShow() {
    if (!this.hasToken()) {
      this.setNeedLogin();
      return;
    }
    this.loadUnreadCount();
  },

  hasToken() {
    return !!wx.getStorageSync('access_token');
  },

  setNeedLogin() {
    this.setData({ needLogin: true, notifications: [], unreadCount: 0 });
    const app = getApp();
    if (app && app.setUnreadNum) app.setUnreadNum(0);
  },

  async loadNotifications(refresh = false) {
    if (this.data.loading) return;
    if (!this.hasToken()) {
      this.setNeedLogin();
      return;
    }

    const type = VALID_TYPES.includes(this.data.selectedType) ? this.data.selectedType : 'all';
    const page = refresh ? 1 : this.data.page;
    const pageSize = this.data.pageSize;

    this.setData({ loading: true, needLogin: false });

    try {
      const res = await request(
        `/notification/list?page=${page}&pageSize=${pageSize}&type=${encodeURIComponent(type)}`
      );
      const list = res.data?.list ?? [];
      const total = Number(res.data?.total) || 0;
      const listWithTime = list.map((n) => ({
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
    } catch (err) {
      this.setData({ loading: false });
      if (err.statusCode === 401 || err.code === 401) {
        this.setNeedLogin();
        return;
      }
      if ((err.statusCode === 500 || err.code === 500) && type !== 'all') {
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 3000,
          content: '当前筛选加载失败，已切换为全部',
        });
        this.setData({ selectedType: 'all', page: 1 });
        this.loadNotifications(true);
        return;
      }
      const tip = (err.statusCode === 500 || err.code === 500) && (err.detail || err.message)
        ? `${err.message || '加载失败'}：${err.detail}`
        : '加载失败，请重试';
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 3000,
        content: tip,
      });
    }
  },

  async loadUnreadCount() {
    if (!this.hasToken()) return;
    try {
      const res = await request('/notification/unread-count');
      const count = res.data?.count ?? 0;
      this.setData({ unreadCount: count, needLogin: false });
      const app = getApp();
      if (app && app.setUnreadNum) app.setUnreadNum(count);
    } catch (err) {
      if (err.statusCode === 401 || err.code === 401) {
        this.setData({ unreadCount: 0 });
        const app = getApp();
        if (app && app.setUnreadNum) app.setUnreadNum(0);
      }
    }
  },

  onTypeChange(e) {
    const value = e.detail?.value ?? e.detail;
    const type = VALID_TYPES.includes(value) ? value : 'all';
    if (!this.hasToken()) {
      this.setNeedLogin();
      return;
    }
    this.setData({ selectedType: type, notifications: [], page: 1 });
    this.loadNotifications(true);
  },

  async markAsRead(e) {
    const id = e.currentTarget.dataset?.id;
    if (id == null) return;
    try {
      await request('/notification/read', 'POST', { id });
      const { notifications } = this.data;
      const idx = notifications.findIndex((n) => String(n.id) === String(id));
      if (idx > -1) {
        const next = [...notifications];
        next[idx] = { ...next[idx], isRead: 1 };
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
      const next = (this.data.notifications || []).map((n) => ({ ...n, isRead: 1 }));
      this.setData({ notifications: next, unreadCount: 0 });
      const app = getApp();
      if (app && app.setUnreadNum) app.setUnreadNum(0);
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '已全部标记为已读',
      });
    } catch (err) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '操作失败，请重试',
      });
    }
  },

  deleteNotification(e) {
    const id = e.currentTarget.dataset?.id;
    if (id == null) return;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request(`/notification?id=${id}`, 'DELETE');
          const { notifications } = this.data;
          const idx = notifications.findIndex((n) => String(n.id) === String(id));
          if (idx > -1) {
            const next = notifications.slice(0, idx).concat(notifications.slice(idx + 1));
            this.setData({ notifications: next });
          }
        } catch (err) {
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

  goToDetail(e) {
    const { recordId, fromUserId } = e.currentTarget.dataset || {};
    if (recordId) {
      wx.navigateTo({ url: `/pages/life-detail/index?id=${recordId}` });
      return;
    }
    if (fromUserId) {
      wx.navigateTo({ url: `/pages/user-profile/index?userId=${fromUserId}` });
    }
  },

  goToUserProfile(e) {
    const userId = e.currentTarget.dataset?.userId;
    if (userId) wx.navigateTo({ url: `/pages/user-profile/index?userId=${userId}` });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onPullDownRefresh() {
    if (!this.hasToken()) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadNotifications(true);
    this.loadUnreadCount();
    setTimeout(() => wx.stopPullDownRefresh(), 500);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadNotifications();
  },
});
