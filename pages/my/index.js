import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    service: [],
    personalInfo: {},
    userIp: '',
    isAdmin: false,
    gridList: [
      {
        name: '全部发布',
        icon: 'root-list',
        type: 'all',
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
      {
        name: '内容审核',
        icon: 'search',
        type: 'reviewCenter',
        url: '',
      },
    ],

    settingList: [
      { name: '联系客服', icon: 'service', type: 'service' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {
    this.getServiceList();
  },

  async onShow() {
    const Token = wx.getStorageSync('access_token');
    const personalInfo = await this.getPersonalInfo();

    if (Token) {
      this.setData({
        isLoad: true,
        personalInfo,
      });

      // 额外获取一次真实后端的用户信息，用于展示IP和角色
      try {
        const profileRes = await request('/auth/profile').then((res) => res.data);
        if (profileRes.code === 200 && profileRes.data) {
          this.setData({
            userIp: profileRes.data.ip || '',
            isAdmin: profileRes.data.role === 'admin',
          });
        }
      } catch (e) {
        // 忽略IP获取失败，不影响其他功能
      }
    }
  },

  getServiceList() {
    request('/api/getServiceList').then((res) => {
      const { service } = res.data.data;
      this.setData({ service });
    });
  },

  async getPersonalInfo() {
    const info = await request('/api/genPersonalInfo').then((res) => res.data.data);
    return info;
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
    const { type, url } = e.currentTarget.dataset.data;
    if (url) return;

    // 根据类型跳转到不同的记录列表视图
    if (type === 'all') {
      wx.navigateTo({ url: '/pages/my-life-records/index?filter=all' });
      return;
    }
    if (type === 'published') {
      wx.navigateTo({ url: '/pages/my-life-records/index?filter=published' });
      return;
    }
    if (type === 'draft') {
      wx.navigateTo({ url: '/pages/my-life-records/index?filter=draft' });
      return;
    }
    if (type === 'reviewCenter') {
      wx.navigateTo({ url: '/pages/review-center/index' });
      return;
    }

    // 其他类型暂时仍然使用 toast
    this.onShowToast('#t-toast', type);
  },
});
