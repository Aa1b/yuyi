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
    
    // 内容
    content: '',
    
    // 隐私设置: public | private | friends
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
  },
  
  async onLoad() {
    // 加载分类和标签数据
    await this.loadCategories();
    await this.loadTags();
  },
  
  // 加载分类
  async loadCategories() {
    try {
      const res = await request('/life/categories');
      const list = res?.data ?? [];
      const categoryOptions = Array.isArray(list) ? list.map(item => ({ label: item, value: item })) : [];
      this.setData({ categories: categoryOptions });
    } catch (error) {
      console.error('加载分类失败', error);
    }
  },
  
  // 加载标签
  async loadTags() {
    try {
      const res = await request('/life/tags');
      const list = res?.data ?? [];
      const raw = Array.isArray(list) ? list : [];
      this.setData({
        allTags: raw.map(item => (item && item.name) ? item.name : item),
      });
    } catch (error) {
      console.error('加载标签失败', error);
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
  
  // 显示分类选择器
  showCategoryPicker() {
    this.setData({
      categoryVisible: true,
    });
  },
  
  // 隐藏分类选择器
  hideCategoryPicker() {
    this.setData({
      categoryVisible: false,
    });
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
        // 阻止选中
        this.setData({
          [`tagChecked_${tag}`]: false,
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
    
    this.setData({
      selectedTags: [...selectedTags],
    });
  },
  
  // 获取位置
  async gotoMap() {
    try {
      const res = await wx.chooseLocation({
        success: (result) => {
          this.setData({
            location: result.name || result.address,
          });
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
  
  // 保存草稿
  saveDraft() {
    // 保存到本地存储
    const draft = {
      content: this.data.content,
      imageFiles: this.data.imageFiles,
      videoFile: this.data.videoFile,
      mediaType: this.data.mediaType,
      privacy: this.data.privacy,
      category: this.data.category,
      selectedTags: this.data.selectedTags,
      location: this.data.location,
    };
    
    wx.setStorageSync('life_record_draft', draft);
    
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 2000,
      content: '草稿已保存',
    });
  },
  
  // 发布
  async release() {
    if (!this.validateForm()) {
      return;
    }
    
    const { content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;
    
    // 准备数据
    const recordData = {
      content: content.trim(),
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
    };
    
    try {
      wx.showLoading({
        title: '发布中...',
        mask: true,
      });
      
      // 如果有媒体文件需要上传，先上传到云存储
      if (mediaType === 'image' && imageFiles.length > 0) {
        recordData.images = await this.uploadImages(imageFiles);
      } else if (mediaType === 'video' && videoFile) {
        const uploadedVideo = await this.uploadVideo(videoFile);
        recordData.video = uploadedVideo;
      }
      
      // 提交到服务器
      await request('/life/record', 'POST', recordData);
      
      wx.hideLoading();
      
      // 清除草稿
      wx.removeStorageSync('life_record_draft');
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '发布成功',
      });
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/home/index?oper=release',
        });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      console.error('发布失败', error);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '发布失败，请重试',
      });
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
