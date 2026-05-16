const date = require('../../utils/date');
const metrics = require('../../utils/metrics');
const store = require('../../utils/store');

const metricOptions = [
  { label: '体重', key: 'weightKg' },
  { label: 'BMI', key: 'bmi' },
  { label: '体脂率', key: 'bodyFatRate' },
  { label: '心率', key: 'heartRate' }
];

const rangeOptions = [
  { label: '最近 7 天', key: '7d' },
  { label: '最近 30 天', key: '30d' },
  { label: '最近 90 天', key: '90d' },
  { label: '最近 1 年', key: '1y' },
  { label: '全部', key: 'all' }
];

Page({
  data: {
    metricOptions,
    metricLabels: metricOptions.map((item) => item.label),
    selectedMetricIndex: 0,
    rangeOptions,
    rangeLabels: rangeOptions.map((item) => item.label),
    selectedRangeIndex: 4,
    member: null,
    records: [],
    stats: null,
    selectedPoint: null,
    drawnPoints: []
  },

  onShow() {
    this.refresh();
  },

  onReady() {
    this.drawChart();
  },

  refresh() {
    const member = store.getCurrentMember();
    const metricKey = metricOptions[this.data.selectedMetricIndex].key;
    const rangeKey = rangeOptions[this.data.selectedRangeIndex].key;
    const records = date.sortByTimeAsc(store.getMeasurements({ memberId: member ? member.id : '', rangeKey }));
    const stats = metrics.getTrendStats(records, metricKey);
    const metricLabel = metricOptions[this.data.selectedMetricIndex].label;

    this.setData(
      {
        member,
        records,
        stats: {
          max: this.formatStat(metricKey, stats.max),
          min: this.formatStat(metricKey, stats.min),
          avg: this.formatStat(metricKey, stats.avg),
          change: stats.change === '--' ? '--' : `${stats.change > 0 ? '+' : ''}${this.formatStat(metricKey, stats.change)}`
        },
        selectedPoint: null,
        chartTitle: `${member ? member.name : ''}${metricLabel}趋势`
      },
      () => this.drawChart()
    );
  },

  formatStat(metricKey, value) {
    if (value === '--') {
      return '--';
    }
    return metrics.formatMetricValue(metricKey, value);
  },

  onMetricChange(event) {
    this.setData({ selectedMetricIndex: Number(event.detail.value) }, () => this.refresh());
  },

  onRangeChange(event) {
    this.setData({ selectedRangeIndex: Number(event.detail.value) }, () => this.refresh());
  },

  drawChart() {
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#trend-canvas')
      .boundingClientRect((rect) => {
        const width = rect && rect.width ? rect.width : 320;
        this.drawChartWithSize(width, 220);
      })
      .exec();
  },

  drawChartWithSize(width, height) {
    const metricKey = metricOptions[this.data.selectedMetricIndex].key;
    const records = this.data.records.filter((item) => item[metricKey] !== null && item[metricKey] !== undefined);
    const ctx = wx.createCanvasContext('trendCanvas', this);
    ctx.clearRect(0, 0, width, height);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, width, height);

    if (!records.length) {
      ctx.setFillStyle('#829ab1');
      ctx.setFontSize(14);
      ctx.fillText('暂无趋势数据', width / 2 - 42, height / 2);
      ctx.draw();
      this.setData({ drawnPoints: [] });
      return;
    }

    const padding = { left: 42, right: 22, top: 24, bottom: 40 };
    const values = records.map((item) => Number(item[metricKey]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max === min) {
      max += 1;
      min -= 1;
    }

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const points = records.map((record, index) => {
      const x = padding.left + (records.length === 1 ? plotWidth / 2 : (plotWidth * index) / (records.length - 1));
      const value = Number(record[metricKey]);
      const y = padding.top + plotHeight - ((value - min) / (max - min)) * plotHeight;
      return {
        x,
        y,
        value,
        record,
        valueText: metrics.formatMetricValue(metricKey, value),
        label: date.formatDate(record.measuredAt)
      };
    });

    ctx.setStrokeStyle('#d9e2ec');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(width - padding.right, padding.top + plotHeight);
    ctx.stroke();

    if (metricKey === 'weightKg' && this.data.member && this.data.member.targetWeightKg) {
      const target = Number(this.data.member.targetWeightKg);
      if (target >= min && target <= max) {
        const targetY = padding.top + plotHeight - ((target - min) / (max - min)) * plotHeight;
        ctx.setStrokeStyle('#f0b429');
        ctx.setLineDash([4, 4], 0);
        ctx.beginPath();
        ctx.moveTo(padding.left, targetY);
        ctx.lineTo(width - padding.right, targetY);
        ctx.stroke();
        ctx.setLineDash([], 0);
        ctx.setFillStyle('#8a4b00');
        ctx.setFontSize(11);
        ctx.fillText('目标', width - padding.right - 30, targetY - 6);
      }
    }

    ctx.setStrokeStyle('#0b6bcb');
    ctx.setLineWidth(3);
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    points.forEach((point) => {
      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.setStrokeStyle('#0b6bcb');
      ctx.stroke();
    });

    ctx.setFillStyle('#52606d');
    ctx.setFontSize(11);
    ctx.fillText(metrics.formatMetricValue(metricKey, max), 4, padding.top + 4);
    ctx.fillText(metrics.formatMetricValue(metricKey, min), 4, padding.top + plotHeight);
    ctx.fillText(date.formatShort(records[0].measuredAt).split(' ')[0], padding.left, height - 12);
    ctx.fillText(date.formatShort(records[records.length - 1].measuredAt).split(' ')[0], width - padding.right - 44, height - 12);

    ctx.draw(false, () => {
      this.setData({ drawnPoints: points });
    });
  },

  onChartTap(event) {
    const touch = event.touches && event.touches[0];
    const x = (event.detail && event.detail.x) || (touch && touch.x);
    if (!x || !this.data.drawnPoints.length) {
      return;
    }
    const nearest = this.data.drawnPoints.reduce((best, point) => {
      const distance = Math.abs(point.x - x);
      if (!best || distance < best.distance) {
        return { ...point, distance };
      }
      return best;
    }, null);

    this.setData({
      selectedPoint: nearest
        ? {
            label: nearest.label,
            valueText: nearest.valueText,
            source: nearest.record.source === 'mock' ? '模拟测量' : 'BLE 测量'
          }
        : null
    });
  }
});
