// pages/life-detail/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    recordId: null,
    record: null,
    comments: [],
    commentContent: '',
    showCommentInput: false,
    loading: false,
  },
  
  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({
        recordId: id,
      });
      this.loadDetail();
    }
  },
  
  // 加载详情
  async loadDetail() {
    try {
      this.setData({ loading: true });
      const res = await request(`/life/detail?id=${this.data.recordId}`);
      const record = res?.data ?? {};
      this.setData({
        record,
        comments: record.comments ?? [],
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
    }
  },
  
  // 点赞/取消点赞
  async handleLike() {
    const { record } = this.data;
    if (!record) return;
    
    const { id, isLiked } = record;
    
    try {
      if (isLiked) {
        const res = await request(`/life/like?recordId=${id}`, 'DELETE');
        this.setData({
          'record.isLiked': false,
          'record.likeCount': res?.data?.likeCount ?? (record.likeCount || 0) - 1,
        });
      } else {
        const res = await request('/life/like', 'POST', { recordId: id });
        this.setData({
          'record.isLiked': true,
          'record.likeCount': res?.data?.likeCount ?? (record.likeCount || 0) + 1,
        });
      }
    } catch (error) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '操作失败，请重试',
      });
    }
  },
  
  // 显示评论输入框
  showCommentInput() {
    this.setData({
      showCommentInput: true,
    });
  },
  
  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      commentContent: '',
    });
  },
  
  // 评论内容输入
  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value,
    });
  },
  
  // 提交评论
  async submitComment() {
    const { commentContent, recordId } = this.data;
    
    if (!commentContent.trim()) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请输入评论内容',
      });
      return;
    }
    
    try {
      const res = await request('/life/comment', 'POST', {
        recordId,
        content: commentContent.trim(),
      });
      
      const { comments, record } = this.data;
      const newComment = res?.data ?? null;
      if (newComment) comments.push(newComment);
      
      this.setData({
        comments: [...comments],
        'record.commentCount': (record.commentCount || 0) + 1,
        commentContent: '',
        showCommentInput: false,
      });
      
      Message.success({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '评论成功',
      });
    } catch (error) {
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '评论失败，请重试',
      });
    }
  },
  
  // 播放视频
  handleVideoPlay() {
    const { record } = this.data;
    if (record && record.video && record.video.url) {
      const videoContext = wx.createVideoContext('life-detail-video', this);
      videoContext.play();
    }
  },
  
  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { record } = this.data;
    if (record && record.images) {
      wx.previewImage({
        current: record.images[index],
        urls: record.images,
      });
    }
  },
});
