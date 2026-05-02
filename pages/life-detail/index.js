// pages/life-detail/index.js
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';
import { formatDateTime } from '~/utils/time';
import resolveMediaUrl from '~/utils/resolveMediaUrl';
import { getLifePrivacyLabel } from '~/utils/privacyLabels';

Page({
  data: {
    recordId: null,
    record: null,
    comments: [],
    commentTotal: 0,
    commentContent: '',
    showCommentInput: false,
    replyingTo: null, // { id, userName } 回复某条评论时
    scrollToCommentId: null,
    loading: false,
  },

  onLoad(options) {
    const { id, commentId } = options;
    if (id) {
      this.setData({
        recordId: id,
        scrollToCommentId: commentId || null,
      });
      this.loadDetail();
    }
  },
  
  // 加载详情
  async loadDetail() {
    try {
      this.setData({ loading: true });
      const res = await request(`/life/detail?id=${this.data.recordId}`);
      const raw = res.data || {};
      const record = { ...raw };
      if (record.avatar) {
        record.avatar = resolveMediaUrl(record.avatar);
      }
      if (record.images && record.images.length) {
        record.images = record.images.map(resolveMediaUrl);
      }
      if (record.video) {
        record.video = {
          ...record.video,
          url: resolveMediaUrl(record.video.url),
          cover: resolveMediaUrl(record.video.cover),
        };
      }
      const comments = (record.comments || []).map((c) => {
        const replies = (c.replies || []).map((r) => ({
          ...r,
          avatar: r.avatar ? resolveMediaUrl(r.avatar) : r.avatar,
          displayTime: formatDateTime(r.createdAt),
        }));
        return {
          ...c,
          avatar: c.avatar ? resolveMediaUrl(c.avatar) : c.avatar,
          displayTime: formatDateTime(c.createdAt),
          replies,
        };
      });
      record.displayTime = formatDateTime(record.createdAt);
      record.privacyLabel = getLifePrivacyLabel(record.privacy);
      const commentTotal = comments.reduce((s, c) => s + 1 + (c.replies ? c.replies.length : 0), 0);
      this.setData({
        record,
        comments,
        commentTotal,
        loading: false,
      });
      this.scrollToCommentIfNeeded();
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

  // 从通知进入时滚动到指定评论
  scrollToCommentIfNeeded() {
    const { scrollToCommentId } = this.data;
    if (!scrollToCommentId) return;
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.selectViewport().scrollOffset();
      query.select(`#comment-${scrollToCommentId}`).boundingClientRect();
      query.exec((res) => {
        if (res[1] && res[1].top != null) {
          const scrollTop = (res[0] && res[0].scrollTop) || 0;
          wx.pageScrollTo({
            scrollTop: scrollTop + res[1].top - 80,
            duration: 300,
          });
        }
        this.setData({ scrollToCommentId: null });
      });
    });
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
          'record.likeCount': (res.data && res.data.likeCount) != null ? res.data.likeCount : (record.likeCount || 0) - 1,
        });
      } else {
        const res = await request('/life/like', 'POST', { recordId: id });
        this.setData({
          'record.isLiked': true,
          'record.likeCount': (res.data && res.data.likeCount) != null ? res.data.likeCount : (record.likeCount || 0) + 1,
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
  
  // 显示评论输入框（可带回复目标）
  showCommentInput() {
    this.setData({
      replyingTo: null,
      showCommentInput: true,
    });
  },

  // 点击某条评论的「回复」
  onReplyTap(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      replyingTo: id ? { id, userName: name || 'Ta' } : null,
      showCommentInput: true,
    });
  },

  // 弹层显示/隐藏（仅关闭时清空，避免误触遮罩清掉已输入内容）
  onCommentPopupChange(e) {
    const { visible } = e.detail || {};
    if (visible === false) {
      this.setData({
        showCommentInput: false,
        commentContent: '',
        replyingTo: null,
      });
    }
  },

  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      commentContent: '',
      replyingTo: null,
    });
  },

  // 评论内容输入（原生 textarea：e.detail.value）
  onCommentInput(e) {
    const v = e.detail && e.detail.value;
    this.setData({
      commentContent: v != null ? String(v) : '',
    });
  },

  // 提交评论
  async submitComment() {
    const { recordId, comments, record, replyingTo } = this.data;
    let commentContent = this.data.commentContent;
    if (commentContent == null) commentContent = '';
    const content = String(commentContent).trim();

    if (!content) {
      Message.warning({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: '请输入评论内容',
      });
      return;
    }

    const payload = { recordId, content };
    if (replyingTo && replyingTo.id) payload.parentId = replyingTo.id;

    try {
      const res = await request('/life/comment', 'POST', payload);
      const raw = (res.data && res.data.id != null ? res.data : res.data?.data) || {};
      const newComment = { ...raw };
      if (newComment.avatar) newComment.avatar = resolveMediaUrl(newComment.avatar);
      if (newComment.createdAt) newComment.displayTime = formatDateTime(newComment.createdAt);

      if (replyingTo && replyingTo.id) {
        const list = (comments || []).map((c) => {
          if (String(c.id) === String(replyingTo.id)) {
            const replies = (c.replies || []).concat([{ ...newComment, replyToUserName: replyingTo.userName }]);
            return { ...c, replies };
          }
          return c;
        });
        const total = list.reduce((s, c) => s + 1 + (c.replies ? c.replies.length : 0), 0);
        this.setData({
          comments: list,
          commentTotal: total,
          commentContent: '',
          showCommentInput: false,
          replyingTo: null,
        });
      } else {
        const list = (comments || []).concat([{ ...newComment, replies: [] }]);
        const total = list.reduce((s, c) => s + 1 + (c.replies ? c.replies.length : 0), 0);
        this.setData({
          comments: list,
          commentTotal: total,
          'record.commentCount': (record.commentCount || 0) + 1,
          commentContent: '',
          showCommentInput: false,
        });
      }

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

  goToUserProfile(e) {
    const userId = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.userId : null;
    if (!userId) return;
    const me = wx.getStorageSync('user_info');
    const myId = me && me.id != null ? String(me.id) : null;
    if (myId && String(userId) === myId) {
      wx.switchTab({ url: '/pages/my/index' });
      return;
    }
    wx.navigateTo({ url: `/pages/user-profile/index?userId=${userId}` });
  },
});
