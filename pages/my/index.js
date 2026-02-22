import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    isLoggedIn: false,
    service: [],
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

  onLoad() {
    this.getServiceList();
  },

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
    ];
    if (isAdmin) {
      settingList = [
        { name: '审核管理', icon: 'approval', type: 'admin', url: '/pages/admin/review/index' },
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

  getServiceList() {
    request('/api/getServiceList').then((res) => {
      const raw = res?.data ?? [];
      const list = Array.isArray(raw) ? raw : (raw.service ?? []);
      const service = list.map(item => ({ ...item, url: item.url != null ? String(item.url) : '' }));
      this.setData({ service });
    }).catch(() => {});
  },

  async getPersonalInfo() {
    try {
      const res = await request('/auth/profile');
      const p = res?.data;
      if (!p) return null;
      return {
        name: p.nickname || '用户',
        image: p.avatar || '',
        star: p.star || '',
        city: p.city || '',
        isAdmin: !!p.isAdmin,
      };
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

  onEleClick(e) {
    const item = e.currentTarget.dataset.data || {};
    const { url } = item;
    if (url) {
      wx.navigateTo({ url });
      return;
    }
    this.onShowToast('#t-toast', item.name || '');
  },
});
