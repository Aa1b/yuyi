import request from '~/api/request';

Page({
  data: {
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    canSubmit: false,
  },

  onGoBack() {
    wx.navigateBack();
  },

  onPhoneInput(e) {
    const phone = (e.detail.value || '').trim();
    this.setData({ phone });
    this.checkSubmit();
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || '' });
    this.checkSubmit();
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value || '' });
    this.checkSubmit();
  },

  onNicknameInput(e) {
    this.setData({ nickname: (e.detail.value || '').trim() });
    this.checkSubmit();
  },

  checkSubmit() {
    const { phone, password, confirmPassword } = this.data;
    const ok = /^1[3-9]\d{9}$/.test(phone) && password.length >= 6 && password === confirmPassword;
    this.setData({ canSubmit: ok });
  },

  async submit() {
    const { phone, password, nickname } = this.data;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }
    if (password !== this.data.confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    try {
      const res = await request('/auth/register', 'POST', {
        phone,
        password,
        nickname: nickname || '用户',
      });
      if (res.code === 200 && res.data && res.data.token) {
        wx.setStorageSync('access_token', res.data.token);
        if (res.data.user) wx.setStorageSync('user_info', res.data.user);
        wx.showToast({ title: '注册成功', icon: 'success' });
        wx.switchTab({ url: '/pages/my/index' });
      } else {
        wx.showToast({ title: res.message || '注册失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || (err.code === 400 && '该手机号已注册') || '网络错误',
        icon: 'none',
      });
    }
  },
});
