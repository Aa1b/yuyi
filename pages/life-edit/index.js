// pages/life-edit/index.js
import config from '~/config';
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';

  const legacyHost = 'http://149.104.29.197:5678';

  // 兼容老数据：老 IP 地址
  if (url.startsWith(legacyHost)) {
    const base = (config.baseUrl || '').replace(/\/api\/?$/, '');
    const path = url.slice(legacyHost.length);
    return base + (path.startsWith('/') ? path : '/' + path);
  }

  if (/^https?:\/\//i.test(url)) return url;
  const base = (config.baseUrl || '').replace(/\/api\/?$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

// 腾讯地图 WebService Key（与发布页保持一致）
const TENCENT_MAP_KEY = 'LITBZ-IDMWA-5D3KD-CURMW-MHJ4J-2SFMX';

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
    privacyOptions: [
      { label: '公开', value: 'public', icon: 'globe' },
      { label: '好友可见', value: 'friends', icon: 'user' },
      { label: '私密', value: 'private', icon: 'lock-on' },
    ],
    
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
      // 填充表单数据（图片/视频用完整 URL 以便预览）
      this.setData({
        content: record.content || '',
        privacy: record.privacy || 'public',
        category: record.category || '',
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
      const res = await request('/life/categories');
      const categories = (res.data.data || []).map(item => ({ label: item, value: item }));
      this.setData({ categories });
    } catch (error) {
      console.error('加载分类失败', error);
    }
  },
  
  // 加载标签
  async loadTags() {
    try {
      const res = await request('/life/tags');
      this.setData({
        allTags: (res.data.data || []).map(item => item.name || item),
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
  
  // 图片上传成功
  handleImageSuccess(e) {
    const { files } = e.detail;
    this.setData({ imageFiles: files });
  },
  
  // 移除图片
  handleImageRemove(e) {
    const { index } = e.detail;
    const { imageFiles } = this.data;
    imageFiles.splice(index, 1);
    this.setData({ imageFiles: [...imageFiles] });
  },
  
  // 视频上传成功
  handleVideoSuccess(e) {
    const { files } = e.detail;
    if (files && files.length > 0) {
      this.setData({ videoFile: files[0] });
    }
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
  
  // 选择分类
  onCategoryChange(e) {
    const { value } = e.detail;
    const { categories } = this.data;
    if (value && value[0] !== undefined) {
      this.setData({
        category: categories[value[0]].label,
        categoryIndex: value,
        categoryVisible: false,
      });
    }
  },
  
  // 切换标签选择
  onTagToggle(e) {
    const { checked } = e.detail;
    const { tag } = e.currentTarget.dataset;
    let { selectedTags } = this.data;
    
    if (checked) {
      if (selectedTags.length >= 5) {
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '最多只能选择5个标签',
        });
        return;
      }
      if (selectedTags.indexOf(tag) === -1) {
        selectedTags.push(tag);
      }
    } else {
      const index = selectedTags.indexOf(tag);
      if (index > -1) {
        selectedTags.splice(index, 1);
      }
    }
    
    this.setData({ selectedTags: [...selectedTags] });
  },
  
  // 获取位置（腾讯地图逆地理编码 + 备用地图选点）
  async gotoMap() {
    const that = this;
    try {
      const locRes = await wx.getLocation({
        type: 'gcj02',
      });
      const { latitude, longitude } = locRes;

      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        method: 'GET',
        data: {
          location: `${latitude},${longitude}`,
          key: TENCENT_MAP_KEY,
          get_poi: 1,
        },
        success(res) {
          if (res.data && res.data.status === 0) {
            const result = res.data.result;
            const recommend = result.formatted_addresses
              ? (result.formatted_addresses.recommend || result.address)
              : result.address;

            that.setData({
              location: recommend,
            });
          } else {
            that.useChooseLocationFallback();
          }
        },
        fail() {
          that.useChooseLocationFallback();
        },
      });
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '请在设置中打开定位权限',
        });
      } else {
        this.useChooseLocationFallback();
      }
    }
  },

  // 微信内置地图选点备用方案
  useChooseLocationFallback() {
    wx.chooseLocation({
      success: (result) => {
        this.setData({
          location: result.name || result.address,
        });
      },
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
      
      // 如果有新上传的媒体文件需要上传
      if (mediaType === 'image' && imageFiles.some(f => f.tempFilePath || !f.url)) {
        const newImages = await this.uploadNewImages(imageFiles.filter(f => f.tempFilePath || !f.url));
        recordData.images = [...imageFiles.filter(f => f.url && !f.tempFilePath).map(f => f.url), ...newImages];
      } else if (mediaType === 'video' && videoFile && (videoFile.tempFilePath || !videoFile.url)) {
        const uploadedVideo = await this.uploadVideo(videoFile);
        recordData.video = uploadedVideo;
      }
      
      // 提交到服务器
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
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '更新失败，请重试',
      });
    }
  },
  
  // 上传新图片
  async uploadNewImages(files) {
    // TODO: 实际项目中需要使用 wx.cloud.uploadFile 上传到云存储
    return files.map(file => file.url || file.tempFilePath);
  },
  
  // 上传视频
  async uploadVideo(file) {
    // TODO: 实际项目中需要使用 wx.cloud.uploadFile 上传到云存储
    return {
      url: file.url || file.tempFilePath,
      cover: file.thumb || file.url || file.tempFilePath,
      duration: file.duration || 0,
    };
  },
});
