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
            characteristics: this.formatCharacteristics(boundDevice.characteristics || []),
            notifyCharacteristics: this.formatCharacteristics(boundDevice.notifyCharacteristics || []),
            writeCharacteristics: this.formatCharacteristics(boundDevice.writeCharacteristics || []),
            bindTimeText: boundDevice.bindTime ? date.formatDateTime(boundDevice.bindTime) : '--',
            lastConnectedText: boundDevice.lastConnectedTime ? date.formatDateTime(boundDevice.lastConnectedTime) : '尚未连接'
          }
        : null
    });
  },

  formatCharacteristics(characteristics) {
    return characteristics.map((item) => {
      const properties = item.properties || {};
      const flags = Object.keys(properties).filter((key) => properties[key]);
      return {
        ...item,
        propertyText: flags.length ? flags.join(', ') : 'unknown'
      };
    });
  },

  copyDeviceInfo() {
    const { boundDevice } = this.data;
    if (!boundDevice) {
      wx.showToast({ title: '暂无设备信息', icon: 'none' });
      return;
    }

    const lines = [
      `deviceName=${boundDevice.deviceName}`,
      `bluetoothDeviceId=${boundDevice.bluetoothDeviceId}`,
      `serviceUuid=${boundDevice.serviceUuid}`,
      `notifyCharacteristicUuid=${boundDevice.notifyCharacteristicUuid}`,
      `writeCharacteristicUuid=${boundDevice.writeCharacteristicUuid}`,
      `notifyCount=${boundDevice.notifyCharacteristics ? boundDevice.notifyCharacteristics.length : 0}`,
      `writeCount=${boundDevice.writeCharacteristics ? boundDevice.writeCharacteristics.length : 0}`,
      'characteristics='
    ];
    (boundDevice.characteristics || []).forEach((item) => {
      lines.push(`${item.serviceUuid} / ${item.characteristicUuid} / ${item.propertyText}`);
    });

    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '已复制设备信息', icon: 'success' })
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
        notifyCharacteristics: discovery.notifyCharacteristics,
        writeCharacteristics: discovery.writeCharacteristics,
        characteristics: discovery.characteristics,
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
      const discovery = await ble.connect(boundDevice);
      const saved = store.saveDevice({
        ...boundDevice,
        bluetoothDeviceId: discovery.deviceId,
        serviceUuid: discovery.serviceUuid,
        notifyCharacteristicUuid: discovery.notifyCharacteristicUuid,
        writeCharacteristicUuid: discovery.writeCharacteristicUuid,
        notifyCharacteristics: discovery.notifyCharacteristics,
        writeCharacteristics: discovery.writeCharacteristics,
        characteristics: discovery.characteristics,
        lastConnectedTime: new Date().toISOString()
      });
      this.setData({ state: ble.STATES.connected });
      this.refresh();
      wx.showToast({ title: `连接成功 ${saved.notifyCharacteristics.length}N/${saved.writeCharacteristics.length}W`, icon: 'success' });
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
