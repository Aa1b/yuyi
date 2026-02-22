import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    list: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    rejectVisible: false,
    rejectRecordId: null,
    rejectReason: '',
  },

  onLoad() {
    this.loadList(true);
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(false);
  },

  async loadList(refresh = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const page = refresh ? 1 : this.data.page;
    try {
      const res = await request(`/admin/pending-records?page=${page}&pageSize=${this.data.pageSize}`);
      const data = res?.data ?? {};
      const list = data.list ?? [];
      const total = data.total ?? 0;
      const newList = refresh ? list : [...this.data.list, ...list];
      this.setData({
        list: newList,
        page: page,
        hasMore: newList.length < total,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      if (e?.code === 403) {
        Message.error({ context: this, offset: [120, 32], duration: 2000, content: '无权限，仅管理员可进入' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        Message.error({ context: this, offset: [120, 32], duration: 2000, content: '加载失败，请重试' });
      }
    }
  },

  onViewDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/life-detail/index?id=${id}` });
  },

  async onApprove(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      wx.showLoading({ title: '处理中...', mask: true });
      await request(`/admin/record/${id}/approve`, 'POST', {});
      wx.hideLoading();
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已通过' });
      this.loadList(true);
    } catch (err) {
      wx.hideLoading();
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: err?.message || '操作失败' });
    }
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ rejectVisible: true, rejectRecordId: id, rejectReason: '' });
  },

  onRejectReasonChange(e) {
    this.setData({ rejectReason: e.detail?.value ?? '' });
  },

  cancelReject() {
    this.setData({ rejectVisible: false, rejectRecordId: null, rejectReason: '' });
  },

  async confirmReject() {
    const id = this.data.rejectRecordId;
    const reason = this.data.rejectReason;
    if (!id) return;
    try {
      wx.showLoading({ title: '处理中...', mask: true });
      await request(`/admin/record/${id}/reject`, 'POST', { reason });
      wx.hideLoading();
      this.setData({ rejectVisible: false, rejectRecordId: null, rejectReason: '' });
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已驳回' });
      this.loadList(true);
    } catch (err) {
      wx.hideLoading();
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: err?.message || '操作失败' });
    }
  },
});
