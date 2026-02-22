// pages/release/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  /**
   * 页面的初始数据
   */
  data: {
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
      count: 9, // 最多9张图片
    },
    
    // 标题与内容
    title: '',
    content: '',
    
    // 隐私设置: public | private | friends
    privacy: 'public',
    privacyOptions: [
      { label: '公开', value: 'public', icon: 'globe' },
      { label: '好友可见', value: 'friends', icon: 'user' },
      { label: '私密', value: 'private', icon: 'lock-on' },
    ],
    
    // 分类（初始用默认列表，接口返回后会覆盖）
    category: '',
    categoryList: ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'],
    categoryIndex: 0,
    
    // 标签：可选列表来自接口或默认，已选初始为空
    tagOptions: ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'],
    selectedTags: [],
    
    // 位置
    location: '',
    tagInput: '',
    isAdmin: false,
  },
  
  async onLoad() {
    await this.loadCategories();
    await this.loadTags();
    await this.checkAdmin();
  },

  async checkAdmin() {
    try {
      const res = await request('/auth/profile');
      this.setData({ isAdmin: !!res?.data?.isAdmin });
    } catch (e) {
      this.setData({ isAdmin: false });
    }
  },
  
  // 默认分类与标签（接口为空时使用）
  getDefaultCategories() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'];
  },
  getDefaultTags() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'];
  },

  async loadCategories() {
    try {
      const res = await request('/life/categories');
      const list = res?.data ?? [];
      let names = Array.isArray(list) ? list : [];
      if (names.length === 0) names = this.getDefaultCategories();
      const category = this.data.category;
      const categoryIndex = names.indexOf(category);
      this.setData({
        categoryList: names,
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
      });
    } catch (error) {
      console.error('加载分类失败', error);
      const names = this.getDefaultCategories();
      this.setData({ categoryList: names, categoryIndex: 0 });
    }
  },

  async loadTags() {
    try {
      const res = await request('/life/tags');
      const list = res?.data ?? [];
      const raw = Array.isArray(list) ? list : [];
      let names = raw.map(item => (item && item.name) ? item.name : item).filter(Boolean);
      if (names.length === 0) names = this.getDefaultTags();
      this.setData({ tagOptions: names });
    } catch (error) {
      console.error('加载标签失败', error);
      this.setData({ tagOptions: this.getDefaultTags() });
    }
  },
  
  // 选择媒体类型
  onMediaTypeChange(e) {
    const { value } = e.detail;
    this.setData({
      mediaType: value,
      imageFiles: [],
      videoFile: null,
    });
  },
  
  // 图片上传成功
  handleImageSuccess(e) {
    const { files } = e.detail;
    this.setData({
      imageFiles: files,
    });
  },
  
  // 移除图片
  handleImageRemove(e) {
    const { index } = e.detail;
    const { imageFiles } = this.data;
    imageFiles.splice(index, 1);
    this.setData({
      imageFiles,
    });
  },
  
  // 视频上传成功
  handleVideoSuccess(e) {
    const { files } = e.detail;
    if (files && files.length > 0) {
      this.setData({
        videoFile: files[0],
      });
    }
  },
  
  // 移除视频
  handleVideoRemove() {
    this.setData({
      videoFile: null,
    });
  },
  
  // 内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value,
    });
  },
  
  // 选择隐私设置
  onPrivacyChange(e) {
    const { value } = e.detail;
    this.setData({
      privacy: value,
    });
  },
  
  onCategoryChange(e) {
    const idx = e.detail && e.detail.value != null ? Number(e.detail.value) : 0;
    const list = this.data.categoryList && this.data.categoryList.length ? this.data.categoryList : this.getDefaultCategories();
    const category = list[idx];
    this.setData({ categoryIndex: idx, category: category || '' });
  },
  
  // 点击标签切换选中（不依赖 t-check-tag 的 change）
  onTagTap(e) {
    const tag = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tag;
    if (tag == null) return;
    let { selectedTags } = this.data;
    const idx = selectedTags.indexOf(tag);
    if (idx === -1) {
      if (selectedTags.length >= 5) {
        Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '最多选择5个标签' });
        return;
      }
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter((_, i) => i !== idx);
    }
    this.setData({ selectedTags });
  },

  onRemoveTag(e) {
    const tag = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tag;
    if (tag == null) return;
    const selectedTags = this.data.selectedTags.filter((t) => t !== tag);
    this.setData({ selectedTags });
  },

  onTagInputChange(e) {
    const v = (e.detail && e.detail.value) != null ? e.detail.value : e.detail;
    this.setData({ tagInput: String(v || '').trim() });
  },

  onAddTagConfirm() {
    const tag = String(this.data.tagInput || '').trim().replace(/^#/, '');
    if (!tag) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请输入标签' });
      return;
    }
    let { selectedTags, tagOptions } = this.data;
    if (selectedTags.length >= 5) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '最多选择5个标签' });
      return;
    }
    if (selectedTags.indexOf(tag) === -1) selectedTags = [...selectedTags, tag];
    if (tagOptions.indexOf(tag) === -1) tagOptions = [...tagOptions, tag];
    this.setData({ selectedTags, tagOptions, tagInput: '' });
  },
  
  // 所在位置点击：尝试打开地图选点（真机有效）；开发工具中可在下方输入框填写
  onLocationTap() {
    if (typeof wx.chooseLocation !== 'function') {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请在下方的输入框中填写位置' });
      return;
    }
    wx.chooseLocation({
      success: (res) => {
        this.setData({ location: res.name || res.address || '' });
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.includes('cancel')) return;
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2500,
          content: '选点失败（需真机或授权），请在下方的输入框中填写位置',
        });
      },
    });
  },

  onLocationInput(e) {
    const v = e.detail;
    const location = (v && (v.value !== undefined ? v.value : v)) ?? '';
    this.setData({ location: String(location).trim() });
  },
  
  onTitleInput(e) {
    const v = (e.detail && e.detail.value) != null ? e.detail.value : e.detail;
    this.setData({ title: v == null ? '' : String(v) });
  },

  // 验证表单
  validateForm() {
    const { title, content, mediaType, imageFiles, videoFile, category } = this.data;
    
    if (!(title && title.trim()) && !(content && content.trim())) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请填写标题或内容',
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
  
  // 保存草稿（提交到服务器，出现在草稿箱）
  async saveDraft() {
    const { title, content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;
    const hasContent = (title && title.trim()) || (content && content.trim()) || (mediaType === 'image' && imageFiles.length > 0) || (mediaType === 'video' && videoFile);
    if (!hasContent) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请至少填写内容或添加一张图片/视频',
      });
      return;
    }
    const recordData = {
      title: (title || '').trim(),
      content: (content || '').trim(),
      type: mediaType,
      images: mediaType === 'image' ? imageFiles.map(f => f.url) : [],
      video: mediaType === 'video' && videoFile ? { url: videoFile.url, cover: videoFile.thumb || videoFile.url, duration: videoFile.duration || 0 } : null,
      privacy: privacy || 'public',
      category: category || null,
      tags: selectedTags || [],
      location: location || null,
      publishStatus: 'draft',
    };
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      if (mediaType === 'image' && imageFiles.length > 0) {
        recordData.images = await this.uploadImages(imageFiles);
      } else if (mediaType === 'video' && videoFile) {
        recordData.video = await this.uploadVideo(videoFile);
      }
      await request('/life/record', 'POST', recordData);
      wx.hideLoading();
      wx.removeStorageSync('life_record_draft');
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '草稿已保存' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/my-life-records/index?publishStatus=draft' });
      }, 800);
    } catch (e) {
      wx.hideLoading();
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '保存草稿失败，请重试' });
    }
  },
  
  // 发布（提交审核，通过后才会在首页展示）
  async release() {
    if (!this.validateForm()) return;
    await this.submitPublish('pending', '提交中...', '已提交审核，通过后将在首页展示', '/pages/my-life-records/index?publishStatus=pending');
  },

  // 直接发布（免审，仅管理员可用）
  async releaseDirect() {
    if (!this.validateForm()) return;
    await this.submitPublish('published', '发布中...', '已发布', '/pages/home/index?oper=release');
  },

  async submitPublish(publishStatus, loadingText, successText, navigateUrl) {
    const { title, content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;
    const recordData = {
      title: (title || '').trim(),
      content: (content || '').trim(),
      type: mediaType,
      images: mediaType === 'image' ? imageFiles.map(file => file.url) : [],
      video: mediaType === 'video' && videoFile ? {
        url: videoFile.url,
        cover: videoFile.thumb || videoFile.url,
        duration: videoFile.duration || 0,
      } : null,
      privacy,
      category,
      tags: selectedTags,
      location: location || null,
      publishStatus,
    };
    try {
      wx.showLoading({ title: loadingText, mask: true });
      if (mediaType === 'image' && imageFiles.length > 0) {
        recordData.images = await this.uploadImages(imageFiles);
      } else if (mediaType === 'video' && videoFile) {
        recordData.video = await this.uploadVideo(videoFile);
      }
      await request('/life/record', 'POST', recordData);
      wx.hideLoading();
      wx.removeStorageSync('life_record_draft');
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: successText });
      setTimeout(() => {
        if (navigateUrl.startsWith('/pages/home')) {
          wx.reLaunch({ url: navigateUrl });
        } else {
          wx.navigateTo({ url: navigateUrl });
        }
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      Message.error({ context: this, offset: [120, 32], duration: 2000, content: '提交失败，请重试' });
    }
  },
  
  // 上传图片到云存储
  async uploadImages(files) {
    /**
     * 实际项目中使用云存储的示例代码：
     * 
     * 1. 首先需要在 app.js 中初始化云开发：
     *    wx.cloud.init({
     *      env: 'your-env-id',
     *      traceUser: true,
     *    });
     * 
     * 2. 上传图片：
     *    const uploadPromises = files.map(file => {
     *      const filePath = file.url || file.tempFilePath;
     *      const cloudPath = `images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
     *      return wx.cloud.uploadFile({
     *        cloudPath,
     *        filePath,
     *      }).then(res => res.fileID);
     *    });
     *    return await Promise.all(uploadPromises);
     * 
     * 3. 或者使用后端API上传：
     *    const formData = new FormData();
     *    files.forEach(file => formData.append('files', file));
     *    const res = await request('/upload/images', 'POST', formData);
     *    return res.data.urls;
     */
    
    // 模拟实现：直接返回临时路径或已有URL
    return files.map(file => file.url || file.tempFilePath);
  },
  
  // 上传视频到云存储
  async uploadVideo(file) {
    /**
     * 实际项目中使用云存储的示例代码：
     * 
     * 1. 上传视频文件：
     *    const filePath = file.url || file.tempFilePath;
     *    const cloudPath = `videos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
     *    const uploadRes = await wx.cloud.uploadFile({
     *      cloudPath,
     *      filePath,
     *    });
     * 
     * 2. 获取视频封面（如果需要）：
     *    const coverPath = `video-covers/${Date.now()}.jpg`;
     *    // 使用 wx.getVideoInfo 获取视频信息，然后截图生成封面
     * 
     * 3. 返回视频信息：
     *    return {
     *      url: uploadRes.fileID,
     *      cover: coverFileID,
     *      duration: file.duration || 0,
     *    };
     * 
     * 4. 或者使用后端API上传：
     *    const formData = new FormData();
     *    formData.append('video', file);
     *    const res = await request('/upload/video', 'POST', formData);
     *    return res.data;
     */
    
    // 模拟实现：直接返回临时路径或已有URL
    return {
      url: file.url || file.tempFilePath,
      cover: file.thumb || file.url || file.tempFilePath,
      duration: file.duration || 0,
    };
  },
});
