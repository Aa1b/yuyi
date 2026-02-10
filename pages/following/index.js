// pages/following/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    followingList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
  },
  
  onLoad() {
    this.loadFollowingList(true);
  },
  
  // 加载关注列表
  async loadFollowingList(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/user/following?${queryString}`);
      const { list = [], total = 0 } = res.data || {};
      
      if (refresh) {
        this.setData({
          followingList: list,
          page: 1,
          hasMore: list.length < total,
          loading: false,
        });
      } else {
        this.setData({
          followingList: [...this.data.followingList, ...list],
          page: page + 1,
          hasMore: this.data.followingList.length + list.length < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载关注列表失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
    }
  },
  
  // 取消关注
  async unfollow(e) {
    const { userId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认取消关注',
      content: '确定要取消关注该用户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request(`/user/follow?followingId=${userId}`, 'DELETE');
            
            // 从列表中移除
            const { followingList } = this.data;
            const index = followingList.findIndex(item => item.id === userId);
            if (index > -1) {
              followingList.splice(index, 1);
              this.setData({
                followingList: [...followingList],
              });
            }
            
            Message.success({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '已取消关注',
            });
          } catch (error) {
            Message.error({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '操作失败，请重试',
            });
          }
        }
      },
    });
  },
  
  // 跳转到用户主页
  goToUserProfile(e) {
    const { userId } = e.currentTarget.dataset;
    if (userId) {
      wx.navigateTo({
        url: `/pages/user-profile/index?userId=${userId}`,
      });
    }
  },
  
  // 去发现（跳转到首页）
  goToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadFollowingList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadFollowingList();
    }
  },
});
