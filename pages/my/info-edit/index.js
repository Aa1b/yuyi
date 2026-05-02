import request from '~/api/request';
import config from '~/config';
import { areaList } from '~/utils/areaData.js';
import { getCitiesOfProvince, createInitialProvinceCityState } from '~/utils/areaPickerHelpers';
import resolveMediaUrl from '~/utils/resolveMediaUrl';
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
    displayAvatarUrl: '',
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
      this.setData({ personInfo, displayAvatarUrl: avatar ? resolveMediaUrl(avatar) : '' });
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

      wx.showLoading({ title: '上传中...', mask: true });
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
      if (!avatarUrl) throw new Error((parsed && parsed.message) || '头像上传失败');

      // 写入用户资料
      await request('/auth/profile', 'PUT', { avatar: avatarUrl });

      const resolved = resolveMediaUrl(avatarUrl);
      this.setData({ 'personInfo.avatar': avatarUrl, displayAvatarUrl: resolved });

      // 同步更新本地缓存的 user_info，确保首页/留言等处头像立即生效
      try {
        const cached = wx.getStorageSync('user_info') || {};
        const nextUser = { ...cached, avatar: avatarUrl, image: resolved };
        wx.setStorageSync('user_info', nextUser);
      } catch (_) {}
      wx.hideLoading();
      wx.showToast({ title: '头像已更新', icon: 'success' });
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
