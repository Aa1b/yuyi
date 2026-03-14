/**
 * 管理端统计看板（仅管理员可见）
 * 展示整体情况、近 N 天趋势、分类占比等统计
 */
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

const TREND_DAYS = 7;

Page({
  data: {
    isAdmin: false,
    loading: true,
    overview: null,
    trend: null,
    category: null,
    trendDays: TREND_DAYS,
    canvasWidth: 600,
    pieSize: 280,
  },

  async onLoad() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.redirectTo({ url: '/pages/my/index' });
      return;
    }

    try {
      const profileRes = await request('/auth/profile');
      const isAdmin = !!(profileRes?.data && (profileRes.data.role === 'admin' || profileRes.data.isAdmin));
      this.setData({ isAdmin });

      if (!isAdmin) {
        Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '仅管理员可查看' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      await this.loadAll();
    } catch (e) {
      if (e && (e.code === 403 || (e.data && e.data.code === 403))) {
        Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '仅管理员可查看' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
      this.setData({ loading: false });
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '加载失败，请重试' });
    }
  },

  onReady() {
    // canvas 需在布局完成后绘制
    this.drawAfterData();
  },

  async loadAll() {
    const [overviewRes, trendRes, categoryRes] = await Promise.all([
      request('/stats/overview').catch(() => ({ data: null })),
      request(`/stats/trend?days=${TREND_DAYS}`).catch(() => ({ data: null })),
      request('/stats/category').catch(() => ({ data: null })),
    ]);

    const overview = overviewRes?.data || null;
    const trend = trendRes?.data || null;
    const rawCategory = categoryRes?.data?.list || null;
    const colors = ['#0052d9', '#00a870', '#ed7b2f', '#e34d59', '#8b5cf6', '#0ea5e9', '#52c41a', '#faad14'];
    const category = Array.isArray(rawCategory)
      ? rawCategory.map((item, i) => ({ ...item, color: colors[i % colors.length] }))
      : null;

    const sys = wx.getSystemInfoSync();
    const canvasWidth = Math.min(600, (sys.windowWidth || 375) - 48);
    const pieSize = Math.min(280, (sys.windowWidth || 375) - 48);

    this.setData({
      overview,
      trend,
      category,
      loading: false,
      canvasWidth,
      pieSize,
    });

    this.drawAfterData();
  },

  drawAfterData() {
    if (this.data.trend && this.data.trend.dates && this.data.trend.dates.length) {
      setTimeout(() => this.drawTrend(), 100);
    }
    if (this.data.category && this.data.category.length) {
      setTimeout(() => this.drawCategory(), 150);
    }
  },

  drawTrend() {
    const { trend } = this.data;
    if (!trend || !trend.dates || !trend.dates.length) return;

    const query = wx.createSelectorQuery().in(this);
    query
      .select('#trendCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const width = res[0].width || 600;
        const height = res[0].height || 280;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const padding = { left: 44, right: 16, top: 16, bottom: 28 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const publish = trend.publish || [];
        const likes = trend.likes || [];
        const maxP = Math.max(1, ...publish);
        const maxL = Math.max(1, ...likes);
        const maxVal = Math.max(maxP, maxL);

        ctx.clearRect(0, 0, width, height);

        // 网格线
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
          const y = padding.top + (chartH * i) / 4;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(padding.left + chartW, y);
          ctx.stroke();
        }

        // 折线：发布
        if (publish.length) {
          ctx.strokeStyle = '#0052d9';
          ctx.lineWidth = 2;
          ctx.beginPath();
          publish.forEach((v, i) => {
            const x = padding.left + (chartW * (i + 0.5)) / publish.length;
            const y = padding.top + chartH - (v / maxVal) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        // 折线：点赞
        if (likes.length) {
          ctx.strokeStyle = '#ed7b2f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          likes.forEach((v, i) => {
            const x = padding.left + (chartW * (i + 0.5)) / likes.length;
            const y = padding.top + chartH - (v / maxVal) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        // X 轴日期
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        (trend.dates || []).forEach((d, i) => {
          const x = padding.left + (chartW * (i + 0.5)) / (trend.dates.length || 1);
          ctx.fillText(d, x, height - 8);
        });
      });
  },

  drawCategory() {
    const { category } = this.data;
    if (!category || !category.length) return;

    const query = wx.createSelectorQuery().in(this);
    query
      .select('#categoryCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const size = Math.min(res[0].width || 300, res[0].height || 300);

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const total = category.reduce((s, i) => s + (i.value || 0), 0);
        if (total === 0) return;

        const cx = size / 2;
        const cy = size / 2;
        const r = (size / 2) * 0.85;
        const colors = ['#0052d9', '#00a870', '#ed7b2f', '#e34d59', '#8b5cf6', '#0ea5e9', '#52c41a', '#faad14'];

        let start = -Math.PI / 2;
        category.forEach((item, i) => {
          const ratio = item.value / total;
          const end = start + ratio * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, start, end);
          ctx.closePath();
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          start = end;
        });
      });
  },
});
