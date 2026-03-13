// pages/message/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    notifications: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    selectedType: 'all', // all | like | comment | follow
    unreadCount: 0,
  },
  
  onLoad() {
    this.loadNotifications(true);
    this.loadUnreadCount();
  },
  
  onShow() {
    // 每次显示时刷新未读数量
    this.loadUnreadCount();
  },
  
  // 加载通知列表
  async loadNotifications(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
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
      
      if (refresh) {
        this.setData({
          notifications: list,
          page: 1,
          hasMore: list.length < total,
          loading: false,
        });
      } else {
        this.setData({
          notifications: [...this.data.notifications, ...list],
          page: page + 1,
          hasMore: this.data.notifications.length + list.length < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载通知失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
    }
  },
  
  // 加载未读数量
  async loadUnreadCount() {
    try {
      const res = await request('/notification/unread-count');
      this.setData({
        unreadCount: res.data?.count || 0,
      });
      
      // 更新全局未读数量
      const app = getApp();
      if (app.setUnreadNum) {
        app.setUnreadNum(res.data?.count || 0);
      }
    } catch (error) {
      console.error('加载未读数量失败', error);
    }
  },
  
  // 类型筛选
  onTypeChange(e) {
    const { value } = e.detail;
    this.setData({
      selectedType: value,
      notifications: [],
      page: 1,
    });
    this.loadNotifications(true);
  },
  
  // 标记为已读
  async markAsRead(e) {
    const { id } = e.currentTarget.dataset;
    
    try {
      await request('/notification/read', 'POST', { id });
      
      // 更新本地状态
      const { notifications } = this.data;
      const index = notifications.findIndex(n => n.id === id);
      if (index > -1) {
        notifications[index].isRead = 1;
        this.setData({
          notifications: [...notifications],
          unreadCount: Math.max(0, this.data.unreadCount - 1),
        });
      }
      
      // 更新全局未读数量
      const app = getApp();
      if (app.setUnreadNum) {
        app.setUnreadNum(this.data.unreadCount);
      }
    } catch (error) {
      console.error('标记已读失败', error);
    }
  },
  
  // 标记全部为已读
  async markAllAsRead() {
    try {
      await request('/notification/read', 'POST', { id: 'all' });
      
      // 更新本地状态
      const { notifications } = this.data;
      notifications.forEach(n => {
        n.isRead = 1;
      });
      
      this.setData({
        notifications: [...notifications],
        unreadCount: 0,
      });
      
      // 更新全局未读数量
      const app = getApp();
      if (app.setUnreadNum) {
        app.setUnreadNum(0);
      }
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '已全部标记为已读',
      });
    } catch (error) {
      console.error('标记全部已读失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '操作失败，请重试',
      });
    }
  },
  
  // 删除通知
  async deleteNotification(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request(`/notification?id=${id}`, 'DELETE');
            
            // 从列表中移除
            const { notifications } = this.data;
            const index = notifications.findIndex(n => n.id === id);
            if (index > -1) {
              notifications.splice(index, 1);
              this.setData({
                notifications: [...notifications],
              });
            }
          } catch (error) {
            Message.error({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '删除失败，请重试',
            });
          }
        }
      },
    });
  },
  
  // 跳转到详情
  goToDetail(e) {
    const { recordId } = e.currentTarget.dataset;
    if (recordId) {
      wx.navigateTo({
        url: `/pages/life-detail/index?id=${recordId}`,
      });
    }
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
