// pages/my-life-records/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    records: [],
    categories: [],
    selectedCategory: '',
    filter: 'all', // all | pending | published | draft
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
  },
  
  onLoad(options) {
    const { filter, publishStatus } = options || {};
    const resolvedFilter = filter || (publishStatus === 'draft' ? 'draft' : publishStatus === 'pending' ? 'pending' : 'all');
    this.setData({ filter: resolvedFilter });
    this.loadCategories();
    this.loadMyRecords(true);
  },
  
  // 加载分类
  async loadCategories() {
    try {
      const res = await request('/life/categories');
      this.setData({
        categories: res.data || [],
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
      
      const { selectedCategory, page, pageSize, filter } = this.data;
      const params = {
        page: refresh ? 1 : page,
        pageSize,
        privacy: 'all', // 管理视角下显示所有隐私级别
        category: selectedCategory || '',
      };

      // 根据不同入口设置状态筛选（与后端 publish_status 一致）
      if (filter === 'pending') {
        params.status = 'pending';
      } else if (filter === 'draft') {
        params.status = 'draft';
      } else if (filter === 'published') {
        params.status = 1;
      } else {
        params.status = 'all';
      }
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const res = await request(`/life/list?${queryString}`);
      const { list, total } = res.data || {};
      const rawList = list || [];
      const recordsWithRejected = rawList.map((r) => {
        const reason = r.rejectedReason;
        return {
          ...r,
          rejectedReasonDisplay:
            reason && reason.length > 50 ? reason.substring(0, 50) + '…' : reason || '',
        };
      });

      if (refresh) {
        this.setData({
          records: recordsWithRejected,
          page: 1,
          hasMore: recordsWithRejected.length < total,
        });
      } else {
        this.setData({
          records: [...this.data.records, ...recordsWithRejected],
          page: page + 1,
          hasMore: this.data.records.length + recordsWithRejected.length < total,
        });
      }
    } catch (error) {
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
            content: `${actionText}成功`,
          });
        } catch (error) {
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
