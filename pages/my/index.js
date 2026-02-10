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
        url: '',
      },
      {
        name: '审核中',
        icon: 'search',
        type: 'progress',
        url: '',
      },
      {
        name: '已发布',
        icon: 'upload',
        type: 'published',
        url: '',
      },
      {
        name: '草稿箱',
        icon: 'file-copy',
        type: 'draft',
        url: '',
      },
    ],

    settingList: [
      { name: '联系客服', icon: 'service', type: 'service', url: '' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
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
    this.setData({
      isLoad: true,
      personalInfo: personalInfo || {},
      isLoggedIn: !!(personalInfo && personalInfo.name),
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
    const { name, url } = e.currentTarget.dataset.data;
    if (url) return;
    this.onShowToast('#t-toast', name);
  },
});
