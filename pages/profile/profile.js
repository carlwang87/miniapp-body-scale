const store = require('../../utils/store');

Page({
  data: {
    user: null,
    genderOptions: ['男', '女'],
    genderValues: ['MALE', 'FEMALE'],
    genderIndex: 0
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const user = store.getUser();
    this.setData({
      user,
      genderIndex: user.gender === 'FEMALE' ? 1 : 0
    });
  },

  login() {
    wx.login({
      success: (result) => {
        const user = store.saveUser({
          ...this.data.user,
          wxLoginCode: result.code || '',
          openid: this.data.user.openid || 'local-openid',
          lastLoginTime: new Date().toISOString()
        });
        this.setData({ user });
        wx.showToast({ title: '登录态已刷新', icon: 'success' });
      },
      fail: (error) => {
        wx.showToast({ title: error.errMsg || '登录失败', icon: 'none' });
      }
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      user: {
        ...this.data.user,
        [field]: event.detail.value
      }
    });
  },

  onGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      user: {
        ...this.data.user,
        gender: this.data.genderValues[genderIndex]
      }
    });
  },

  onBirthdayChange(event) {
    this.setData({
      user: {
        ...this.data.user,
        birthday: event.detail.value
      }
    });
  },

  saveProfile() {
    const user = this.data.user;
    if (!user.nickname || !user.gender || !user.birthday || !user.heightCm) {
      wx.showToast({ title: '请填写必填字段', icon: 'none' });
      return;
    }
    const saved = store.saveUser({
      ...user,
      heightCm: Number(user.heightCm),
      targetWeightKg: Number(user.targetWeightKg || 0)
    });
    this.setData({ user: saved });
    wx.showToast({ title: '资料已保存', icon: 'success' });
  },

  clearData() {
    wx.showModal({
      title: '清除数据',
      content: '确认清除本地用户、成员、设备和测量记录？此操作不可恢复。',
      success: (result) => {
        if (result.confirm) {
          store.clearAll();
          this.refresh();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  }
});
