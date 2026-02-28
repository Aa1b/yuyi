import request from '~/api/request';

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}

Page({
  data: {
    isCheck: false,
    isSubmit: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  changeSubmit() {
    const { account, password } = this.data.passwordInfo;
    const ok =
      isValidEmail(account) &&
      (password || '').length > 0 &&
      this.data.isCheck;
    this.setData({ isSubmit: ok });
  },

  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onAccountChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/login/register' });
  },

  /** 微信登录 */
  async onWechatLogin() {
    if (!this.data.isCheck) {
      wx.showToast({ title: '请先同意《协议条款》', icon: 'none' });
      return;
    }
    try {
      const { code } = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => (res.code ? resolve(res) : reject(new Error('获取 code 失败'))),
          fail: reject,
        });
      });
      const res = await request('/auth/login', 'POST', { code });
      if (res.code === 200 && res.data && res.data.token) {
        wx.setStorageSync('access_token', res.data.token);
        if (res.data.user) {
          wx.setStorageSync('user_info', res.data.user);
        }
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({ url: '/pages/my/index' });
      } else {
        wx.showToast({ title: res.message || '微信登录失败', icon: 'none' });
      }
    } catch (err) {
      const msg = (err && err.message) || (err && err.code === 503 && '微信登录未配置') || '网络错误，请重试';
      wx.showToast({ title: msg, icon: 'none' });
    }
  },

  /** 邮箱 + 密码登录 */
  async login() {
    const { passwordInfo } = this.data;
    const account = (passwordInfo.account || '').trim();
    const password = passwordInfo.password || '';

    if (!isValidEmail(account)) {
      wx.showToast({ title: '请输入正确邮箱', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    try {
      const res = await request('/auth/password-login', 'POST', {
        account,
        password,
      });
      if (res.code === 200 && res.data && res.data.token) {
        wx.setStorageSync('access_token', res.data.token);
        if (res.data.user) {
          wx.setStorageSync('user_info', res.data.user);
        }
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({ url: '/pages/my/index' });
      } else {
        wx.showToast({ title: res.message || '登录失败', icon: 'none' });
      }
    } catch (err) {
      const msg = (err && err.message) || (err && err.code === 401 && '邮箱或密码错误') || '网络错误，请重试';
      wx.showToast({ title: msg, icon: 'none' });
    }
  },
});
