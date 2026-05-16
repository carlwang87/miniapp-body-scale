const ble = require('../../utils/ble');
const date = require('../../utils/date');
const measurement = require('../../utils/measurement');
const metrics = require('../../utils/metrics');
const parser = require('../../utils/parser');
const store = require('../../utils/store');

Page({
  data: {
    state: '未连接',
    device: null,
    member: null,
    guideSteps: ['请赤脚站上体脂秤', '请双手握住手柄', '请保持身体稳定', '测量中，请稍候', '测量完成'],
    stepIndex: 0,
    result: null,
    resultMetrics: [],
    report: '',
    rawHex: '',
    rawLogs: [],
    captureSummary: ''
  },

  onShow() {
    this.refresh();
  },

  onUnload() {
    ble.disconnect().catch(() => {});
  },

  refresh() {
    const device = store.getActiveDevice();
    const member = store.getCurrentMember();
    const rawLogs = store.getRawBleLogs().slice(0, 5).map((item) => ({
      ...item,
      timeText: date.formatShort(item.receivedAt),
      statusClass: item.parseStatus === 'SUCCESS' ? 'success' : item.parseStatus === 'CAPTURED' ? 'captured' : 'failed'
    }));
    this.setData({ device, member, rawLogs });
  },

  async connectDevice() {
    const { device } = this.data;
    if (!device) {
      wx.showToast({ title: '请先绑定设备', icon: 'none' });
      return null;
    }

    if (device.bluetoothDeviceId === 'MOCK_EW_FA33') {
      this.setData({ state: '已连接' });
      return device;
    }

    try {
      this.setData({ state: ble.STATES.connecting });
      const discovery = await ble.connect(device);
      const nextDevice = store.saveDevice({
        ...device,
        bluetoothDeviceId: discovery.deviceId,
        serviceUuid: discovery.serviceUuid,
        notifyCharacteristicUuid: discovery.notifyCharacteristicUuid,
        writeCharacteristicUuid: discovery.writeCharacteristicUuid,
        lastConnectedTime: new Date().toISOString()
      });
      store.markDeviceConnected(nextDevice.id);
      this.setData({ device: nextDevice, state: ble.STATES.connected });
      return nextDevice;
    } catch (error) {
      this.setData({ state: ble.STATES.failed });
      wx.showToast({ title: error.message, icon: 'none' });
      return null;
    }
  },

  async startMeasurement() {
    const { device } = this.data;
    if (!device || device.bluetoothDeviceId === 'MOCK_EW_FA33') {
      this.startMockMeasurement();
      return;
    }

    const connectedDevice = await this.connectDevice();
    if (!connectedDevice) {
      return;
    }

    try {
      this.setData({ state: ble.STATES.measuring, stepIndex: 3 });
      await ble.enableNotify({
        deviceId: connectedDevice.bluetoothDeviceId,
        serviceUuid: connectedDevice.serviceUuid,
        notifyCharacteristicUuid: connectedDevice.notifyCharacteristicUuid,
        onValue: (payload) => this.handleBleValue(payload)
      });
      wx.showToast({ title: '已订阅 notify', icon: 'success' });
    } catch (error) {
      this.setData({ state: ble.STATES.failed });
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  startMockMeasurement() {
    const { member } = this.data;
    const device = this.data.device || ble.createMockDevice();
    if (!member) {
      wx.showToast({ title: '请先设置成员', icon: 'none' });
      return;
    }

    this.setData({ state: ble.STATES.measuring, stepIndex: 3 });
    setTimeout(() => {
      const mock = measurement.makeMockMeasurement(member, device);
      this.persistParsedMeasurement(mock.rawHex, mock.parsed, device, 'mock');
    }, 500);
  },

  handleBleValue(payload) {
    const { device } = this.data;
    const parsed = parser.parseBodyScalePayload({
      deviceModel: device ? device.deviceModel : 'EW-FA33',
      rawHex: payload.rawHex
    });
    this.setData({ rawHex: payload.rawHex });
    if (parsed.success && parsed.measurementCompleted) {
      this.persistParsedMeasurement(payload.rawHex, parsed, device, 'ble');
      return;
    }
    this.persistRawLog(payload.rawHex, parsed, {
      device,
      serviceUuid: payload.serviceUuid,
      characteristicUuid: payload.characteristicUuid
    });
    this.setData({
      captureSummary: parsed.protocolRecognized
        ? '已收到 EW-FA33 原始帧。请完成一次完整上秤测量，若仍无结果，复制 raw hex 发给我继续解析协议。'
        : '已收到 BLE 数据，但还不是可识别的 EW-FA33 测量结果帧。'
    });
    this.refresh();
  },

  persistParsedMeasurement(rawHex, parsed, device, source) {
    const { member } = this.data;
    if (!member) {
      return;
    }

    this.persistRawLog(rawHex, parsed, {
      device,
      serviceUuid: device ? device.serviceUuid : '',
      characteristicUuid: device ? device.notifyCharacteristicUuid : ''
    });

    const record = measurement.buildMeasurementRecord({ parsed, member, device, source });
    const previous = store.getMeasurements({ memberId: member.id })[0] || null;
    const saved = store.saveMeasurement(record);
    this.setData({
      state: ble.STATES.connected,
      stepIndex: 4,
      rawHex,
      result: { ...saved, timeText: date.formatDateTime(saved.measuredAt) },
      resultMetrics: this.buildResultMetrics(saved),
      report: metrics.buildReport(saved, previous, member)
    });
    this.refresh();
    wx.showToast({ title: '测量已保存', icon: 'success' });
  },

  persistRawLog(rawHex, parsed, context = {}) {
    store.saveRawBleLog({
      deviceId: context.device ? context.device.id : '',
      rawHex,
      serviceUuid: context.serviceUuid || '',
      characteristicUuid: context.characteristicUuid || '',
      parseStatus: parsed.parseStatus || (parsed.success ? 'SUCCESS' : 'FAILED'),
      parseError: parsed.error || '',
      parser: parsed.parser || '',
      receivedAt: new Date().toISOString()
    });
  },

  copyRawLogs() {
    const logs = store.getRawBleLogs();
    if (!logs.length) {
      wx.showToast({ title: '暂无 raw hex', icon: 'none' });
      return;
    }

    const text = logs
      .map((item) => `${date.formatDateTime(item.receivedAt)} ${item.parseStatus} ${item.parser || ''}\n${item.rawHex}\n${item.parseError || ''}`)
      .join('\n\n');

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制 raw hex', icon: 'success' })
    });
  },

  clearRawLogs() {
    wx.showModal({
      title: '清空原始数据',
      content: '确认清空本机保存的 BLE raw hex 日志？',
      success: (result) => {
        if (result.confirm) {
          wx.setStorageSync('bodyScale:rawBleLogs', []);
          this.setData({ rawHex: '', captureSummary: '' });
          this.refresh();
        }
      }
    });
  },

  buildResultMetrics(record) {
    return [
      { key: 'weightKg', label: '体重', value: metrics.formatMetricValue('weightKg', record.weightKg), status: record.status.weightKg },
      { key: 'bmi', label: 'BMI', value: metrics.formatMetricValue('bmi', record.bmi), status: record.status.bmi },
      { key: 'bodyFatRate', label: '体脂率', value: metrics.formatMetricValue('bodyFatRate', record.bodyFatRate), status: record.status.bodyFatRate },
      { key: 'heartRate', label: '心率', value: metrics.formatMetricValue('heartRate', record.heartRate), status: record.status.heartRate }
    ];
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/device' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  }
});
