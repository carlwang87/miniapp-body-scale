const date = require('../../utils/date');
const metrics = require('../../utils/metrics');
const store = require('../../utils/store');

Page({
  data: {
    member: null,
    latest: null,
    device: null,
    report: '',
    latestMetrics: [],
    trendBars: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const member = store.getCurrentMember();
    const device = store.getActiveDevice();
    const records = member ? store.getMeasurements({ memberId: member.id }) : [];
    const latest = records[0] || null;
    const previous = records[1] || null;
    const latestMetrics = latest ? this.buildLatestMetrics(latest) : [];

    this.setData({
      member,
      latest: latest ? { ...latest, timeText: date.formatDateTime(latest.measuredAt) } : null,
      device,
      report: metrics.buildReport(latest, previous, member || {}),
      latestMetrics,
      trendBars: this.buildTrendBars(records.slice(0, 7).reverse())
    });
  },

  buildLatestMetrics(record) {
    return [
      { key: 'weightKg', label: '体重', value: metrics.formatMetricValue('weightKg', record.weightKg), status: record.status && record.status.weightKg },
      { key: 'bmi', label: 'BMI', value: metrics.formatMetricValue('bmi', record.bmi), status: record.status && record.status.bmi },
      { key: 'bodyFatRate', label: '体脂率', value: metrics.formatMetricValue('bodyFatRate', record.bodyFatRate), status: record.status && record.status.bodyFatRate },
      { key: 'heartRate', label: '心率', value: metrics.formatMetricValue('heartRate', record.heartRate), status: record.status && record.status.heartRate }
    ];
  },

  buildTrendBars(records) {
    const values = records.map((item) => Number(item.weightKg)).filter((value) => !Number.isNaN(value));
    if (!values.length) {
      return [];
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    return records.map((record) => {
      const value = Number(record.weightKg);
      return {
        id: record.id,
        value: metrics.round(value, 1),
        label: date.formatShort(record.measuredAt).split(' ')[0],
        height: 36 + Math.round(((value - min) / range) * 118)
      };
    });
  },

  goMeasure() {
    wx.navigateTo({ url: '/pages/measure/measure' });
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/device' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goTrend() {
    wx.navigateTo({ url: '/pages/trend/trend' });
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/member' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  }
});
