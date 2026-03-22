// pages/release/index.js
import config from '~/config';
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';
import { getSetting, SETTING_KEYS } from '~/utils/settings';

Page({
  data: {
    imageFiles: [],
    videoFile: null,
    mediaType: 'image',
    imageGridConfig: { column: 4, width: 160, height: 160 },
    imageConfig: { count: 9 },
    title: '',
    content: '',
    privacy: getSetting(SETTING_KEYS.DEFAULT_PRIVACY) || 'public',
    privacyOptions: [
      { label: '公开', value: 'public', icon: 'globe' },
      { label: '好友可见', value: 'friends', icon: 'user' },
      { label: '私密', value: 'private', icon: 'lock-on' },
    ],
    category: '',
    categoryList: ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'],
    categoryIndex: 0,
    tagOptions: ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'],
    selectedTags: [],
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

  getDefaultCategories() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '工作', '其他'];
  },
  getDefaultTags() {
    return ['日常', '旅行', '美食', '心情', '运动', '学习', '记录'];
  },

  async loadCategories() {
    try {
      const res = await request('/life/categories?scope=select');
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
      this.setData({ categoryList: this.getDefaultCategories(), categoryIndex: 0 });
    }
  },

  async loadTags() {
    try {
      const res = await request('/life/tags');
      const list = res?.data ?? [];
      const raw = Array.isArray(list) ? list : [];
      const fromApi = raw.map((item) => (item && item.name ? item.name : item)).filter(Boolean);
      // 仅使用后端返回的可选标签（禁用项不会出现在列表中）；无数据时退回默认
      this.setData({
        tagOptions: fromApi.length > 0 ? fromApi : this.getDefaultTags(),
      });
    } catch (error) {
      console.error('加载标签失败', error);
      this.setData({ tagOptions: this.getDefaultTags() });
    }
  },

  onMediaTypeChange(e) {
    const { value } = e.detail;
    this.setData({ mediaType: value, imageFiles: [], videoFile: null });
  },

  handleImageSuccess(e) {
    this.setData({ imageFiles: e.detail.files || [] });
  },

  handleImageRemove(e) {
    const { index } = e.detail;
    const { imageFiles } = this.data;
    imageFiles.splice(index, 1);
    this.setData({ imageFiles });
  },

  handleVideoSuccess(e) {
    const files = e.detail.files;
    this.setData({ videoFile: files && files.length > 0 ? files[0] : null });
  },

  handleVideoRemove() {
    this.setData({ videoFile: null });
  },

  onContentInput(e) {
    const v = (e.detail && e.detail.value) !== undefined ? e.detail.value : e.detail;
    this.setData({ content: v != null ? String(v) : '' });
  },

  onPrivacyChange(e) {
    this.setData({ privacy: e.detail.value });
  },

  onCategoryChange(e) {
    const idx = e.detail && e.detail.value != null ? Number(e.detail.value) : 0;
    const list = this.data.categoryList && this.data.categoryList.length ? this.data.categoryList : this.getDefaultCategories();
    const category = list[idx];
    this.setData({ categoryIndex: idx, category: category || '' });
  },

  onTagTap(e) {
    const tag = e.currentTarget?.dataset?.tag;
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
    const tag = e.currentTarget?.dataset?.tag;
    if (tag == null) return;
    this.setData({ selectedTags: this.data.selectedTags.filter(t => t !== tag) });
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

  onLocationTap() {
    if (typeof wx.chooseLocation !== 'function') {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请在下方的输入框中填写位置' });
      return;
    }
    wx.chooseLocation({
      success: (res) => this.setData({ location: res.name || res.address || '' }),
      fail: (err) => {
        if ((err && err.errMsg || '').includes('cancel')) return;
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
    const v = e.detail && e.detail.value;
    this.setData({ title: v != null ? String(v) : '' });
  },

  validateForm() {
    const { title, content, mediaType, imageFiles, videoFile, category } = this.data;
    if (!(title && title.trim()) && !(content && content.trim())) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请填写标题或内容' });
      return false;
    }
    if (mediaType === 'image' && imageFiles.length === 0) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请至少上传一张图片' });
      return false;
    }
    if (mediaType === 'video' && !videoFile) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请上传视频' });
      return false;
    }
    if (!category) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请选择分类' });
      return false;
    }
    return true;
  },

  async saveDraft() {
    const { title, content, mediaType, imageFiles, videoFile, privacy, category, selectedTags, location } = this.data;
    const hasContent = (title && title.trim()) || (content && content.trim()) || (mediaType === 'image' && imageFiles.length > 0) || (mediaType === 'video' && videoFile);
    if (!hasContent) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请至少填写内容或添加一张图片/视频' });
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
      const msg = (e && e.message) || (e && e.data && e.data.message);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2500,
        content: msg && msg !== '请求失败' ? msg : '保存草稿失败，请重试',
      });
    }
  },

  async release() {
    if (!this.validateForm()) return;
    await this.submitPublish('pending', '提交中...', '已提交审核，通过后将在首页展示', '/pages/home/index?oper=pending');
  },

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
      const msg = (error && error.message) || (error && error.data && error.data.message);
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2500,
        content: msg && msg !== '请求失败' ? `${msg}` : '发布失败，请重试',
      });
    }
  },

  /** 将本地图片上传到服务器，返回 URL 数组 */
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

  /** 将本地视频上传到服务器，返回 { url, cover, duration } */
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
