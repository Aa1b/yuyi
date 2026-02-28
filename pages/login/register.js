import request from '~/api/request';

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}

Page({
  data: {
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    canSubmit: false,
  },

  onGoBack() {
    wx.navigateBack();
  },

  onEmailInput(e) {
    const email = (e.detail.value || '').trim();
    this.setData({ email });
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
    const { email, password, confirmPassword } = this.data;
    const ok = isValidEmail(email) && password.length >= 6 && password === confirmPassword;
    this.setData({ canSubmit: ok });
  },

  async submit() {
    const { email, password, nickname } = this.data;
    const emailTrim = email.trim();
    if (!isValidEmail(emailTrim)) {
      wx.showToast({ title: '请输入正确邮箱', icon: 'none' });
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
        email: emailTrim,
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
        title: (err && err.message) || (err.code === 400 && '该邮箱已注册') || '网络错误',
        icon: 'none',
      });
    }
  },
});
