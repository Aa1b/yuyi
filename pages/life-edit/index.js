// pages/life-edit/index.js
import config from '~/config';
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';
import resolveMediaUrl from '~/utils/resolveMediaUrl';
import { enrichAddressFromLocation, buildLocationLabel } from '~/utils/locationFromMap';
import { LIFE_RECORD_PRIVACY_OPTIONS, LIFE_RECORD_PRIVACY_HINT } from '~/utils/privacyLabels';
import {
  createInitialProvinceCityState,
  getCitiesOfProvince,
} from '~/utils/areaPickerHelpers';

Page({
  data: {
    recordId: null,
    // 媒体文件
    imageFiles: [],
    videoFile: null,
    mediaType: 'image', // image | video
    
    // 上传配置
    imageGridConfig: {
      column: 4,
      width: 160,
      height: 160,
    },
    imageConfig: {
      count: 9,
    },
    
    // 内容
    content: '',
    
    // 隐私设置
    privacy: 'public',
    privacyOptions: LIFE_RECORD_PRIVACY_OPTIONS,
    privacyHint: LIFE_RECORD_PRIVACY_HINT,
    
    // 分类
    category: '',
    categories: [],
    categoryVisible: false,
    categoryIndex: [],
    
    // 标签
    allTags: [],
    selectedTags: [],
    
    // 位置
    location: '',
    
    loading: false,
    provinces: [],
    cities: [],
    cityPickVisible: false,
    cityPickValue: [],
    manualCityLabel: '',
    mapLocationNote: '',
  },
  
  async onLoad(options) {
    const { id } = options;
    if (!id) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '缺少记录ID',
      });
      wx.navigateBack();
      return;
    }
    
    this.setData({ recordId: id });
    const { provinces, cities } = createInitialProvinceCityState();
    this.setData({ provinces, cities });

    // 加载分类和标签数据
    await this.loadCategories();
    await this.loadTags();
    
    // 加载记录详情
    await this.loadRecordDetail();
  },
  
  // 加载记录详情
  async loadRecordDetail() {
    try {
      this.setData({ loading: true });
      const res = await request(`/life/detail?id=${this.data.recordId}`);
      const record = res.data || res.data?.data || {};
      const images = (record.images || []).map(resolveMediaUrl);
      const video = record.video
        ? {
            url: resolveMediaUrl(record.video.url),
            cover: resolveMediaUrl(record.video.cover),
            type: 'video',
          }
        : null;
      const catStr = record.category || '';
      const categories = this.data.categories || [];
      const catIdx = categories.findIndex((c) => c && (c.value === catStr || c.label === catStr));
      // 填充表单数据（图片/视频用完整 URL 以便预览）
      this.setData({
        content: record.content || '',
        privacy: record.privacy || 'public',
        category: catStr,
        categoryIndex: catIdx >= 0 ? [catIdx] : [],
        location: record.location || '',
        selectedTags: record.tags || [],
        mediaType: record.type || 'image',
        imageFiles: images.length ? images.map(url => ({ url, type: 'image' })) : [],
        videoFile: video,
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false });
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '加载失败，请重试',
      });
      wx.navigateBack();
    }
  },
  
  // 加载分类
  async loadCategories() {
    try {
      const res = await request('/life/categories?scope=select');
      const list = res.data || [];
      const categories = list.map((item) => ({ label: item, value: item }));
      this.setData({ categories });
    } catch (error) {
      console.error('加载分类失败', error);
    }
  },
  
  // 加载标签
  async loadTags() {
    try {
      const res = await request('/life/tags');
      const raw = res.data || [];
      this.setData({
        allTags: raw.map((item) => item.name || item),
      });
    } catch (error) {
      console.error('加载标签失败', error);
    }
  },
  
  // 选择媒体类型
  onMediaTypeChange(e) {
    // 编辑模式下不允许切换类型
    Message.warning({
      context: this,
      offset: [120, 32],
      duration: 2000,
      content: '编辑模式下不能切换类型',
    });
  },
  
  isHttpUrl(s) {
    return /^https?:\/\//i.test(String(s || '').trim());
  },

  // 图片上传成功
  handleImageSuccess(e) {
    this.setData({ imageFiles: e.detail.files || [] });
  },

  // 移除图片
  handleImageRemove(e) {
    const { index } = e.detail;
    const { imageFiles } = this.data;
    imageFiles.splice(index, 1);
    this.setData({ imageFiles });
  },

  // 视频上传成功
  handleVideoSuccess(e) {
    const files = e.detail.files;
    this.setData({ videoFile: files && files.length > 0 ? files[0] : null });
  },

  // 移除视频
  handleVideoRemove() {
    this.setData({ videoFile: null });
  },
  
  // 内容输入
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },
  
  // 选择隐私设置
  onPrivacyChange(e) {
    const { value } = e.detail;
    this.setData({ privacy: value });
  },
  
  // 显示分类选择器
  showCategoryPicker() {
    const { category, categories } = this.data;
    const index = categories.findIndex(c => c.value === category);
    this.setData({
      categoryIndex: index >= 0 ? [index] : [],
      categoryVisible: true,
    });
  },
  
  // 隐藏分类选择器
  hideCategoryPicker() {
    this.setData({ categoryVisible: false });
  },
  
  // 选择分类（兼容：detail.value 为单列索引数组，或直接为数字；选项也可能按文案匹配）
  onCategoryChange(e) {
    const detail = e.detail || {};
    const raw = detail.value;
    const { categories } = this.data;
    if (!categories || categories.length === 0) {
      this.setData({ categoryVisible: false });
      return;
    }

    let item = null;
    let indexArr = [];

    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'number' && !Number.isNaN(first)) {
        item = categories[first];
        indexArr = [first];
      } else if (typeof first === 'string' && /^\d+$/.test(first)) {
        const i = parseInt(first, 10);
        item = categories[i];
        indexArr = [i];
      } else if (first != null && first !== '') {
        item = categories.find((c) => c && (c.value === first || c.label === first));
        const idx = item ? categories.indexOf(item) : -1;
        if (idx >= 0) indexArr = [idx];
      }
    } else if (typeof raw === 'number' && !Number.isNaN(raw)) {
      item = categories[raw];
      indexArr = [raw];
    } else if (typeof raw === 'string') {
      if (/^\d+$/.test(raw)) {
        const i = parseInt(raw, 10);
        item = categories[i];
        indexArr = [i];
      } else {
        item = categories.find((c) => c && (c.value === raw || c.label === raw));
        const idx = item ? categories.indexOf(item) : -1;
        if (idx >= 0) indexArr = [idx];
      }
    }

    if (item && (item.label != null || item.value != null)) {
      this.setData({
        category: item.label != null ? item.label : item.value,
        categoryIndex: indexArr,
        categoryVisible: false,
      });
    } else {
      this.setData({ categoryVisible: false });
    }
  },
  
  // 切换标签（与发布页一致：点选高亮，再点取消）
  onTagTap(e) {
    const tag = e.currentTarget?.dataset?.tag;
    if (tag == null) return;
    let { selectedTags } = this.data;
    const idx = selectedTags.indexOf(tag);
    if (idx === -1) {
      if (selectedTags.length >= 5) {
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '最多只能选择5个标签',
        });
        return;
      }
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter((_, i) => i !== idx);
    }
    this.setData({ selectedTags });
  },

  onRemoveTag(e) {
    const tag = e.currentTarget?.dataset?.tag;
    if (tag == null) return;
    this.setData({ selectedTags: this.data.selectedTags.filter((t) => t !== tag) });
  },
  
  onLocationTap() {
    if (typeof wx.chooseLocation !== 'function') {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2500,
        content: '请使用真机，并从地图选择位置，保存的地址带城市信息，才能出现在「同城」',
      });
      return;
    }
    wx.chooseLocation({
      success: async (res) => {
        wx.showLoading({ title: '解析地址中…', mask: true });
        try {
          const enriched = await enrichAddressFromLocation(res.latitude, res.longitude);
          const location = buildLocationLabel(res, enriched);
          this.setData({
            location,
            mapLocationNote: location,
            manualCityLabel: '',
            cityPickValue: [],
          });
        } finally {
          wx.hideLoading();
        }
      },
      fail: (err) => {
        if ((err && err.errMsg || '').includes('cancel')) return;
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2500,
          content: '打开地图失败，请检查定位权限后重试',
        });
      },
    });
  },

  onClearLocation() {
    this.setData({
      location: '',
      mapLocationNote: '',
      manualCityLabel: '',
      cityPickValue: [],
    });
  },

  showCityPicker() {
    const { provinces, cityPickValue } = this.data;
    const firstPv = provinces[0] && provinces[0].value;
    let cities = firstPv ? getCitiesOfProvince(firstPv) : [];
    if (cityPickValue && cityPickValue.length >= 1) {
      cities = getCitiesOfProvince(cityPickValue[0]);
    }
    this.setData({ cityPickVisible: true, cities });
  },

  hideCityPicker() {
    this.setData({ cityPickVisible: false });
  },

  onCityPickColumnChange(e) {
    const { column, index } = e.detail;
    const { provinces } = this.data;
    if (column === 0 && provinces[index]) {
      const cities = getCitiesOfProvince(provinces[index].value);
      this.setData({ cities });
    }
  },

  onCityPickChange(e) {
    const { value, label } = e.detail;
    const text = Array.isArray(label) ? label.join(' ') : '';
    this.setData({
      cityPickValue: value || [],
      manualCityLabel: text,
      location: text,
      mapLocationNote: '',
      cityPickVisible: false,
    });
  },
  
  // 验证表单
  validateForm() {
    const { content, mediaType, imageFiles, videoFile, category } = this.data;
    
    if (!content.trim()) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请输入内容描述',
      });
      return false;
    }
    
    if (mediaType === 'image' && imageFiles.length === 0) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请至少上传一张图片',
      });
      return false;
    }
    
    if (mediaType === 'video' && !videoFile) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请上传视频',
      });
      return false;
    }
    
    if (!category) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请选择分类',
      });
      return false;
    }
    
    return true;
  },
  
  /** 将本地/待上传文件走接口，与发布页一致，得到最终图片 URL 列表 */
  async resolveImageUrls(imageFiles) {
    const out = [];
    for (const file of imageFiles) {
      const u = file.url || '';
      if (file.tempFilePath || !this.isHttpUrl(u)) {
        const uploaded = await this.uploadImages([file]);
        if (uploaded[0]) out.push(uploaded[0]);
      } else {
        out.push(u);
      }
    }
    return out;
  },

  // 更新记录
  async updateRecord() {
    if (!this.validateForm()) {
      return;
    }

    const { recordId, content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;

    const recordData = {
      id: recordId,
      content: content.trim(),
      privacy,
      category,
      tags: selectedTags,
      location: location || null,
    };

    try {
      wx.showLoading({ title: '更新中...', mask: true });

      if (mediaType === 'image') {
        recordData.images = await this.resolveImageUrls(imageFiles);
      } else if (mediaType === 'video' && videoFile) {
        if (videoFile.tempFilePath || !this.isHttpUrl(videoFile.url || '')) {
          recordData.video = await this.uploadVideo(videoFile);
        } else {
          recordData.video = {
            url: videoFile.url,
            cover: videoFile.cover || videoFile.thumb || videoFile.url,
            duration: videoFile.duration != null ? videoFile.duration : 0,
          };
        }
      }

      await request('/life/record', 'PUT', recordData);
      
      wx.hideLoading();
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '更新成功',
      });
      
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          success: () => {
            // 通知上一个页面刷新
            const pages = getCurrentPages();
            if (pages.length > 1) {
              const prevPage = pages[pages.length - 2];
              if (prevPage.route === 'pages/my-life-records/index') {
                prevPage.loadMyRecords && prevPage.loadMyRecords(true);
              }
            }
          },
        });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      console.error('更新失败', error);
      const msg =
        (error && error.message) ||
        (error && error.data && error.data.message) ||
        '更新失败，请重试';
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2500,
        content: msg !== '请求失败' ? msg : '更新失败，请重试',
      });
    }
  },

  /** 将本地图片上传到服务器，返回 URL 数组（与发布页一致） */
  async uploadImages(files) {
    const token = wx.getStorageSync('access_token');
    const baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    const urls = [];
    for (const file of files) {
      const filePath = file.tempFilePath || file.url;
      if (!filePath) continue;
      const res = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${baseUrl}/upload/image`,
          filePath,
          name: 'image',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success: resolve,
          fail: reject,
        });
      });
      if (res.statusCode !== 200) {
        let errMsg = '图片上传失败';
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (data && data.message) errMsg = data.message;
        } catch (_) {}
        throw new Error(errMsg);
      }
      let data;
      try {
        data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      } catch (_) {
        throw new Error('图片上传响应异常');
      }
      if (data.code !== 200 || !data.data || !data.data.url) {
        throw new Error((data && data.message) || '图片上传失败');
      }
      urls.push(data.data.url);
    }
    return urls;
  },

  async uploadVideo(file) {
    const token = wx.getStorageSync('access_token');
    const baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    const filePath = file.tempFilePath || file.url;
    if (!filePath) throw new Error('请先选择视频');
    const res = await new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/upload/video`,
        filePath,
        name: 'video',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: resolve,
        fail: reject,
      });
    });
    if (res.statusCode !== 200) {
      let errMsg = '视频上传失败';
      try {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        if (data && data.message) errMsg = data.message;
      } catch (_) {}
      throw new Error(errMsg);
    }
    let data;
    try {
      data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    } catch (_) {
      throw new Error('视频上传响应异常');
    }
    if (data.code !== 200 || !data.data || !data.data.url) {
      throw new Error((data && data.message) || '视频上传失败');
    }
    return {
      url: data.data.url,
      cover: data.data.cover || data.data.url,
      duration: data.data.duration != null ? data.data.duration : (file.duration || 0),
    };
  },
});
