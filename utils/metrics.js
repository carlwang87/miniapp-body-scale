const METRICS = {
  weightKg: { label: '体重', unit: 'kg', digits: 1 },
  bmi: { label: 'BMI', unit: '', digits: 1 },
  bodyFatRate: { label: '体脂率', unit: '%', digits: 1 },
  heartRate: { label: '心率', unit: '次/分', digits: 0 },
  muscleMassKg: { label: '肌肉量', unit: 'kg', digits: 1 },
  waterRate: { label: '水分率', unit: '%', digits: 1 },
  boneMassKg: { label: '骨量', unit: 'kg', digits: 1 },
  visceralFatLevel: { label: '内脏脂肪', unit: '级', digits: 0 },
  bmr: { label: '基础代谢', unit: 'kcal', digits: 0 }
};

function round(value, digits = 1) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!weight || !height) {
    return null;
  }
  const heightMeter = height / 100;
  return round(weight / heightMeter / heightMeter, 1);
}

function normalizeGender(gender) {
  return String(gender || '').toUpperCase();
}

function status(label, tone) {
  return { label, tone };
}

function getMetricStatus(metricKey, value, member = {}) {
  const number = Number(value);
  if (!value && value !== 0) {
    return status('待测', 'muted');
  }

  if (metricKey === 'bmi') {
    if (number < 18.5) return status('偏低', 'low');
    if (number < 24) return status('正常', 'normal');
    if (number < 28) return status('偏高', 'high');
    return status('严重偏高', 'danger');
  }

  if (metricKey === 'bodyFatRate') {
    const male = normalizeGender(member.gender) === 'MALE';
    const low = male ? 10 : 18;
    const normalHigh = male ? 20 : 28;
    const high = male ? 25 : 35;
    if (number < low) return status('偏低', 'low');
    if (number < normalHigh) return status('正常', 'normal');
    if (number < high) return status('偏高', 'high');
    return status('严重偏高', 'danger');
  }

  if (metricKey === 'heartRate') {
    if (number < 60) return status('偏低', 'low');
    if (number <= 100) return status('正常', 'normal');
    if (number <= 120) return status('偏高', 'high');
    return status('严重偏高', 'danger');
  }

  if (metricKey === 'weightKg') {
    const target = Number(member.targetWeightKg);
    if (!target) {
      return status('已记录', 'normal');
    }
    const diff = number - target;
    if (Math.abs(diff) <= 1) return status('接近目标', 'normal');
    if (diff > 1) return status('高于目标', 'high');
    return status('低于目标', 'low');
  }

  return status('已记录', 'normal');
}

function formatMetricValue(metricKey, value) {
  const meta = METRICS[metricKey] || { unit: '', digits: 1 };
  const rounded = round(value, meta.digits);
  if (rounded === null) {
    return '--';
  }
  return `${rounded}${meta.unit ? meta.unit : ''}`;
}

function getTrendStats(records, metricKey) {
  const values = records
    .map((item) => Number(item[metricKey]))
    .filter((item) => !Number.isNaN(item));

  if (!values.length) {
    return {
      max: '--',
      min: '--',
      avg: '--',
      change: '--'
    };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const sum = values.reduce((total, current) => total + current, 0);
  const first = values[0];
  const last = values[values.length - 1];
  const digits = (METRICS[metricKey] || {}).digits || 1;

  return {
    max: round(max, digits),
    min: round(min, digits),
    avg: round(sum / values.length, digits),
    change: round(last - first, digits)
  };
}

function buildReport(record, previousRecord, member = {}) {
  if (!record) {
    return '暂无测量记录。';
  }

  const lines = [`本次体重 ${formatMetricValue('weightKg', record.weightKg)}。`];
  if (previousRecord && previousRecord.weightKg) {
    const diff = round(record.weightKg - previousRecord.weightKg, 1);
    const direction = diff > 0 ? '上升' : diff < 0 ? '下降' : '持平';
    lines.push(`较上次${direction}${Math.abs(diff)}kg。`);
  }

  if (record.bmi) {
    const bmiStatus = getMetricStatus('bmi', record.bmi, member).label;
    lines.push(`BMI 为 ${record.bmi}，处于${bmiStatus}范围。`);
  }

  if (record.bodyFatRate) {
    const fatStatus = getMetricStatus('bodyFatRate', record.bodyFatRate, member).label;
    lines.push(`体脂率为 ${record.bodyFatRate}%，处于${fatStatus}范围。`);
  }

  if (member.targetWeightKg && record.weightKg) {
    const gap = round(record.weightKg - member.targetWeightKg, 1);
    if (gap === 0) {
      lines.push('当前已经达到目标体重。');
    } else {
      lines.push(`距离目标体重还有 ${Math.abs(gap)}kg。`);
    }
  }

  return lines.join('');
}

module.exports = {
  METRICS,
  round,
  calculateBmi,
  getMetricStatus,
  getTrendStats,
  formatMetricValue,
  buildReport
};
