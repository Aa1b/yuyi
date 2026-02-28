import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
  },

  onOldInput(e) {
    this.setData({ oldPassword: e.detail.value || '' });
  },
  onNewInput(e) {
    this.setData({ newPassword: e.detail.value || '' });
  },
  onConfirmInput(e) {
    this.setData({ confirmPassword: e.detail.value || '' });
  },

  async onSubmit() {
    const { oldPassword, newPassword, confirmPassword, loading } = this.data;
    if (loading) return;
    if (!oldPassword.trim()) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请输入原密码' });
      return;
    }
    if (!newPassword.trim()) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请输入新密码' });
      return;
    }
    if (newPassword.length < 6) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '新密码至少6位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '两次输入的新密码不一致' });
      return;
    }

    try {
      this.setData({ loading: true });
      await request('/auth/password', 'PUT', {
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      });
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '密码修改成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      this.setData({ loading: false });
      const msg = err?.message || err?.data?.message || err?.errMsg || '修改失败，请重试';
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: msg });
    }
  },
});
