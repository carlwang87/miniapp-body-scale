const ble = require('../../utils/ble');
const date = require('../../utils/date');
const store = require('../../utils/store');

Page({
  data: {
    state: '未连接',
    boundDevice: null,
    devices: [],
    scanning: false
  },

  onShow() {
    this.refresh();
  },

  onUnload() {
    ble.stopScan().catch(() => {});
  },

  refresh() {
    const boundDevice = store.getActiveDevice();
    this.setData({
      boundDevice: boundDevice
        ? {
            ...boundDevice,
            bindTimeText: boundDevice.bindTime ? date.formatDateTime(boundDevice.bindTime) : '--',
            lastConnectedText: boundDevice.lastConnectedTime ? date.formatDateTime(boundDevice.lastConnectedTime) : '尚未连接'
          }
        : null
    });
  },

  async startScan() {
    this.setData({ devices: [], scanning: true, state: ble.STATES.scanning });
    try {
      await ble.startScan({
        onStateChange: (state) => this.setData({ state }),
        onDeviceFound: (devices) => {
          const known = this.data.devices;
          const merged = [...known];
          devices.forEach((device) => {
            const index = merged.findIndex((item) => item.deviceId === device.deviceId);
            if (index >= 0) {
              merged[index] = { ...merged[index], ...device };
            } else {
              merged.push(device);
            }
          });
          merged.sort((a, b) => b.score - a.score);
          this.setData({ devices: merged });
        }
      });
    } catch (error) {
      this.setData({ scanning: false, state: ble.STATES.failed });
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  async stopScan() {
    await ble.stopScan();
    this.setData({ scanning: false, state: ble.STATES.idle });
  },

  async bindDevice(event) {
    const index = Number(event.currentTarget.dataset.index);
    const device = this.data.devices[index];
    if (!device) {
      return;
    }

    try {
      this.setData({ state: ble.STATES.connecting });
      const discovery = await ble.connect(device);
      const saved = store.saveDevice({
        deviceName: device.displayName || device.name,
        deviceModel: device.candidate ? 'EW-FA33' : '未知型号',
        brand: device.candidate ? 'Panasonic' : '未知品牌',
        bluetoothDeviceId: discovery.deviceId,
        serviceUuid: discovery.serviceUuid,
        notifyCharacteristicUuid: discovery.notifyCharacteristicUuid,
        writeCharacteristicUuid: discovery.writeCharacteristicUuid,
        bindTime: new Date().toISOString(),
        lastConnectedTime: new Date().toISOString()
      });
      this.setData({ state: ble.STATES.connected, scanning: false });
      this.refresh();
      wx.showToast({ title: `已绑定 ${saved.deviceName}`, icon: 'success' });
    } catch (error) {
      this.setData({ state: ble.STATES.failed });
      wx.showModal({
        title: '绑定失败',
        content: error.message,
        showCancel: false
      });
    }
  },

  addMockDevice() {
    const saved = store.saveDevice({
      ...ble.createMockDevice(),
      bindTime: new Date().toISOString(),
      lastConnectedTime: new Date().toISOString()
    });
    this.setData({ state: ble.STATES.connected });
    this.refresh();
    wx.showToast({ title: `已添加 ${saved.deviceName}`, icon: 'success' });
  },

  async reconnectBound() {
    const { boundDevice } = this.data;
    if (!boundDevice) {
      wx.showToast({ title: '请先绑定设备', icon: 'none' });
      return;
    }

    if (boundDevice.bluetoothDeviceId === 'MOCK_EW_FA33') {
      store.markDeviceConnected(boundDevice.id);
      this.setData({ state: ble.STATES.connected });
      this.refresh();
      wx.showToast({ title: '模拟设备已连接', icon: 'success' });
      return;
    }

    try {
      this.setData({ state: ble.STATES.connecting });
      await ble.connect(boundDevice);
      store.markDeviceConnected(boundDevice.id);
      this.setData({ state: ble.STATES.connected });
      this.refresh();
      wx.showToast({ title: '连接成功', icon: 'success' });
    } catch (error) {
      this.setData({ state: ble.STATES.failed });
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  async disconnectBound() {
    await ble.disconnect();
    this.setData({ state: ble.STATES.disconnected });
  },

  unbindDevice() {
    const { boundDevice } = this.data;
    if (!boundDevice) {
      return;
    }
    wx.showModal({
      title: '解绑设备',
      content: `确认解绑 ${boundDevice.deviceName}？`,
      success: (result) => {
        if (result.confirm) {
          store.deleteDevice(boundDevice.id);
          this.refresh();
          wx.showToast({ title: '已解绑', icon: 'success' });
        }
      }
    });
  }
});
