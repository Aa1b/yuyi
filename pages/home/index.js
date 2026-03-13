import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

const TENCENT_MAP_KEY = 'LITBZ-IDMWA-5D3KD-CURMW-MHJ4J-2SFMX';

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
    // 位置筛选 / 同城
    locationCity: '',
    useLocationFilter: false,
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
  
  // 加载初始数据
  async loadInitialData() {
    try {
      // 加载轮播图
      const swiperRes = await request('/home/swipers').then((res) => res.data);
      
      // 加载分类
      const categoryRes = await request('/life/categories').then((res) => res.data);
      
      this.setData({
        swiperList: swiperRes.data,
        categories: categoryRes.data || [],
      });
      
      // 加载生活记录
      await this.loadLifeRecords();
    } catch (error) {
      console.error('加载初始数据失败', error);
    }
  },
  
  // 加载生活记录
  async loadLifeRecords(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      const { activeTab, selectedCategory, page, pageSize, useLocationFilter, locationCity } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        // 推荐和同城只展示公开内容，关注列表使用全部可见内容
        privacy: (activeTab === 'recommend' || activeTab === 'sameCity') ? 'public' : 'all',
        category: selectedCategory || '',
      };

      // 同城筛选：在 sameCity 标签下按当前城市过滤
      if (activeTab === 'sameCity' && locationCity) {
        params.location = locationCity;
      }
      
      // 构建查询字符串
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/list?${queryString}`);
      const { list, total } = res.data || {};
      
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
    } else if (value === 'sameCity') {
      // 加载同城记录：先获取当前城市，再加载列表
      this.fetchCurrentCityAndFilter();
    } else {
      this.loadLifeRecords(true);
    }
  },
  
  // 加载关注的记录
  async loadFollowRecords() {
    try {
      this.setData({ loading: true });
      
      // 获取关注列表
      const followRes = await request('/user/following?page=1&pageSize=20');
      const followingList = (followRes.data && followRes.data.list) || [];
      
      if (followingList.length === 0) {
        this.setData({
          focusRecords: [],
          loading: false,
        });
        return;
      }
      
      // 获取关注用户的记录
      const followingIds = followingList.map(u => u.id).join(',');
      const params = {
        page: 1,
        pageSize: 20,
        privacy: 'all', // 显示公开和好友可见的记录
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      // 获取所有关注用户的记录
      const recordsPromises = followingList.map(user => 
        request(`/life/list?${queryString}&userId=${user.id}`).then(res => res.data.data.list || [])
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

  // 获取当前位置城市并启用位置筛选
  async fetchCurrentCityAndFilter() {
    const that = this;
    try {
      const locRes = await wx.getLocation({ type: 'gcj02' });
      const { latitude, longitude } = locRes;

      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        method: 'GET',
        data: {
          location: `${latitude},${longitude}`,
          key: TENCENT_MAP_KEY,
        },
        success(res) {
          if (res.data && res.data.status === 0) {
            const comp = res.data.result.address_component || {};
            const city = comp.city || comp.district || '';
            that.setData({
              locationCity: city,
              useLocationFilter: true,
              lifeRecords: [],
              page: 1,
              hasMore: true,
            });
            that.loadLifeRecords(true);
          }
        },
      });
    } catch (e) {
      // 获取失败时不启用位置筛选
    }
  },

  // 点击位置筛选按钮：开启或关闭按当前位置筛选
  async onLocationFilterTap() {
    const { useLocationFilter } = this.data;
    if (!useLocationFilter) {
      await this.fetchCurrentCityAndFilter();
    } else {
      this.setData({
        useLocationFilter: false,
        lifeRecords: [],
        page: 1,
        hasMore: true,
      });
      this.loadLifeRecords(true);
    }
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
