import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    isLoggedIn: false,
    personalInfo: {},
    gridList: [
      {
        name: '全部发布',
        icon: 'root-list',
        type: 'all',
        url: '/pages/my-life-records/index?publishStatus=all',
      },
      {
        name: '审核中',
        icon: 'search',
        type: 'progress',
        url: '/pages/my-life-records/index?publishStatus=pending',
      },
      {
        name: '已发布',
        icon: 'upload',
        type: 'published',
        url: '/pages/my-life-records/index?publishStatus=published',
      },
      {
        name: '已驳回',
        icon: 'close-circle',
        type: 'rejected',
        url: '/pages/my-life-records/index?publishStatus=rejected',
      },
      {
        name: '草稿箱',
        icon: 'file-copy',
        type: 'draft',
        url: '/pages/my-life-records/index?publishStatus=draft',
      },
    ],

    settingList: [
      { name: '联系客服', icon: 'service', type: 'service', url: '' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
    isAdmin: false,
  },

  onLoad() {},

  async onShow() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({ isLoad: true, personalInfo: {}, isLoggedIn: false });
      return;
    }
    const personalInfo = await this.getPersonalInfo();
    const isAdmin = !!(personalInfo && personalInfo.isAdmin);
    let settingList = [
      { name: '联系客服', icon: 'service', type: 'service', url: '' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
      { name: '退出登录', icon: 'logout', type: 'logout', url: '' },
    ];
    if (isAdmin) {
      settingList = [
        { name: '审核管理', icon: 'check-circle', type: 'admin', url: '/pages/admin/review/index' },
        ...settingList,
      ];
    }
    this.setData({
      isLoad: true,
      personalInfo: personalInfo || {},
      isLoggedIn: !!(personalInfo && personalInfo.name),
      isAdmin,
      settingList,
    });
  },

  async getPersonalInfo() {
    try {
      const res = await request('/auth/profile');
      const p = res?.data;
      if (!p) return null;
      const base = {
        name: p.nickname || '用户',
        image: p.avatar || '',
        star: p.star || '',
        city: p.city || '',
        isAdmin: !!p.isAdmin,
        id: p.id,
      };
      if (!p.id) return base;
      try {
        const profileRes = await request(`/user/profile/${p.id}`);
        const profile = profileRes?.data;
        if (profile) {
          base.recordCount = profile.recordCount ?? 0;
          base.followingCount = profile.followingCount ?? 0;
          base.followerCount = profile.followerCount ?? 0;
          base.likeCount = profile.likeCount ?? 0;
        }
      } catch (_) {}
      return base;
    } catch (e) {
      return null;
    }
  },

  onLogin(e) {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  onNavigateTo() {
    wx.navigateTo({ url: `/pages/my/info-edit/index` });
  },

  onGoProfile() {
    const id = this.data.personalInfo?.id;
    if (id) wx.navigateTo({ url: `/pages/user-profile/index?userId=${id}` });
  },
  onGoFollowing() {
    wx.navigateTo({ url: '/pages/following/index?type=following' });
  },
  onGoFollowers() {
    wx.navigateTo({ url: '/pages/following/index?type=followers' });
  },

  onEleClick(e) {
    const item = e.currentTarget.dataset.data || {};
    const { url, type } = item;
    if (type === 'logout') {
      wx.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('access_token');
            wx.removeStorageSync('user_info');
            wx.reLaunch({ url: '/pages/login/login' });
          }
        },
      });
      return;
    }
    if (url) {
      wx.navigateTo({ url });
      return;
    }
    this.onShowToast('#t-toast', item.name || '');
  },
});
