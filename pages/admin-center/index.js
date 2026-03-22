import request from '~/api/request';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    isAdmin: false,
    myUserId: null,
    mainTab: 'cat',
    loading: false,
    categories: [],
    tags: [],
    users: [],
    userKeyword: '',
    userPage: 1,
    userPageSize: 20,
    userTotal: 0,
    userHasMore: false,

    catFormVisible: false,
    catEditingId: null,
    catForm: {
      name: '',
      sortOrderStr: '0',
      isEnabled: true,
    },

    tagFormVisible: false,
    tagEditingId: null,
    tagForm: {
      name: '',
      sortOrderStr: '0',
      isEnabled: true,
    },
  },

  noop() {},

  onLoad() {
    this.checkAdmin();
  },

  onPullDownRefresh() {
    const { mainTab } = this.data;
    const p =
      mainTab === 'cat'
        ? this.loadCategories()
        : mainTab === 'tag'
          ? this.loadTags()
          : this.loadUsers(true);
    Promise.resolve(p).finally(() => wx.stopPullDownRefresh());
  },

  async checkAdmin() {
    try {
      const res = await request('/auth/profile');
      const p = res?.data || {};
      const isAdmin = p.role === 'admin' || !!p.isAdmin || p.is_admin === 1;
      const myUserId = p.id != null ? Number(p.id) : null;
      this.setData({ isAdmin, myUserId });
      if (!isAdmin) {
        wx.showModal({
          title: '无权限',
          content: '仅管理员可访问系统管理',
          showCancel: false,
          success: () => wx.navigateBack(),
        });
        return;
      }
      await this.loadCategories();
    } catch (_) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => wx.navigateBack(),
      });
    }
  },

  onMainTabChange(e) {
    const value = e.detail?.value;
    if (!value) return;
    this.setData({ mainTab: value });
    if (value === 'cat') this.loadCategories();
    else if (value === 'tag') this.loadTags();
    else this.loadUsers(true);
  },

  async loadCategories() {
    this.setData({ loading: true });
    try {
      const res = await request('/admin/categories');
      this.setData({ categories: res.data || [], loading: false });
    } catch (err) {
      this.setData({ loading: false });
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: (err && err.message) || '加载分类失败',
      });
    }
  },

  async loadTags() {
    this.setData({ loading: true });
    try {
      const res = await request('/admin/tags');
      this.setData({ tags: res.data || [], loading: false });
    } catch (err) {
      this.setData({ loading: false });
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: (err && err.message) || '加载标签失败',
      });
    }
  },

  async loadUsers(refresh = false, pageOverride) {
    const page = refresh ? 1 : (pageOverride != null ? pageOverride : this.data.userPage);
    this.setData({ loading: true });
    try {
      const { userPageSize, userKeyword } = this.data;
      const q = userKeyword ? `&keyword=${encodeURIComponent(userKeyword)}` : '';
      const res = await request(
        `/admin/users?page=${page}&pageSize=${userPageSize}${q}`
      );
      const payload = res.data || {};
      const list = payload.list || [];
      const total = payload.total || 0;
      let merged;
      if (refresh || page === 1) {
        merged = list;
      } else {
        merged = [...this.data.users, ...list];
      }
      this.setData({
        users: merged,
        userPage: page,
        userTotal: total,
        userHasMore: merged.length < total,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: (err && err.message) || '加载用户失败',
      });
    }
  },

  onSearchUsers() {
    this.loadUsers(true);
  },

  loadMoreUsers() {
    if (!this.data.userHasMore || this.data.loading) return;
    const next = this.data.userPage + 1;
    this.loadUsers(false, next);
  },

  onUserKeywordInput(e) {
    this.setData({ userKeyword: e.detail.value || '' });
  },

  openCatForm() {
    this.setData({
      catFormVisible: true,
      catEditingId: null,
      catForm: { name: '', sortOrderStr: '0', isEnabled: true },
    });
  },

  editCat(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({
      catFormVisible: true,
      catEditingId: item.id,
      catForm: {
        name: item.name || '',
        sortOrderStr: String(item.sortOrder != null ? item.sortOrder : 0),
        isEnabled: !!item.isEnabled,
      },
    });
  },

  closeCatForm() {
    this.setData({ catFormVisible: false });
  },

  onCatFormName(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'catForm.name': String(v || '') });
  },

  onCatFormSort(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'catForm.sortOrderStr': String(v != null ? v : '') });
  },

  onCatFormEnabled(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'catForm.isEnabled': !!v });
  },

  async submitCatForm() {
    const { catForm, catEditingId } = this.data;
    const name = String(catForm.name || '').trim();
    if (!name) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请填写分类名称' });
      return;
    }
    const sortOrder = parseInt(catForm.sortOrderStr, 10);
    const body = {
      name,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      isEnabled: catForm.isEnabled,
    };
    try {
      wx.showLoading({ title: '保存中', mask: true });
      if (catEditingId) {
        await request(`/admin/categories/${catEditingId}`, 'PUT', body);
      } else {
        await request('/admin/categories', 'POST', body);
      }
      wx.hideLoading();
      this.closeCatForm();
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '保存成功' });
      await this.loadCategories();
    } catch (err) {
      wx.hideLoading();
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: (err && err.message) || '保存失败',
      });
    }
  },

  deleteCat(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除分类',
      content: '若仍有记录使用该分类，将无法删除。确定删除？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中', mask: true });
          await request(`/admin/categories/${id}`, 'DELETE');
          wx.hideLoading();
          Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已删除' });
          await this.loadCategories();
        } catch (err) {
          wx.hideLoading();
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: (err && err.message) || '删除失败',
          });
        }
      },
    });
  },

  openTagForm() {
    this.setData({
      tagFormVisible: true,
      tagEditingId: null,
      tagForm: { name: '', sortOrderStr: '0', isEnabled: true },
    });
  },

  editTag(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({
      tagFormVisible: true,
      tagEditingId: item.id,
      tagForm: {
        name: item.name || '',
        sortOrderStr: String(item.sortOrder != null ? item.sortOrder : 0),
        isEnabled: !!item.isEnabled,
      },
    });
  },

  closeTagForm() {
    this.setData({ tagFormVisible: false });
  },

  onTagFormName(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'tagForm.name': String(v || '') });
  },

  onTagFormSort(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'tagForm.sortOrderStr': String(v != null ? v : '') });
  },

  onTagFormEnabled(e) {
    const v = e.detail?.value != null ? e.detail.value : e.detail;
    this.setData({ 'tagForm.isEnabled': !!v });
  },

  async submitTagForm() {
    const { tagForm, tagEditingId } = this.data;
    const name = String(tagForm.name || '').trim();
    if (!name) {
      Message.warning({ context: this, offset: [120, 32], duration: 2000, content: '请填写标签名称' });
      return;
    }
    const sortOrder = parseInt(tagForm.sortOrderStr, 10);
    const body = {
      name,
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      isEnabled: tagForm.isEnabled,
    };
    try {
      wx.showLoading({ title: '保存中', mask: true });
      if (tagEditingId) {
        await request(`/admin/tags/${tagEditingId}`, 'PUT', body);
      } else {
        await request('/admin/tags', 'POST', body);
      }
      wx.hideLoading();
      this.closeTagForm();
      Message.success({ context: this, offset: [120, 32], duration: 2000, content: '保存成功' });
      await this.loadTags();
    } catch (err) {
      wx.hideLoading();
      Message.error({
        context: this,
        offset: [120, 32],
        duration: 2000,
        content: (err && err.message) || '保存失败',
      });
    }
  },

  deleteTag(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除标签',
      content: '若仍有记录引用该标签，将无法删除。确定删除？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中', mask: true });
          await request(`/admin/tags/${id}`, 'DELETE');
          wx.hideLoading();
          Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已删除' });
          await this.loadTags();
        } catch (err) {
          wx.hideLoading();
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: (err && err.message) || '删除失败',
          });
        }
      },
    });
  },

  toggleUserAdmin(e) {
    const id = e.currentTarget.dataset.id;
    const asAdmin = e.currentTarget.dataset.admin === '1';
    if (!id) return;
    wx.showModal({
      title: asAdmin ? '设为管理员' : '取消管理员',
      content: asAdmin ? '确认将该用户设为管理员？' : '确认取消该用户的管理员权限？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '提交中', mask: true });
          await request(`/admin/users/${id}`, 'PUT', { isAdmin: asAdmin });
          wx.hideLoading();
          Message.success({ context: this, offset: [120, 32], duration: 2000, content: '已更新' });
          await this.loadUsers(true);
        } catch (err) {
          wx.hideLoading();
          Message.error({
            context: this,
            offset: [120, 32],
            duration: 2000,
            content: (err && err.message) || '操作失败',
          });
        }
      },
    });
  },
});
