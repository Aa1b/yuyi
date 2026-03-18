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
      isValidEmail((account || '').trim()) &&
      (password || '').length > 0 &&
      this.data.isCheck;
    this.setData({ isSubmit: !!ok });
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
    this.setData({
      passwordInfo: { ...this.data.passwordInfo, account: e.detail.value },
    });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({
      passwordInfo: { ...this.data.passwordInfo, password: e.detail.value },
    });
    this.changeSubmit();
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/login/register' });
  },

  /** 微信登录 */
  async loginWithWeChat() {
    if (!this.data.isCheck) {
      wx.showToast({ title: '请先同意《协议条款》', icon: 'none' });
      return;
    }
    try {
      // 注意：wx.getUserProfile 必须由用户点击事件“同步触发”，中间不能先 await。
      // 所以这里先立即触发获取头像昵称，再去异步拿 code。
      const userInfoPromise = new Promise((resolve) => {
        if (wx.getUserProfile) {
          wx.getUserProfile({
            desc: '用于完善个人资料（头像和昵称）',
            success: (r) => resolve(r && r.userInfo ? r.userInfo : null),
            fail: () => resolve(null),
          });
          return;
        }
        if (wx.getUserInfo) {
          wx.getUserInfo({
            withCredentials: false,
            success: (r) => resolve(r && r.userInfo ? r.userInfo : null),
            fail: () => resolve(null),
          });
          return;
        }
        resolve(null);
      });

      const codePromise = new Promise((resolve, reject) => {
        wx.login({
          success: (res) => (res.code ? resolve(res.code) : reject(new Error('获取 code 失败'))),
          fail: reject,
        });
      });

      const [userInfo, code] = await Promise.all([userInfoPromise, codePromise]);

      // 携带 code + userInfo 调用后端登录
      const res = await request('/auth/login', 'POST', { code, userInfo });
      const token = res && res.data && res.data.token ? res.data.token : res.data?.token;
      if (token) {
        wx.setStorageSync('access_token', token);
        let loginUser = res && res.data && res.data.user ? res.data.user : res.data?.user;
        if (loginUser) {
          wx.setStorageSync('user_info', loginUser);
        }

        // 如果这次登录拿到了 userInfo，但服务器返回的用户头像还是空，则再调用一次资料更新接口补写头像/昵称
        if (userInfo && (!loginUser || !loginUser.avatar)) {
          try {
            const profileRes = await request('/auth/profile', 'PUT', {
              nickname: userInfo.nickName,
              avatar: userInfo.avatarUrl,
            });
            if (profileRes && profileRes.data) {
              // 用最新资料覆盖本地缓存
              const updated = profileRes.data;
              const merged = {
                ...(loginUser || {}),
                nickname: updated.nickname ?? (loginUser && loginUser.nickname),
                avatar: updated.avatar ?? (loginUser && loginUser.avatar),
                gender: updated.gender ?? (loginUser && loginUser.gender),
              };
              wx.setStorageSync('user_info', merged);
            }
          } catch (e) {
            // 更新资料失败不影响登录流程，静默忽略
          }
        }
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({ url: '/pages/my/index' });
      } else {
        wx.showToast({ title: (res && res.message) || '微信登录失败', icon: 'none' });
      }
    } catch (err) {
      const msg =
        (err && err.message) ||
        (err && err.code === 503 && '微信登录未配置') ||
        '网络错误，请重试';
      wx.showToast({ title: msg, icon: 'none' });
    }
  },

  /** 邮箱 + 密码登录 */
  async login() {
    const { passwordInfo } = this.data;
    const account = (passwordInfo.account || '').trim();
    const password = (passwordInfo.password || '').trim();

    if (!isValidEmail(account)) {
      wx.showToast({ title: '请输入正确邮箱', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }
    if (!this.data.isCheck) {
      wx.showToast({ title: '请先同意《协议条款》', icon: 'none' });
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
        const msg =
          (res && res.code === 401 && '邮箱或密码错误') ||
          (res && res.message) ||
          '登录失败';
        wx.showToast({ title: msg, icon: 'none' });
      }
    } catch (err) {
      const msg =
        (err && err.message) ||
        (err && err.code === 401 && '邮箱或密码错误') ||
        '网络错误，请重试';
      wx.showToast({ title: msg, icon: 'none' });
    }
  },
});
