import request from '~/api/request';

/** 本地搜索历史（baseUrl 已含 /api，勿再请求 /api/searchHistory 以免路径变成 /api/api/...） */
const HISTORY_STORAGE_KEY = 'life_search_history';
const MAX_HISTORY_LEN = 30;

Page({
  data: {
    historyWords: [],
    popularWords: [],
    searchValue: '',
    dialog: {
      title: '确认删除当前历史记录',
      showCancelButton: true,
      message: '',
    },
    dialogShow: false,
  },

  deleteType: 0,
  deleteIndex: '',

  onShow() {
    this.queryHistory();
    this.queryPopular();
  },

  persistHistory(words) {
    try {
      wx.setStorageSync(HISTORY_STORAGE_KEY, words.slice(0, MAX_HISTORY_LEN));
    } catch (e) {
      console.warn('persistHistory', e);
    }
  },

  /**
   * 搜索历史（本地存储）
   */
  queryHistory() {
    try {
      const raw = wx.getStorageSync(HISTORY_STORAGE_KEY);
      const historyWords = Array.isArray(raw) ? raw : [];
      this.setData({ historyWords });
    } catch (e) {
      this.setData({ historyWords: [] });
    }
  },

  /**
   * 热门：用语义已有的标签接口（后端未单独提供 searchPopular）
   */
  async queryPopular() {
    try {
      const res = await request('/life/tags');
      const raw = res.data || [];
      const list = Array.isArray(raw) ? raw : [];
      const popularWords = list
        .map((item) => (item && item.name) || item)
        .filter(Boolean)
        .slice(0, 16);
      this.setData({ popularWords });
    } catch (e) {
      this.setData({ popularWords: [] });
    }
  },

  setHistoryWords(searchValue) {
    if (!searchValue) return;

    const historyWords = [...this.data.historyWords];
    const index = historyWords.indexOf(searchValue);

    if (index !== -1) {
      historyWords.splice(index, 1);
    }
    historyWords.unshift(searchValue);

    const trimmed = historyWords.slice(0, MAX_HISTORY_LEN);
    this.setData({
      searchValue,
      historyWords: trimmed,
    });
    this.persistHistory(trimmed);
  },

  confirm() {
    const { historyWords } = this.data;
    const { deleteType, deleteIndex } = this;

    if (deleteType === 0) {
      historyWords.splice(deleteIndex, 1);
      this.setData({
        historyWords,
        dialogShow: false,
      });
      this.persistHistory(historyWords);
    } else {
      this.setData({ historyWords: [], dialogShow: false });
      this.persistHistory([]);
    }
  },

  close() {
    this.setData({ dialogShow: false });
  },

  handleClearHistory() {
    const { dialog } = this.data;
    this.deleteType = 1;
    this.setData({
      dialog: {
        ...dialog,
        message: '确认删除所有历史记录',
      },
      dialogShow: true,
    });
  },

  deleteCurr(e) {
    const { index } = e.currentTarget.dataset;
    const { dialog } = this.data;
    this.deleteIndex = index;
    this.deleteType = 0;
    this.setData({
      dialog: {
        ...dialog,
        message: '确认删除当前历史记录',
      },
      dialogShow: true,
    });
  },

  handleHistoryTap(e) {
    const { historyWords } = this.data;
    const { index } = e.currentTarget.dataset;
    const searchValue = historyWords[index || 0] || '';
    if (!searchValue) return;
    this.setHistoryWords(searchValue);
    wx.navigateTo({
      url: `/pages/search-result/index?keyword=${encodeURIComponent(searchValue)}`,
    });
  },

  handlePopularTap(e) {
    const { popularWords } = this.data;
    const { index } = e.currentTarget.dataset;
    const searchValue = popularWords[index || 0] || '';
    if (!searchValue) return;
    this.setHistoryWords(searchValue);
    wx.navigateTo({
      url: `/pages/search-result/index?keyword=${encodeURIComponent(searchValue)}`,
    });
  },

  async handleSubmit(e) {
    const { value } = e.detail;
    if (value.length === 0) return;

    this.setHistoryWords(value);

    wx.navigateTo({
      url: `/pages/search-result/index?keyword=${encodeURIComponent(value)}`,
    });
  },

  actionHandle() {
    this.setData({
      searchValue: '',
    });
    wx.switchTab({ url: '/pages/home/index' });
  },
});
