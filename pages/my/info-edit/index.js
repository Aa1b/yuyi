import request from '~/api/request';
import { areaList } from './areaData.js';

Page({
  data: {
    userId: '', // 用户ID，用于在数据库中设置管理员
    personInfo: {
      name: '',
      gender: 0,
      birth: '',
      address: [],
      introduction: '',
      photos: [],
    },
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
      const userId = data.id != null ? String(data.id) : '';
      const personInfo = {
        ...this.data.personInfo,
        name: data.nickname || '',
        gender: data.gender === 1 ? 0 : data.gender === 2 ? 1 : 2,
      };
      this.setData({ userId, personInfo });
      if (personInfo.address && Array.isArray(personInfo.address) && personInfo.address.length >= 2) {
        this.setData({
          addressText: `${areaList.provinces[personInfo.address[0]] || ''} ${areaList.cities[personInfo.address[1]] || ''}`,
        });
      }
    } catch (e) {
      wx.showToast({ title: '获取信息失败', icon: 'none' });
    }
  },

  getAreaOptions(data, filter) {
    const res = Object.keys(data).map((key) => ({ value: key, label: data[key] }));
    return typeof filter === 'function' ? res.filter(filter) : res;
  },

  getCities(provinceValue) {
    return this.getAreaOptions(
      areaList.cities,
      (city) => `${city.value}`.slice(0, 2) === `${provinceValue}`.slice(0, 2),
    );
  },

  initAreaData() {
    const provinces = this.getAreaOptions(areaList.provinces);
    const cities = this.getCities(provinces[0].value);
    this.setData({ provinces, cities });
  },

  onAreaPick(e) {
    const detail = e && e.detail;
    const { column, index } = detail || {};
    const { provinces } = this.data;
    const list = Array.isArray(provinces) ? provinces : [];

    if (column === 0 && list[index] != null && list[index].value != null) {
      const cities = this.getCities(list[index].value);
      this.setData({ cities });
    }
  },

  showPicker(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({
      [`${mode}Visible`]: true,
    });
    if (mode === 'address') {
      const cities = this.getCities(this.data.personInfo.address[0]);
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
    const detail = e && e.detail;
    const { value, label } = detail || {};
    const mode = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.mode : null;

    if (mode) {
      this.setData({
        [`personInfo.${mode}`]: value,
      });
    }
    if (mode === 'address' && Array.isArray(label)) {
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
        gender: personInfo.gender === 0 ? 1 : personInfo.gender === 1 ? 2 : 0,
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e?.message || '保存失败', icon: 'none' });
    }
  },
});
