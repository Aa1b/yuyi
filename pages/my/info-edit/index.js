import request from '~/api/request';
import config from '~/config';
import { areaList } from '~/utils/areaData.js';
import { getCitiesOfProvince, createInitialProvinceCityState } from '~/utils/areaPickerHelpers';
import { resolveAvatarDisplayUrl, DEFAULT_AVATAR_URL } from '~/utils/resolveMediaUrl';
import { saveUserInfoToCache } from '~/utils/userInfoCache';
import { formatBirthDate } from '~/utils/time';

Page({
  data: {
    personInfo: {
      name: '',
      avatar: '',
      gender: 0,
      birth: '',
      address: [],
      introduction: '',
      photos: [],
    },
    displayAvatarUrl: DEFAULT_AVATAR_URL,
    genderOptions: [
      {
        label: '男',
        value: 0,
      },
      {
        label: '女',
        value: 1,
      },
      {
        label: '保密',
        value: 2,
      },
    ],
    birthVisible: false,
    birthStart: '1970-01-01',
    birthEnd: '2025-03-01',
    birthTime: 0,
    birthFilter: (type, options) => (type === 'year' ? options.sort((a, b) => b.value - a.value) : options),
    addressText: '',
    addressVisible: false,
    provinces: [],
    cities: [],

    gridConfig: {
      column: 3,
      width: 160,
      height: 160,
    },
  },

  onLoad() {
    this.initAreaData();
    this.getPersonalInfo();
  },

  async getPersonalInfo() {
    try {
      const res = await request('/auth/profile');
      const data = res?.data ?? {};
      const avatar = data.avatar || '';
      let address = [];
      if (data.address != null && data.address !== '') {
        if (Array.isArray(data.address)) {
          address = data.address;
        } else {
          try {
            const parsed = JSON.parse(String(data.address));
            if (Array.isArray(parsed)) address = parsed;
          } catch (_) {}
        }
      }
      const personInfo = {
        ...this.data.personInfo,
        name: data.nickname || '',
        avatar,
        gender: data.gender === 1 ? 0 : data.gender === 2 ? 1 : 2,
        birth: formatBirthDate(data.birth),
        address,
        introduction: data.introduction || '',
      };
      this.setData({ personInfo, displayAvatarUrl: resolveAvatarDisplayUrl(avatar) });
      if (personInfo.address && Array.isArray(personInfo.address) && personInfo.address.length >= 2) {
        this.setData({
          addressText: `${areaList.provinces[personInfo.address[0]] || ''} ${areaList.cities[personInfo.address[1]] || ''}`,
        });
      }
    } catch (e) {
      wx.showToast({ title: '获取信息失败', icon: 'none' });
    }
  },

  initAreaData() {
    const { provinces, cities } = createInitialProvinceCityState();
    this.setData({ provinces, cities });
  },

  onAreaPick(e) {
    const { column, index } = e.detail;
    const { provinces } = this.data;

    // 更改省份则更新城市列表
    if (column === 0) {
      const cities = getCitiesOfProvince(provinces[index].value);
      this.setData({ cities });
    }
  },

  showPicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: true,
    });
    if (mode === 'address') {
      const cities = getCitiesOfProvince(this.data.personInfo.address[0]);
      this.setData({ cities });
    }
  },

  hidePicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: false,
    });
  },

  onPickerChange(e) {
    const { value, label } = e.detail;
    const { mode } = e.currentTarget.dataset;

    this.setData({
      [`personInfo.${mode}`]: value,
    });
    if (mode === 'address') {
      this.setData({
        addressText: label.join(' '),
      });
    }
  },

  personInfoFieldChange(field, e) {
    const { value } = e.detail;
    this.setData({
      [`personInfo.${field}`]: value,
    });
  },

  onNameChange(e) {
    this.personInfoFieldChange('name', e);
  },

  onGenderChange(e) {
    this.personInfoFieldChange('gender', e);
  },

  onIntroductionChange(e) {
    this.personInfoFieldChange('introduction', e);
  },

  /** 阻止「微信头像」按钮点击冒泡到 t-cell，避免同时触发相册选图 */
  stopAvatarBtnBubble() {},

  /**
   * 使用微信「头像昵称填写能力」：基础库 2.21.2+，比 getUserProfile 更可靠
   * @see https://developers.weixin.qq.com/miniprogram/dev/component/button.html
   */
  async onChooseWechatAvatar(e) {
    const path = e.detail && e.detail.avatarUrl;
    if (!path) return;
    try {
      await this.uploadAvatarFromPath(path);
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '头像更新失败', icon: 'none' });
    }
  },

  async uploadAvatarFromPath(filePath) {
    if (!filePath) return;
    wx.showLoading({ title: '上传中...', mask: true });
    try {
      const token = wx.getStorageSync('access_token');
      const baseUrl = (config.baseUrl || '').replace(/\/+$/, '');
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${baseUrl}/upload/image`,
          filePath,
          name: 'image',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success: resolve,
          fail: reject,
        });
      });

      if (uploadRes.statusCode !== 200) {
        throw new Error('头像上传失败');
      }
      let parsed;
      try {
        parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
      } catch (_) {
        throw new Error('头像上传响应异常');
      }
      const avatarUrl = parsed && parsed.data && parsed.data.url ? parsed.data.url : '';
      if (!avatarUrl) {
        throw new Error((parsed && parsed.message) || '头像上传失败');
      }

      await request('/auth/profile', 'PUT', { avatar: avatarUrl });

      const resolved = resolveAvatarDisplayUrl(avatarUrl);
      this.setData({ 'personInfo.avatar': avatarUrl, displayAvatarUrl: resolved });

      try {
        const cached = wx.getStorageSync('user_info') || {};
        saveUserInfoToCache({ ...cached, avatar: avatarUrl });
      } catch (_) {}
      wx.showToast({ title: '头像已更新', icon: 'success' });
    } finally {
      wx.hideLoading();
    }
  },

  async onChangeAvatar() {
    try {
      const choose = async () => {
        if (typeof wx.chooseMedia === 'function') {
          const res = await wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            sizeType: ['compressed'],
          });
          const file = res && res.tempFiles && res.tempFiles[0];
          return file && file.tempFilePath ? file.tempFilePath : '';
        }
        const res = await wx.chooseImage({
          count: 1,
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
        });
        return (res && res.tempFilePaths && res.tempFilePaths[0]) || '';
      };

      const filePath = await choose();
      if (!filePath) return;
      await this.uploadAvatarFromPath(filePath);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e?.message || '头像更新失败', icon: 'none' });
    }
  },

  onPhotosRemove(e) {
    const { index } = e.detail;
    const { photos } = this.data.personInfo;

    photos.splice(index, 1);
    this.setData({
      'personInfo.photos': photos,
    });
  },

  onPhotosSuccess(e) {
    const { files } = e.detail;
    this.setData({
      'personInfo.photos': files,
    });
  },

  onPhotosDrop(e) {
    const { files } = e.detail;
    this.setData({
      'personInfo.photos': files,
    });
  },

  async onSaveInfo() {
    const { personInfo } = this.data;
    const nickname = (personInfo.name || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写用户名', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '保存中...', mask: true });
      await request('/auth/profile', 'PUT', {
        nickname,
        avatar: personInfo.avatar || '',
        gender: personInfo.gender === 0 ? 1 : personInfo.gender === 1 ? 2 : 0,
        birth: personInfo.birth || '',
        address: Array.isArray(personInfo.address) ? personInfo.address : [],
        introduction: personInfo.introduction || '',
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e?.message || '保存失败', icon: 'none' });
    }
  },
});
