// pages/following/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    type: 'following', // following | followers
    userId: null, // 查看他人时传入
    list: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
  },
  
  onLoad(options) {
    const { type = 'following', userId } = options || {};
    this.setData({ type: type || 'following', userId: userId || null }, () => {
      this.loadList(true);
    });
  },
  
  async loadList(refresh = false) {
    if (this.data.loading) return;
    
    const { type, userId, page, pageSize } = this.data;
    const api = type === 'followers' ? '/user/followers' : '/user/following';
    const params = { page: refresh ? 1 : page, pageSize };
    if (userId) params.userId = userId;
    
    try {
      this.setData({ loading: true });
      
      const queryString = Object.keys(params)
        .map(k => `${k}=${encodeURIComponent(params[k])}`)
        .join('&');
      
      const res = await request(`${api}?${queryString}`);
      const { list = [], total = 0 } = res.data || {};
      
      if (refresh) {
        this.setData({
          list,
          page: 1,
          hasMore: list.length < total,
          loading: false,
        });
      } else {
        this.setData({
          list: [...this.data.list, ...list],
          page: page + 1,
          hasMore: this.data.list.length + list.length < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载列表失败', error);
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '加载失败，请重试' });
    }
  },
  
  async unfollow(e) {
    const uid = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userId;
    if (!uid) return;
    
    wx.showModal({
      title: '确认取消关注',
      content: '确定要取消关注该用户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request(`/user/follow?followingId=${uid}`, 'DELETE');
            const { list } = this.data;
            const next = list.filter(item => item.id != uid);
            this.setData({ list: next });
            Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已取消关注' });
          } catch (error) {
            Message.error({ context: this, offset: [120, 32], duration: 2000, content: '操作失败，请重试' });
          }
        }
      },
    });
  },

  async followUser(e) {
    const uid = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userId;
    if (!uid) return;
    try {
      await request('/user/follow', 'POST', { followingId: uid });
      const { list } = this.data;
      const idx = list.findIndex(item => item.id == uid);
      if (idx >= 0) {
        list[idx].isFollowing = true;
        this.setData({ list: [...list] });
      }
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '关注成功' });
    } catch (error) {
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '操作失败，请重试' });
    }
  },
  
  onTabChange(e) {
    const t = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.type;
    if (t && t !== this.data.type) {
      this.setData({ type: t, list: [], page: 1 }, () => this.loadList(true));
    }
  },

  goToUserProfile(e) {
    const uid = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.userId;
    if (uid) wx.navigateTo({ url: `/pages/user-profile/index?userId=${uid}` });
  },
  
  // 去发现（跳转到首页）
  goToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },
  
  onPullDownRefresh() {
    this.loadList(true).finally(() => wx.stopPullDownRefresh());
  },
  
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList();
  },
});
