import request from '~/api/request';

Page({
  data: {
    phoneNumber: '',
    isPhoneNumber: false,
    isCheck: false,
    isSubmit: false,
    isPasswordLogin: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  /* 自定义功能函数 */
  changeSubmit() {
    if (this.data.isPasswordLogin) {
      if (this.data.passwordInfo.account !== '' && this.data.passwordInfo.password !== '' && this.data.isCheck) {
        this.setData({ isSubmit: true });
      } else {
        this.setData({ isSubmit: false });
      }
    } else if (this.data.isPhoneNumber && this.data.isCheck) {
      this.setData({ isSubmit: true });
    } else {
      this.setData({ isSubmit: false });
    }
  },

  // 手机号变更
  onPhoneInput(e) {
    const isPhoneNumber = /^[1][3,4,5,7,8,9][0-9]{9}$/.test(e.detail.value);
    this.setData({
      isPhoneNumber,
      phoneNumber: e.detail.value,
    });
    this.changeSubmit();
  },

  // 用户协议选择变更
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

  // 切换登录方式
  changeLogin() {
    this.setData({ isPasswordLogin: !this.data.isPasswordLogin, isSubmit: false });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/login/register' });
  },

  async login() {
    const { passwordInfo, isPasswordLogin } = this.data;
    if (isPasswordLogin) {
      // 调用后端账号密码登录
      try {
        const res = await request('/auth/password-login', 'POST', {
          account: (passwordInfo.account || '').trim(),
          password: passwordInfo.password || '',
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
        const msg = (err && err.message) || (err && err.code === 401 && '账号或密码错误') || '网络错误，请重试';
        wx.showToast({ title: msg, icon: 'none' });
      }
      return;
    }
    // 验证码登录：暂引导使用密码登录
    wx.showToast({ title: '请使用密码登录', icon: 'none' });
  },
});
