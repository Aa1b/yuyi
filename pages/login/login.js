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

  // 微信登录（真实后端）
  async loginWithWeChat() {
    try {
      // 1. 调用 wx.login 获取临时登录凭证 code
      const loginRes = await wx.login();
      if (!loginRes.code) {
        wx.showToast({ title: '微信登录失败，请重试', icon: 'none' });
        return;
      }

      // 2. 获取微信用户信息（用于后端创建/更新用户资料）
      let userInfo = null;
      try {
        const userRes = await wx.getUserProfile({
          desc: '用于完善会员资料',
        });
        userInfo = userRes.userInfo;
      } catch (e) {
        wx.showToast({ title: '已取消授权', icon: 'none' });
        return;
      }

      // 3. 调用后端 /auth/login 接口换取业务 token
      const res = await request('/auth/login', 'POST', {
        code: loginRes.code,
        userInfo,
      });

      if (res && res.data && res.data.token) {
        wx.setStorageSync('access_token', res.data.token);
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({
          url: '/pages/my/index',
        });
      } else {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: '登录异常，请稍后再试', icon: 'none' });
      console.error('微信登录失败', error);
    }
  },

  async login() {
    if (this.data.isPasswordLogin) {
      const res = await request('/login/postPasswordLogin', 'post', { data: this.data.passwordInfo });
      if (res.success) {
        await wx.setStorageSync('access_token', res.data.token);
        wx.switchTab({
          url: `/pages/my/index`,
        });
      }
    } else {
      const res = await request('/login/getSendMessage', 'get');
      if (res.success) {
        wx.navigateTo({
          url: `/pages/loginCode/loginCode?phoneNumber=${this.data.phoneNumber}`,
        });
      }
    }
  },
});
