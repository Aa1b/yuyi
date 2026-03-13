// pages/review-center/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    records: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
  },

  onLoad() {
    this.loadPendingRecords(true);
  },

  // 加载待审核记录
  async loadPendingRecords(refresh = false) {
    if (this.data.loading) return;

    try {
      this.setData({ loading: true });

      const { page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        privacy: 'all',
        status: 'pending',
      };

      const queryString = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const res = await request(`/life/list?${queryString}`).then((res) => res.data);
      const { list = [], total = 0 } = res.data || {};

      if (refresh) {
        this.setData({
          records: list,
          page: 1,
          hasMore: list.length < total,
        });
      } else {
        this.setData({
          records: [...this.data.records, ...list],
          page: page + 1,
          hasMore: this.data.records.length + list.length < total,
        });
      }
    } catch (error) {
      console.error('加载待审核记录失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 审核记录（通过 / 驳回）
  async reviewRecord(e) {
    const { id, action } = e.currentTarget.dataset;
    const actionText = action === 'approve' ? '通过' : '驳回';

    wx.showModal({
      title: `确认${actionText}`,
      content: `确定要${actionText}这条记录吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: `${actionText}中...`, mask: true });
          await request('/life/review', 'POST', { id, action });
          wx.hideLoading();

          const { records } = this.data;
          const index = records.findIndex((item) => item.id === id);
          if (index > -1) {
            records.splice(index, 1);
            this.setData({
              records: [...records],
            });
          }

          Message.success({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: `${actionText}成功`,
          });
        } catch (err) {
          wx.hideLoading();
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: `${actionText}失败，请重试`,
          });
        }
      },
    });
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        url: `/pages/life-detail/index?id=${id}`,
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPendingRecords(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPendingRecords();
    }
  },
});

