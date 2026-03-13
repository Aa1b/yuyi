import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Component({
  properties: {
    record: {
      type: Object,
      value: {},
    },
  },
  data: {},
  methods: {
    // 阻止事件冒泡
    stopPropagation(e) {
      // 空方法，仅用于阻止冒泡
    },
    // 跳转到详情页
    goToDetail() {
      const { record } = this.data;
      if (record && record.id) {
        wx.navigateTo({
          url: `/pages/life-detail/index?id=${record.id}`,
        });
      }
    },
    // 跳转到用户主页
    goToUserProfile(e) {
      e.stopPropagation();
      const { userId } = e.currentTarget.dataset;
      if (userId) {
        wx.navigateTo({
          url: `/pages/user-profile/index?userId=${userId}`,
        });
      }
    },
    // 点赞/取消点赞
    async handleLike(e) {
      if (e) {
        e.stopPropagation();
      }
      const { record } = this.data;
      if (!record || !record.id) return;
      const { id, isLiked } = record;

      try {
        if (isLiked) {
          // 取消点赞
          await request(`/life/like?recordId=${id}`, 'DELETE');
          this.setData({
            'record.isLiked': false,
            'record.likeCount': record.likeCount - 1,
          });
        } else {
          // 点赞
          await request('/life/like', 'POST', { recordId: id });
          this.setData({
            'record.isLiked': true,
            'record.likeCount': record.likeCount + 1,
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
      const { record } = this.data;
      if (record && record.video && record.video.url) {
        // 跳转到详情页播放视频
        this.goToDetail();
      }
    },
  },
});
