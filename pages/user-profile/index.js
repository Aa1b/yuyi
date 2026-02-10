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
    
    this.setData({ userId });
    this.loadUserProfile();
    this.loadUserRecords(true);
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
      this.setData({
        userInfo,
        isFollowing: userInfo.isFollowing || false,
        isSelf: userInfo.isSelf || false,
        loading: false,
      });
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
  
  // 加载用户的记录
  async loadUserRecords(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { userId, page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        userId,
        privacy: 'all', // 显示所有公开和好友可见的记录
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
  
  // 查看记录（跳转到我的记录页面）
  viewRecords() {
    if (this.data.isSelf) {
      wx.switchTab({
        url: '/pages/my/index',
      });
    }
  },
  
  // 查看粉丝列表
  viewFollowers() {
    // TODO: 实现粉丝列表页面
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
  
  // 查看关注列表
  viewFollowing() {
    wx.navigateTo({
      url: '/pages/following/index',
    });
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserProfile();
    this.loadUserRecords(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadUserRecords();
    }
  },
});
