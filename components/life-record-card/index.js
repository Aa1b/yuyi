import config from '~/config';
import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

/** 将后端返回的相对路径转为小程序可用的完整 URL */
function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (config.baseUrl || '').replace(/\/api\/?$/, '');
  return base + (url.startsWith('/') ? url : '/' + url);
}

Component({
  properties: {
    record: {
      type: Object,
      value: {},
    },
  },
  data: {
    displayImageUrl: '',
    displayVideo: null,
  },
  observers: {
    // 防重入：同一 record.id 只处理一次，避免重复 setData 导致开发者工具卡死
    record(record) {
      if (!record || !record.id) {
        this._lastRecordId = null;
        this.setData({ displayImageUrl: '', displayVideo: null });
        return;
      }
      if (this._lastRecordId === record.id) return;
      this._lastRecordId = record.id;
      const images = (record.images || []).map(resolveMediaUrl);
      const displayImageUrl = images[0] || '';
      const video = record.video
        ? {
            url: resolveMediaUrl(record.video.url),
            cover: resolveMediaUrl(record.video.cover),
            duration: record.video.duration,
          }
        : null;
      this.setData({ record, displayImageUrl, displayVideo: video });
    },
  },
  methods: {
    stopPropagation(e) {},
    goToDetail() {
      const record = this.properties.record || this.data.record;
      if (record && record.id) {
        wx.navigateTo({
          url: `/pages/life-detail/index?id=${record.id}`,
        });
      }
    },
    // 跳转到用户主页（点击自己头像则直接进入「我的」Tab）
    goToUserProfile(e) {
      e.stopPropagation();
      const { userId } = e.currentTarget.dataset;
      if (!userId) return;
      const me = wx.getStorageSync('user_info');
      const myId = me && (me.id != null) ? String(me.id) : null;
      if (myId && String(userId) === myId) {
        wx.switchTab({ url: '/pages/my/index' });
        return;
      }
      wx.navigateTo({
        url: `/pages/user-profile/index?userId=${userId}`,
      });
    },
    // 点赞/取消点赞
    async handleLike(e) {
      if (e) {
        e.stopPropagation();
      }
      const record = this.properties.record || this.data.record;
      if (!record || !record.id) return;
      const { id, isLiked } = record;

      try {
        if (isLiked) {
          await request(`/life/like?recordId=${id}`, 'DELETE');
          this.setData({
            'record.isLiked': false,
            'record.likeCount': (record.likeCount || 0) - 1,
          });
        } else {
          await request('/life/like', 'POST', { recordId: id });
          this.setData({
            'record.isLiked': true,
            'record.likeCount': (record.likeCount || 0) + 1,
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
    // 评论
    handleComment(e) {
      if (e) {
        e.stopPropagation();
      }
      this.goToDetail();
    },
    // 播放视频
    handleVideoPlay(e) {
      if (e) {
        e.stopPropagation();
      }
      const record = this.properties.record || this.data.record;
      if (record && record.video && record.video.url) {
        this.goToDetail();
      }
    },
  },
});
