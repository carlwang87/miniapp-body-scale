const store = require('./utils/store');

App({
  globalData: {
    connectionState: '未连接'
  },

  onLaunch() {
    store.ensureBootstrap();
    this.loginSilently();
  },

  onHide() {
    const ble = require('./utils/ble');
    ble.disconnect().catch(() => {});
  },

  loginSilently() {
    if (!wx.login) {
      return;
    }

    wx.login({
      success: (result) => {
        const user = store.getUser();
        store.saveUser({
          ...user,
          wxLoginCode: result.code || '',
          lastLoginTime: new Date().toISOString()
        });
      }
    });
  }
});
