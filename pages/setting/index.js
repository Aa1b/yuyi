import useToastBehavior from '~/behaviors/useToast';
import { SETTING_KEYS, getSetting, setSetting } from '~/utils/settings';
import { DEFAULT_PRIVACY_OPTIONS } from '~/utils/privacyLabels';

Page({
  behaviors: [useToastBehavior],

  data: {
    defaultPrivacy: 'public',
    defaultPrivacyLabel: '公开',
  },

  onLoad() {
    this.loadSettings();
  },

  onShow() {
    this.loadSettings();
  },

  loadSettings() {
    const defaultPrivacy = getSetting(SETTING_KEYS.DEFAULT_PRIVACY);
    const defaultPrivacyLabel = (PRIVACY_OPTIONS.find((o) => o.value === defaultPrivacy) || PRIVACY_OPTIONS[0]).label;
    this.setData({ defaultPrivacy, defaultPrivacyLabel });
  },

  onPrivacyTap() {
    const options = DEFAULT_PRIVACY_OPTIONS.map((o) => o.label);
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const item = DEFAULT_PRIVACY_OPTIONS[res.tapIndex];
        setSetting(SETTING_KEYS.DEFAULT_PRIVACY, item.value);
        this.setData({ defaultPrivacy: item.value, defaultPrivacyLabel: item.label });
        this.onShowToast('#t-toast', `新记录默认${item.label}`);
      },
    });
  },

  onUserAgreement() {
    wx.navigateTo({ url: '/pages/setting/user-agreement/index' });
  },

  onPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/setting/privacy-policy/index' });
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/setting/about/index' });
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？登录状态与设置将保留，仅清除临时数据。',
      success: (res) => {
        if (!res.confirm) return;
        const keysToKeep = ['access_token', 'user_info', ...Object.values(SETTING_KEYS)];
        try {
          const info = wx.getStorageInfoSync();
          (info.keys || []).forEach((key) => {
            if (!keysToKeep.includes(key)) wx.removeStorageSync(key);
          });
          this.onShowToast('#t-toast', '缓存已清除');
        } catch (e) {
          this.onShowToast('#t-toast', '清除失败，请重试');
        }
      },
    });
  },

  onChangePassword() {
    wx.navigateTo({ url: '/pages/setting/change-password/index' });
  },
});
