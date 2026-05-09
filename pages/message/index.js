// pages/message/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';
import { formatDateTime } from '~/utils/time';
import { resolveAvatarDisplayUrl, DEFAULT_AVATAR_URL } from '~/utils/resolveMediaUrl';

const VALID_TYPES = ['all', 'like', 'comment', 'follow', 'guestbook'];

Page({
  data: {
    defaultAvatarUrl: DEFAULT_AVATAR_URL,
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    selectedType: 'all',
    unreadCount: 0,
    needLogin: false,
    guestbookList: [],
    loadingGuestbook: false,
  },

  onLoad(options) {
    if (!this.hasToken()) {
      this.setNeedLogin();
      return;
    }
    const tab = options.tab || '';
    if (tab === 'guestbook') {
      this.setData({ selectedType: 'guestbook' });
      this.loadGuestbookConversations(true);
    } else {
      this.loadNotifications(true);
    }
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
        displayTime: formatDateTime(n.createdAt),
        // 与后端 notification 字段一致：fromUserAvatar（勿用 userAvatar，会拿不到图）
        fromUserAvatar: resolveAvatarDisplayUrl(n.fromUserAvatar),
      }));

      if (refresh) {
        this.setData({
          notifications: listWithTime,
          page: 1,
          hasMore: listWithTime.length < total,
          loading: false,
        });
        // 首次加载或下拉刷新时，自动将当前通知全部标记为已读，清空红点
        try {
          await request('/notification/read', 'POST', { id: 'all' });
          const cleared = (listWithTime || []).map((n) => ({ ...n, isRead: 1 }));
          this.setData({ notifications: cleared, unreadCount: 0 });
          const app = getApp();
          if (app && app.setUnreadNum) app.setUnreadNum(0);
        } catch (_) {
          // 静默失败，不影响列表展示
        }
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
    if (type === 'guestbook') {
      this.loadGuestbookConversations(true);
    } else {
      this.loadNotifications(true);
    }
  },

  async loadGuestbookConversations(refresh = false) {
    if (this.data.loadingGuestbook) return;
    if (!this.hasToken()) return;
    this.setData({ loadingGuestbook: true });
    try {
      const res = await request('/message/conversations?page=1&pageSize=50');
      const list = (res.data?.list ?? []).map((item) => ({
        ...item,
        displayTime: formatDateTime(item.lastTime),
        userAvatar: resolveAvatarDisplayUrl(item.userAvatar),
      }));
      this.setData({ guestbookList: list, loadingGuestbook: false });
    } catch (err) {
      this.setData({ loadingGuestbook: false });
      if (err && (err.code === 401 || (err.data && err.data.code === 401))) {
        this.setNeedLogin();
        return;
      }
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '加载失败，请重试' });
    }
  },

  onGuestbookConversationTap(e) {
    const { userId, name, avatar } = e.currentTarget.dataset;
    if (!userId) return;
    const q = `userId=${userId}&name=${encodeURIComponent(name || '')}&avatar=${encodeURIComponent(avatar || '')}`;
    wx.navigateTo({ url: `/pages/chat/index?${q}` });
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
    const { recordId, commentId, fromUserId } = e.currentTarget.dataset || {};
    if (recordId) {
      const q = commentId ? `&commentId=${commentId}` : '';
      wx.navigateTo({ url: `/pages/life-detail/index?id=${recordId}${q}` });
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
    if (this.data.selectedType === 'guestbook') {
      this.loadGuestbookConversations(true);
    } else {
      this.loadNotifications(true);
    }
    this.loadUnreadCount();
    setTimeout(() => wx.stopPullDownRefresh(), 500);
  },

  onReachBottom() {
    if (this.data.selectedType === 'guestbook') return;
    if (this.data.hasMore && !this.data.loading) this.loadNotifications();
  },
});
