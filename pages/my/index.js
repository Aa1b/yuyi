import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';
import { resolveAvatarDisplayUrl, DEFAULT_AVATAR_URL } from '~/utils/resolveMediaUrl';
import { getWesternZodiacFromBirth } from '~/utils/zodiac';
import { formatHomeRegionFromAddress } from '~/utils/profileRegion';

Page({
  behaviors: [useToastBehavior],

  data: {
    defaultAvatarUrl: DEFAULT_AVATAR_URL,
    isLoad: false,
    isLoggedIn: false,
    personalInfo: { image: DEFAULT_AVATAR_URL },
    userIp: '',
    isAdmin: false,
    gridList: [
      { name: '全部发布', icon: 'root-list', type: 'all', url: '' },
      { name: '审核中', icon: 'time', type: 'pending', url: '' },
      { name: '已发布', icon: 'upload', type: 'published', url: '' },
      { name: '草稿箱', icon: 'file-copy', type: 'draft', url: '' },
      { name: '内容审核', icon: 'search', type: 'reviewCenter', url: '' },
      { name: '系统管理', icon: 'setting', type: 'adminCenter', url: '' },
      { name: '管理看板', icon: 'chart', type: 'dataCenter', url: '' },
    ],

    settingList: [
      { name: '联系客服', icon: 'service', type: 'service' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  onLoad() {},

  onShow() {
    void this.refreshMyPage();
  },

  async refreshMyPage() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({
        isLoad: true,
        isLoggedIn: false,
        personalInfo: { image: DEFAULT_AVATAR_URL },
        userIp: '',
        isAdmin: false,
        settingList: [
          { name: '联系客服', icon: 'service', type: 'service' },
          { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
        ],
      });
      return;
    }

    const personalInfo = await this.getPersonalInfo();
    const isLoggedIn = !!(personalInfo && personalInfo.name);
    const isAdmin = !!(personalInfo && personalInfo.isAdmin);
    const userIp = (personalInfo && personalInfo.userIp) || '';

    let settingList = [
      { name: '联系客服', icon: 'service', type: 'service', url: '' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ];
    if (isLoggedIn) {
      settingList.push({ name: '退出登录', icon: 'logout', type: 'logout', url: '' });
    }

    this.setData({
      isLoad: true,
      personalInfo: personalInfo || {},
      isLoggedIn,
      isAdmin,
      userIp,
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
        image: resolveAvatarDisplayUrl(p != null ? p.avatar : ''),
        /** 由生日推算的星座（接口无 star 字段时仍可展示） */
        zodiac: getWesternZodiacFromBirth(p.birth),
        /** 资料里选择的省市（与顶部「当前城市」IP 归属不同） */
        homeCity: formatHomeRegionFromAddress(p.address),
        isAdmin: p.role === 'admin' || !!p.isAdmin || p.is_admin === 1,
        id: p.id,
        // 优先显示 IP 解析出的城市，无则不再显示
        userIp: p.cityFromIp || '',
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

    // 根据类型跳转到不同的记录列表视图（新版）
    if (type === 'all') {
      wx.navigateTo({ url: '/pages/my-life-records/index?filter=all' });
      return;
    }
    if (type === 'pending') {
      wx.navigateTo({ url: '/pages/my-life-records/index?filter=pending' });
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
    if (type === 'adminCenter') {
      wx.navigateTo({ url: '/pages/admin-center/index' });
      return;
    }
    if (type === 'dataCenter') {
      wx.navigateTo({ url: '/pages/dataCenter/index' });
      return;
    }

    this.onShowToast('#t-toast', item.name || '');
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
});
