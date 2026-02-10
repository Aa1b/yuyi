import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

Page({
  data: {
    enable: false,
    swiperList: [],
    // 生活记录列表
    lifeRecords: [],
    focusRecords: [], // 关注的记录
    // 筛选条件
    activeTab: 'recommend', // recommend | follow | category
    categories: [],
    selectedCategory: '',
    // 分页
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
  },
  
  onLoad(option) {
    if (option.oper) {
      let content = '';
      if (option.oper === 'release') {
        content = '发布成功';
      } else if (option.oper === 'save') {
        content = '保存成功';
      }
      this.showOperMsg(content);
    }
  },
  
  // 生命周期
  async onReady() {
    await this.loadInitialData();
  },
  
  // 加载初始数据（轮播/分类任一方失败不影响其余）
  async loadInitialData() {
    try {
      let swiperList = [];
      let categories = [];
      try {
        const swiperRes = await request('/home/swipers');
        swiperList = swiperRes?.data ?? [];
      } catch (e) {
        // 后端无轮播接口时使用空列表
      }
      try {
        const categoryRes = await request('/life/categories');
        categories = categoryRes?.data ?? [];
      } catch (e) {
        // 分类失败时继续
      }
      this.setData({ swiperList, categories });
      await this.loadLifeRecords();
    } catch (error) {
      console.error('加载初始数据失败', error);
    }
  },
  
  // 加载生活记录（对接口返回做防护，避免 list/total 为 undefined 报错）
  async loadLifeRecords(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { activeTab, selectedCategory, page, pageSize } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        privacy: activeTab === 'recommend' ? 'public' : 'all',
        category: selectedCategory || '',
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/list?${queryString}`);
      if (res.code !== 200) {
        this.setData({ lifeRecords: [], hasMore: false, loading: false, enable: false });
        return;
      }
      const data = res.data ?? {};
      const list = data.list ?? [];
      const total = data.total ?? 0;
      
      if (refresh) {
        this.setData({
          lifeRecords: list,
          page: 1,
          hasMore: list.length < total,
        });
      } else {
        this.setData({
          lifeRecords: [...this.data.lifeRecords, ...list],
          page: page + 1,
          hasMore: this.data.lifeRecords.length + list.length < total,
        });
      }
    } catch (error) {
      console.error('加载生活记录失败', error);
      this.setData({ lifeRecords: [], hasMore: false });
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
    } finally {
      this.setData({ loading: false, enable: false });
    }
  },
  
  // Tab切换
  onTabChange(e) {
    const { value } = e.detail;
    this.setData({
      activeTab: value,
      selectedCategory: '',
      lifeRecords: [],
      page: 1,
      hasMore: true,
    });
    if (value === 'follow') {
      // 加载关注的记录
      this.loadFollowRecords();
    } else {
      this.loadLifeRecords(true);
    }
  },
  
  // 加载关注的记录
  async loadFollowRecords() {
    try {
      this.setData({ loading: true });
      
      const followRes = await request('/user/following?page=1&pageSize=20');
      const followingList = followRes?.data?.list ?? [];
      
      if (followingList.length === 0) {
        this.setData({ focusRecords: [], loading: false });
        return;
      }
      
      const params = { page: 1, pageSize: 20, privacy: 'all' };
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const recordsPromises = followingList.map(user =>
        request(`/life/list?${queryString}&userId=${user.id}`).then(res => (res?.data?.list ?? []))
      );
      
      const recordsArrays = await Promise.all(recordsPromises);
      const allRecords = recordsArrays.flat();
      
      // 按时间排序
      allRecords.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      this.setData({
        focusRecords: allRecords.slice(0, 20), // 取前20条
        loading: false,
      });
    } catch (error) {
      console.error('加载关注记录失败', error);
      this.setData({
        focusRecords: [],
        loading: false,
      });
    }
  },
  
  // 分类筛选
  onCategoryChange(e) {
    const { checked } = e.detail;
    const { value } = e.currentTarget.dataset;
    
    if (!checked) {
      // 取消选中，如果是当前选中的，则取消
      if (this.data.selectedCategory === (value === 'all' ? '' : value)) {
        this.setData({
          selectedCategory: '',
          lifeRecords: [],
          page: 1,
        });
        this.loadLifeRecords(true);
      }
      return;
    }
    
    // 选中新的分类
    const newCategory = value === 'all' ? '' : value;
    this.setData({
      selectedCategory: newCategory,
      lifeRecords: [],
      page: 1,
    });
    this.loadLifeRecords(true);
  },
  
  // 下拉刷新
  onRefresh() {
    this.refresh();
  },
  
  async refresh() {
    this.setData({
      enable: true,
    });
    await this.loadLifeRecords(true);
  },
  
  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLifeRecords();
    }
  },
  
  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 4000,
      content,
    });
  },
  
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
});
