/**
 * 设置项存储 key
 */
export const SETTING_KEYS = {
  DARK_MODE: 'setting_dark_mode',
  FONT_SIZE: 'setting_font_size',       // small | medium | large
  VIDEO_AUTOPLAY: 'setting_video_autoplay',
  VIDEO_MUTE: 'setting_video_mute',
  NOTIFY_LIKE: 'setting_notify_like',
  NOTIFY_COMMENT: 'setting_notify_comment',
  NOTIFY_FOLLOW: 'setting_notify_follow',
  DEFAULT_PRIVACY: 'setting_default_privacy',  // public | private | friends
};

const defaults = {
  [SETTING_KEYS.DARK_MODE]: false,
  [SETTING_KEYS.FONT_SIZE]: 'medium',
  [SETTING_KEYS.VIDEO_AUTOPLAY]: false,
  [SETTING_KEYS.VIDEO_MUTE]: false,
  [SETTING_KEYS.NOTIFY_LIKE]: true,
  [SETTING_KEYS.NOTIFY_COMMENT]: true,
  [SETTING_KEYS.NOTIFY_FOLLOW]: true,
  [SETTING_KEYS.DEFAULT_PRIVACY]: 'public',
};

export function getSetting(key) {
  try {
    const v = wx.getStorageSync(key);
    return v !== '' && v !== undefined ? v : defaults[key];
  } catch {
    return defaults[key];
  }
}

export function setSetting(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch {
    return false;
  }
}
