// pages/life-edit/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

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
    
    // 标题与内容
    title: '',
    content: '',
    
    // 隐私设置
    privacy: 'public',
    privacyOptions: [
      { label: '公开', value: 'public', icon: 'globe' },
      { label: '好友可见', value: 'friends', icon: 'user' },
      { label: '私密', value: 'private', icon: 'lock-on' },
    ],
    
    // 分类（与发布页一致：categoryList 字符串数组 + categoryIndex 数字）
    category: '',
    categoryList: ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'],
    categoryIndex: 0,
    
    // 标签（与发布页一致：tagOptions 可选列表 + selectedTags + tagInput）
    tagOptions: ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'],
    selectedTags: [],
    tagInput: '',
    
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
      const record = res?.data ?? {};
      const category = record.category || '';
      const categoryList = this.data.categoryList && this.data.categoryList.length ? this.data.categoryList : this.getDefaultCategories();
      const categoryIndex = categoryList.indexOf(category);
      this.setData({
        title: record.title || '',
        content: record.content || '',
        privacy: record.privacy || 'public',
        category,
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        categoryList,
        location: record.location || '',
        selectedTags: record.tags || [],
        tagOptions: this.data.tagOptions && this.data.tagOptions.length ? this.data.tagOptions : this.getDefaultTags(),
        mediaType: record.type || 'image',
        imageFiles: record.images ? record.images.map(url => (typeof url === 'string' ? { url, type: 'image' } : { ...url, type: 'image' })) : [],
        videoFile: record.video ? { url: record.video.url, cover: record.video.cover, type: 'video' } : null,
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
  
  getDefaultCategories() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'];
  },
  getDefaultTags() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'];
  },

  // 加载分类（与发布页一致：categoryList 字符串数组，categoryIndex 由 loadRecordDetail 根据当前记录设置）
  async loadCategories() {
    try {
      const res = await request('/life/categories');
      const list = res?.data ?? [];
      const names = Array.isArray(list) ? list : [];
      const categoryList = names.length > 0 ? names : this.getDefaultCategories();
      this.setData({ categoryList });
    } catch (error) {
      console.error('加载分类失败', error);
      this.setData({ categoryList: this.getDefaultCategories() });
    }
  },

  // 加载标签（与发布页一致：合并接口与默认，得到 tagOptions）
  async loadTags() {
    try {
      const res = await request('/life/tags');
      const list = res?.data ?? [];
      const raw = Array.isArray(list) ? list : [];
      const fromApi = raw.map(item => (item && item.name) ? item.name : item).filter(Boolean);
      const defaults = this.getDefaultTags();
      const merged = [...defaults];
      fromApi.forEach(name => { if (merged.indexOf(name) === -1) merged.push(name); });
      this.setData({ tagOptions: merged });
    } catch (error) {
      console.error('加载标签失败', error);
      this.setData({ tagOptions: this.getDefaultTags() });
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
  
  // 移除图片（兼容 detail.index 与 dataset.index）
  handleImageRemove(e) {
    const index = (e.detail && e.detail.index !== undefined) ? e.detail.index : (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index !== undefined ? e.currentTarget.dataset.index : null);
    if (index == null) return;
    const { imageFiles } = this.data;
    const next = imageFiles.filter((_, i) => i !== index);
    this.setData({ imageFiles: next });
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
  
  // 内容输入（与发布页一致，兼容 detail 结构）
  onContentInput(e) {
    const v = (e.detail && e.detail.value) !== undefined ? e.detail.value : e.detail;
    this.setData({ content: v != null ? String(v) : '' });
  },

  onTitleInput(e) {
    const v = (e.detail && e.detail.value) !== undefined ? e.detail.value : e.detail;
    this.setData({ title: v != null ? String(v) : '' });
  },
  
  // 选择隐私设置
  onPrivacyChange(e) {
    const { value } = e.detail;
    this.setData({ privacy: value });
  },
  
  // 选择分类（与发布页一致：原生 picker，e.detail.value 为下标）
  onCategoryChange(e) {
    const idx = e.detail && e.detail.value != null ? Number(e.detail.value) : 0;
    const list = this.data.categoryList && this.data.categoryList.length ? this.data.categoryList : this.getDefaultCategories();
    const category = list[idx];
    this.setData({ categoryIndex: idx, category: category || '' });
  },

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
    this.setData({ selectedTags: this.data.selectedTags.filter(t => t !== tag) });
  },

  onTagInputChange(e) {
    const v = (e.detail && e.detail.value) != null ? e.detail.value : e.detail;
    this.setData({ tagInput: v == null ? '' : String(v).trim() });
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

  // 获取位置
  async gotoMap() {
    try {
      await wx.chooseLocation({
        success: (result) => {
          this.setData({ location: result.name || result.address });
        },
      });
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        Message.warning({
          context: this,
          offset: [120, 32],
          duration: 2000,
          content: '请允许获取位置权限',
        });
      }
    }
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
  
  // 保存为草稿（不发布）
  async updateRecordAsDraft() {
    if (!this.validateForm()) return;
    await this.submitUpdate('draft');
  },

  // 更新记录（保存并发布）
  async updateRecord() {
    if (!this.validateForm()) return;
    await this.submitUpdate('published');
  },

  async submitUpdate(publishStatus) {
    const { recordId, title, content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;
    
    const recordData = {
      id: recordId,
      title: (title || '').trim(),
      content: (content || '').trim(),
      privacy,
      category,
      tags: selectedTags,
      location: location || null,
      publishStatus,
    };
    
    try {
      wx.showLoading({ title: publishStatus === 'draft' ? '保存草稿中...' : '更新中...', mask: true });
      
      // 如果有新上传的媒体文件需要上传
      if (mediaType === 'image' && imageFiles.some(f => f.tempFilePath || !f.url)) {
        const newImages = await this.uploadNewImages(imageFiles.filter(f => f.tempFilePath || !f.url));
        recordData.images = [...imageFiles.filter(f => f.url && !f.tempFilePath).map(f => f.url), ...newImages];
      } else if (mediaType === 'video' && videoFile && (videoFile.tempFilePath || !videoFile.url)) {
        const uploadedVideo = await this.uploadVideo(videoFile);
        recordData.video = uploadedVideo;
      }
      
      await request('/life/record', 'PUT', recordData);
      
      wx.hideLoading();
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: publishStatus === 'draft' ? '草稿已保存' : '更新成功',
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
