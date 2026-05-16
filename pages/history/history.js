const date = require('../../utils/date');
const metrics = require('../../utils/metrics');
const store = require('../../utils/store');

Page({
  data: {
    members: [],
    memberNames: [],
    selectedMemberIndex: 0,
    rangeOptions: [
      { label: '最近 7 天', key: '7d' },
      { label: '最近 30 天', key: '30d' },
      { label: '最近 90 天', key: '90d' },
      { label: '最近 1 年', key: '1y' },
      { label: '全部', key: 'all' }
    ],
    rangeLabels: ['最近 7 天', '最近 30 天', '最近 90 天', '最近 1 年', '全部'],
    selectedRangeIndex: 4,
    records: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const members = store.getMembers();
    const current = store.getCurrentMember();
    const selectedMemberIndex = Math.max(0, members.findIndex((item) => current && item.id === current.id));
    this.setData(
      {
        members,
        memberNames: members.map((item) => item.name),
        selectedMemberIndex
      },
      () => this.refreshRecords()
    );
  },

  refreshRecords() {
    const member = this.data.members[this.data.selectedMemberIndex];
    const range = this.data.rangeOptions[this.data.selectedRangeIndex];
    const records = member
      ? store.getMeasurements({ memberId: member.id, rangeKey: range.key }).map((item) => ({
          ...item,
          timeText: date.formatDateTime(item.measuredAt),
          weightText: metrics.formatMetricValue('weightKg', item.weightKg),
          bmiText: metrics.formatMetricValue('bmi', item.bmi),
          fatText: metrics.formatMetricValue('bodyFatRate', item.bodyFatRate),
          heartText: metrics.formatMetricValue('heartRate', item.heartRate)
        }))
      : [];
    this.setData({ records });
  },

  onMemberChange(event) {
    const selectedMemberIndex = Number(event.detail.value);
    const member = this.data.members[selectedMemberIndex];
    if (member) {
      store.setCurrentMemberId(member.id);
    }
    this.setData({ selectedMemberIndex }, () => this.refreshRecords());
  },

  onRangeChange(event) {
    this.setData({ selectedRangeIndex: Number(event.detail.value) }, () => this.refreshRecords());
  },

  viewDetail(event) {
    const id = event.currentTarget.dataset.id;
    const record = this.data.records.find((item) => item.id === id);
    if (!record) {
      return;
    }

    wx.showModal({
      title: `${record.memberName} 的测量详情`,
      content: [
        `时间：${record.timeText}`,
        `体重：${record.weightText}`,
        `BMI：${record.bmiText}`,
        `体脂率：${record.fatText}`,
        `心率：${record.heartText}`,
        `来源：${record.source === 'mock' ? '模拟测量' : 'BLE'}`
      ].join('\n'),
      showCancel: false
    });
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条误测记录？',
      success: (result) => {
        if (result.confirm) {
          store.deleteMeasurement(id);
          this.refreshRecords();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  goMeasure() {
    wx.navigateTo({ url: '/pages/measure/measure' });
  }
});
