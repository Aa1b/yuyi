// pages/search-result/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    keyword: '',
    records: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    categories: [],
    selectedCategory: '',
    selectedType: 'all',
  },
  
  onLoad(options) {
    const { keyword } = options;
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
      const res = await request('/life/categories');
      this.setData({
        categories: res?.data ?? [],
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
      
      const { keyword, page, pageSize, selectedCategory, selectedType } = this.data;
      const params = {
        keyword,
        page: refresh ? 1 : page,
        pageSize,
        category: selectedCategory || '',
        type: selectedType || 'all',
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/search?${queryString}`);
      if (res.code !== 200) {
        this.setData({ records: [], hasMore: false, loading: false });
        return;
      }
      const result = res.data ?? {};
      const list = result.list ?? [];
      const total = result.total ?? 0;
      
      if (refresh) {
        this.setData({
          records: list,
          page: 1,
          hasMore: list.length < total,
          loading: false,
        });
      } else {
        this.setData({
          records: [...this.data.records, ...list],
          page: page + 1,
          hasMore: this.data.records.length + list.length < total,
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
  
  // 类型筛选
  onTypeChange(e) {
    const { value } = e.detail;
    this.setData({
      selectedType: value,
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
