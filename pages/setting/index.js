import useToastBehavior from '~/behaviors/useToast';
import { SETTING_KEYS, getSetting, setSetting } from '~/utils/settings';

const FONT_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

const PRIVACY_OPTIONS = [
  { label: '公开', value: 'public' },
  { label: '好友可见', value: 'friends' },
  { label: '私密', value: 'private' },
];

Page({
  behaviors: [useToastBehavior],

  data: {
    darkMode: false,
    fontSize: 'medium',
    fontSizeLabel: '中',
    videoAutoplay: false,
    videoMute: false,
    videoPlayLabel: '点击播放',
    notifyLike: true,
    notifyComment: true,
    notifyFollow: true,
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
    const darkMode = getSetting(SETTING_KEYS.DARK_MODE);
    const fontSize = getSetting(SETTING_KEYS.FONT_SIZE);
    const videoAutoplay = getSetting(SETTING_KEYS.VIDEO_AUTOPLAY);
    const videoMute = getSetting(SETTING_KEYS.VIDEO_MUTE);
    const notifyLike = getSetting(SETTING_KEYS.NOTIFY_LIKE);
    const notifyComment = getSetting(SETTING_KEYS.NOTIFY_COMMENT);
    const notifyFollow = getSetting(SETTING_KEYS.NOTIFY_FOLLOW);
    const defaultPrivacy = getSetting(SETTING_KEYS.DEFAULT_PRIVACY);

    const fontSizeLabel = (FONT_OPTIONS.find(o => o.value === fontSize) || FONT_OPTIONS[1]).label;
    const defaultPrivacyLabel = (PRIVACY_OPTIONS.find(o => o.value === defaultPrivacy) || PRIVACY_OPTIONS[0]).label;
    const videoPlayLabel = videoAutoplay ? '自动播放' : '点击播放';

    this.setData({
      darkMode,
      fontSize,
      fontSizeLabel,
      videoAutoplay,
      videoMute,
      videoPlayLabel,
      notifyLike,
      notifyComment,
      notifyFollow,
      defaultPrivacy,
      defaultPrivacyLabel,
    });
  },

  onDarkModeChange(e) {
    const v = e.detail.value;
    setSetting(SETTING_KEYS.DARK_MODE, v);
    this.setData({ darkMode: v });
    this.onShowToast('#t-toast', v ? '已开启深色模式' : '已关闭深色模式');
  },

  onFontSizeTap() {
    const options = FONT_OPTIONS.map(o => o.label);
    const current = FONT_OPTIONS.findIndex(o => o.value === this.data.fontSize);
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const item = FONT_OPTIONS[res.tapIndex];
        setSetting(SETTING_KEYS.FONT_SIZE, item.value);
        this.setData({ fontSize: item.value, fontSizeLabel: item.label });
        this.onShowToast('#t-toast', `字体已设为${item.label}`);
      },
    });
  },

  onPlayTap() {
    const options = ['点击播放', '自动播放'];
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const v = res.tapIndex === 1;
        setSetting(SETTING_KEYS.VIDEO_AUTOPLAY, v);
        this.setData({ videoAutoplay: v, videoPlayLabel: options[res.tapIndex] });
        this.onShowToast('#t-toast', `视频${options[res.tapIndex]}`);
      },
    });
  },

  onVideoMuteChange(e) {
    const v = e.detail.value;
    setSetting(SETTING_KEYS.VIDEO_MUTE, v);
    this.setData({ videoMute: v });
  },

  onNotifyLikeChange(e) {
    const v = e.detail.value;
    setSetting(SETTING_KEYS.NOTIFY_LIKE, v);
    this.setData({ notifyLike: v });
  },
  onNotifyCommentChange(e) {
    const v = e.detail.value;
    setSetting(SETTING_KEYS.NOTIFY_COMMENT, v);
    this.setData({ notifyComment: v });
  },
  onNotifyFollowChange(e) {
    const v = e.detail.value;
    setSetting(SETTING_KEYS.NOTIFY_FOLLOW, v);
    this.setData({ notifyFollow: v });
  },

  onPrivacyTap() {
    const options = PRIVACY_OPTIONS.map(o => o.label);
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const item = PRIVACY_OPTIONS[res.tapIndex];
        setSetting(SETTING_KEYS.DEFAULT_PRIVACY, item.value);
        this.setData({ defaultPrivacy: item.value, defaultPrivacyLabel: item.label });
        this.onShowToast('#t-toast', `新记录默认${item.label}`);
      },
    });
  },

  onChangePassword() {
    wx.navigateTo({ url: '/pages/setting/change-password/index' });
  },

  onLogout() {
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
  },
});
