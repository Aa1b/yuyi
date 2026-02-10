// pages/my-life-records/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    records: [],
    categories: [],
    selectedCategory: '',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
  },
  
  onLoad() {
    this.loadCategories();
    this.loadMyRecords(true);
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
  
  // 加载我的记录
  async loadMyRecords(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { selectedCategory, page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        privacy: 'all', // 我的记录显示所有隐私级别
        category: selectedCategory || '',
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/list?${queryString}`);
      if (res.code !== 200) {
        this.setData({ records: [], hasMore: false, loading: false });
        return;
      }
      const data = res.data ?? {};
      const list = data.list ?? [];
      const total = data.total ?? 0;
      
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
      this.setData({ records: [], hasMore: false });
      console.error('加载我的记录失败', error);
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
        this.loadMyRecords(true);
      }
      return;
    }
    
    const newCategory = value === 'all' ? '' : value;
    this.setData({
      selectedCategory: newCategory,
      records: [],
      page: 1,
    });
    this.loadMyRecords(true);
  },
  
  // 删除记录
  async deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...', mask: true });
            await request(`/life/record?id=${id}`, 'DELETE');
            wx.hideLoading();
            
            // 从列表中移除
            const { records } = this.data;
            const index = records.findIndex(item => item.id === id);
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
              content: '删除成功',
            });
          } catch (error) {
            wx.hideLoading();
            Message.error({
              context: this,
              offset: [120, 32],
              duration: 2000,
              content: '删除失败，请重试',
            });
          }
        }
      },
    });
  },
  
  // 编辑记录
  editRecord(e) {
    e.stopPropagation();
    const { id } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        url: `/pages/life-edit/index?id=${id}`,
      });
    }
  },
  
  // 查看详情
  viewDetail(e) {
    // 从事件对象中获取id，可能来自life-record-card组件的点击
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
  
  // 去发布
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadMyRecords(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // 页面显示时刷新（从编辑页面返回）
  onShow() {
    // 如果从编辑页面返回，刷新列表
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage.options && currentPage.options.from === 'edit') {
      this.loadMyRecords(true);
    }
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMyRecords();
    }
  },
});
