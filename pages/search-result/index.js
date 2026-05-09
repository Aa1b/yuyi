// pages/search-result/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

/** 兼容路由参数一次或二次 encodeURIComponent */
function normalizeKeyword(raw) {
  let s = String(raw || '');
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch (_) {
      break;
    }
  }
  return s.trim();
}

Page({
  data: {
    keyword: '',
    records: [],
    total: 0,
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    categories: [],
    selectedCategory: '',
  },
  
  onLoad(options) {
    const keyword = normalizeKeyword(options.keyword);
    if (!keyword) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '搜索关键词不能为空',
      });
      wx.navigateBack();
      return;
    }

    this.setData({ keyword });
    this.loadCategories();
    this.searchRecords(true);
  },
  
  // 加载分类
  async loadCategories() {
    try {
      const res = await request('/life/categories?scope=filter');
      this.setData({
        categories: res.data || [],
      });
    } catch (error) {
      console.error('加载分类失败', error);
    }
  },
  
  // 搜索记录
  async searchRecords(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { keyword, page, pageSize, selectedCategory } = this.data;
      const params = {
        keyword,
        page: refresh ? 1 : page,
        pageSize,
        category: selectedCategory || '',
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/search?${queryString}`);
      const result = res.data || {};
      const { list = [], total = 0 } = result;
      const nextLen = refresh ? list.length : this.data.records.length + list.length;

      if (refresh) {
        this.setData({
          records: list,
          total,
          page: 1,
          hasMore: nextLen < total,
          loading: false,
        });
      } else {
        this.setData({
          records: [...this.data.records, ...list],
          total,
          page: page + 1,
          hasMore: nextLen < total,
          loading: false,
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('搜索失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '搜索失败，请重试',
      });
    }
  },
  
  // 分类筛选
  onCategoryChange(e) {
    const { checked } = e.detail;
    const { value } = e.currentTarget.dataset;
    
    if (!checked) {
      if (this.data.selectedCategory === (value === 'all' ? '' : value)) {
        this.setData({
          selectedCategory: '',
          records: [],
          page: 1,
        });
        this.searchRecords(true);
      }
      return;
    }
    
    const newCategory = value === 'all' ? '' : value;
    this.setData({
      selectedCategory: newCategory,
      records: [],
      page: 1,
    });
    this.searchRecords(true);
  },
  
  // 查看详情
  viewDetail(e) {
    let id = null;
    if (e.detail && e.detail.record) {
      id = e.detail.record.id;
    } else if (e.currentTarget && e.currentTarget.dataset) {
      id = e.currentTarget.dataset.id;
    }
    
    if (id) {
      wx.navigateTo({
        url: `/pages/life-detail/index?id=${id}`,
      });
    }
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.searchRecords(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 500);
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.searchRecords();
    }
  },
});
