import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';
import resolveMediaUrl from '~/utils/resolveMediaUrl';

Page({
  data: {
    userId: null,
    name: '留言',
    avatar: '',
    myAvatar: '',
    messages: [],
    input: '',
    anchor: 'bottom',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('user_info') || {};
    const userId = options.userId || '';
    const name = options.name || '留言';
    const avatar = options.avatar || '';
    if (!userId) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '缺少对方用户' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    const myAvatarRaw = userInfo.avatar || userInfo.image || '';
    this.setData({
      userId,
      name: decodeURIComponent(name || ''),
      avatar: resolveMediaUrl(decodeURIComponent(avatar || '')),
      myAvatar: resolveMediaUrl(myAvatarRaw),
    });
    this.loadUserAndConversation();
  },

  async loadUserAndConversation() {
    const { userId, name, avatar } = this.data;
    if (!avatar && userId) {
      try {
        const res = await request(`/user/profile/${userId}`);
        const u = res.data || {};
        this.setData({
          name: u.nickname || name || '留言',
          avatar: resolveMediaUrl(u.avatar || ''),
        });
      } catch (_) {}
    }
    this.loadConversation(true);
  },

  async loadConversation(refresh = false) {
    const { userId, page, pageSize, messages, loading } = this.data;
    if (loading || !userId) return;

    this.setData({ loading: true });
    const reqPage = refresh ? 1 : page;
    try {
      const res = await request(
        `/message/conversation?userId=${userId}&page=${reqPage}&pageSize=${pageSize}`
      );
      const { list = [], total } = res.data || {};
      const next = list.map((m) => ({
        id: m.id,
        content: m.content,
        time: m.createdAt ? new Date(m.createdAt).getTime() : 0,
        from: m.isFromMe ? 0 : 1,
        messageId: m.id,
        read: m.isRead,
      }));

      if (refresh) {
        this.setData({
          messages: next,
          page: 1,
          hasMore: next.length < total,
          loading: false,
        });
      } else {
        this.setData({
          messages: [...messages, ...next],
          page: reqPage + 1,
          hasMore: messages.length + next.length < total,
          loading: false,
        });
      }
      wx.nextTick(() => this.scrollToBottom());
    } catch (e) {
      this.setData({ loading: false });
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '加载失败，请重试' });
    }
  },

  handleInput(e) {
    this.setData({ input: (e.detail && e.detail.value) || '' });
  },

  async sendMessage() {
    const { userId, messages, input: content } = this.data;
    if (!content || !userId) return;

    this.setData({ input: '' });
    const temp = {
      messageId: null,
      from: 0,
      content,
      time: Date.now(),
      read: true,
    };
    this.setData({ messages: [...messages, temp] });
    wx.nextTick(() => this.scrollToBottom());

    try {
      const res = await request('/message/send', 'POST', { toUserId: userId, content: content.trim() });
      const d = res.data || {};
      const list = this.data.messages.slice();
      const idx = list.findIndex((m) => m.messageId === null && m.content === content);
      if (idx !== -1) {
        list[idx] = {
          id: d.id,
          messageId: d.id,
          content: d.content || content,
          time: d.createdAt ? new Date(d.createdAt).getTime() : Date.now(),
          from: 0,
          read: true,
        };
        this.setData({ messages: list });
      }
    } catch (e) {
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '发送失败，请重试' });
      const list = this.data.messages.filter((m) => !(m.messageId === null && m.content === content));
      this.setData({ messages: list, input: content });
    }
  },

  scrollToBottom() {
    this.setData({ anchor: 'bottom' });
  },
});
