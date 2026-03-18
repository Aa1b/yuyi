Component({
  options: {
    styleIsolation: 'shared',
  },
  properties: {
    navType: {
      type: String,
      value: 'title',
    },
    titleText: String,
  },
  data: {
    visible: false,
    sidebar: [],
    statusHeight: 0,
  },
  lifetimes: {
    ready() {
      const statusHeight = wx.getWindowInfo().statusBarHeight;
      const token = wx.getStorageSync('access_token');
      const me = wx.getStorageSync('user_info');
      const isAdmin = !!(me && (me.isAdmin || me.is_admin === 1 || me.role === 'admin'));

      const sidebar = [
        { title: '首页', url: 'pages/home/index', isSidebar: true },
        { title: '我的', url: 'pages/my/index', isSidebar: true },
        { title: '消息通知', url: 'pages/message/index', isSidebar: true },
        { title: '发布记录', url: 'pages/release/index', isSidebar: false },
        { title: '草稿箱', url: 'pages/my-life-records/index?filter=draft', isSidebar: false },
        { title: '设置', url: 'pages/setting/index', isSidebar: false },
      ];

      if (isAdmin) {
        sidebar.push({ title: '管理看板', url: 'pages/dataCenter/index', isSidebar: false });
      }

      if (!token) {
        // 未登录时给一个明确的入口
        sidebar.push({ title: '登录/注册', url: 'pages/login/login', isSidebar: false });
      }

      this.setData({ statusHeight, sidebar });
    },
  },
  methods: {
    openDrawer() {
      this.setData({
        visible: true,
      });
    },
    itemClick(e) {
      const that = this;
      const { isSidebar, url } = e.detail.item;
      if (isSidebar) {
        wx.switchTab({
          url: `/${url}`,
        }).then(() => {
          // 防止点回tab时，sidebar依旧是展开模式
          that.setData({
            visible: false,
          });
        });
      } else {
        wx.navigateTo({
          url: `/${url}`,
        }).then(() => {
          that.setData({
            visible: false,
          });
        });
      }
    },

    searchTurn() {
      wx.navigateTo({
        url: `/pages/search/index`,
      });
    },
  },
});
