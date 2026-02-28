// pages/user-profile/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    userId: null,
    userInfo: null,
    records: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    isFollowing: false,
    isSelf: false,
    activeTab: 'records', // records | liked（仅本人）
    likedRecords: [],
    loadingLiked: false,
    hasMoreLiked: true,
    pageLiked: 1,
  },
  
  onLoad(options) {
    const { userId } = options;
    if (!userId) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '缺少用户ID',
      });
      wx.navigateBack();
      return;
    }
    
    this.setData({ userId }, () => {
      this.loadUserProfile();
      this.loadUserRecords(true);
    });
  },
  
  // 加载用户信息
  async loadUserProfile() {
    try {
      this.setData({ loading: true });
      const res = await request(`/user/profile/${this.data.userId}`);
      const userInfo = res?.data ?? null;
      if (!userInfo) {
        this.setData({ loading: false });
        return;
      }
      const isSelf = userInfo.isSelf || false;
      this.setData({
        userInfo,
        isFollowing: userInfo.isFollowing || false,
        isSelf,
        loading: false,
      });
      if (isSelf) this.loadLikedRecords(true);
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载用户信息失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
      wx.navigateBack();
    }
  },
  
  // 加载用户的记录（与 loadUserProfile 并行时也会执行，不因 loading 为 true 而跳过）
  async loadUserRecords(refresh = false) {
    const { userId, page, pageSize } = this.data;
    if (!userId) return;
    
    try {
      this.setData({ loading: true });
      
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        userId: String(userId),
        privacy: 'all', // 显示该用户公开及（若已关注）好友可见的记录
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/list?${queryString}`);
      const data = res?.data ?? {};
      const list = data.list ?? [];
      const total = data.total ?? 0;
      
      if (refresh) {
        this.setData({
          records: list,
          page: 1,
          hasMore: list.length < total,
          loading: false,
        });
      } else {
        this.setData({
          records: [...this.data.records, ...list],
          page: page + 1,
          hasMore: this.data.records.length + list.length < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载用户记录失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
    }
  },
  
  // 关注/取消关注
  async toggleFollow() {
    const { isFollowing, userId, isSelf } = this.data;
    
    if (isSelf) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '不能关注自己',
      });
      return;
    }
    
    try {
      if (isFollowing) {
        // 取消关注
        await request(`/user/follow?followingId=${userId}`, 'DELETE');
        this.setData({
          isFollowing: false,
        });
        Message.success({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '已取消关注',
        });
      } else {
        // 关注
        await request('/user/follow', 'POST', { followingId: userId });
        this.setData({
          isFollowing: true,
        });
        Message.success({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '关注成功',
        });
      }
      
      // 更新用户信息中的粉丝数
      if (this.data.userInfo) {
        const followerCount = this.data.userInfo.followerCount || 0;
        this.setData({
          'userInfo.followerCount': isFollowing ? followerCount - 1 : followerCount + 1,
        });
      }
    } catch (error) {
      console.error('操作失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '操作失败，请重试',
      });
    }
  },
  
  // 查看详情
  viewDetail(e) {
    let id = null;
    if (e.detail && e.detail.record) {
      id = e.detail.record.id;
    } else if (e.currentTarget && e.currentTarget.dataset) {
      id = e.currentTarget.dataset.id;
    }
    
    if (id) {
      wx.navigateTo({
        url: `/pages/life-detail/index?id=${id}`,
      });
    }
  },
  
  viewRecords() {
    if (this.data.isSelf) {
      wx.switchTab({ url: '/pages/my/index' });
    }
  },

  viewFollowers() {
    const { userId, isSelf } = this.data;
    const url = isSelf
      ? '/pages/following/index?type=followers'
      : `/pages/following/index?type=followers&userId=${userId}`;
    wx.navigateTo({ url });
  },

  viewFollowing() {
    const { userId, isSelf } = this.data;
    const url = isSelf
      ? '/pages/following/index?type=following'
      : `/pages/following/index?type=following&userId=${userId}`;
    wx.navigateTo({ url });
  },

  onTabChange(e) {
    const tab = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab;
    if (!tab || (tab !== 'records' && tab !== 'liked')) return;
    this.setData({ activeTab: tab });
    if (tab === 'liked') this.loadLikedRecords(true);
  },

  async loadLikedRecords(refresh = false) {
    if (!this.data.isSelf) return;
    const { pageLiked, pageSize } = this.data;
    if (this.data.loadingLiked) return;

    try {
      this.setData({ loadingLiked: true });
      const page = refresh ? 1 : pageLiked;
      const res = await request(`/life/liked?page=${page}&pageSize=${pageSize || 10}`);
      const data = res?.data ?? {};
      const list = data.list ?? [];
      const total = data.total ?? 0;

      if (refresh) {
        this.setData({
          likedRecords: list,
          pageLiked: 1,
          hasMoreLiked: list.length < total,
          loadingLiked: false,
        });
      } else {
        this.setData({
          likedRecords: [...this.data.likedRecords, ...list],
          pageLiked: page + 1,
          hasMoreLiked: this.data.likedRecords.length + list.length < total,
          loadingLiked: false,
        });
      }
    } catch (err) {
      this.setData({ loadingLiked: false });
      console.error('加载我赞过的失败', err);
    }
  },
  
  async onPullDownRefresh() {
    await this.loadUserProfile();
    await this.loadUserRecords(true);
    if (this.data.isSelf) await this.loadLikedRecords(true);
    wx.stopPullDownRefresh();
  },
  
  onReachBottom() {
    const { activeTab, hasMore, hasMoreLiked, loading, loadingLiked, isSelf } = this.data;
    if (activeTab === 'liked' && isSelf && hasMoreLiked && !loadingLiked) {
      this.loadLikedRecords();
    } else if (hasMore && !loading) {
      this.loadUserRecords();
    }
  },
});
