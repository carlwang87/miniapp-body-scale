const metrics = require('./metrics');
const parser = require('./parser');
const store = require('./store');

function buildMeasurementRecord({ parsed, member, device, source = 'ble' }) {
  const weightKg = metrics.round(parsed.weightKg, 2);
  const bodyFatRate = metrics.round(parsed.bodyFatRate, 1);
  const heartRate = parsed.heartRate ? Number(parsed.heartRate) : null;
  const bmi = metrics.calculateBmi(weightKg, member.heightCm);

  return {
    id: store.createId('measurement'),
    userId: member.ownerUserId || 'user_local',
    memberId: member.id,
    memberName: member.name,
    deviceId: device ? device.id : '',
    deviceName: device ? device.deviceName : '',
    measuredAt: parsed.measuredAt || new Date().toISOString(),
    weightKg,
    bmi,
    bodyFatRate,
    heartRate,
    rawData: parsed.raw || {},
    parser: parsed.parser || '',
    source,
    status: {
      weightKg: metrics.getMetricStatus('weightKg', weightKg, member),
      bmi: metrics.getMetricStatus('bmi', bmi, member),
      bodyFatRate: metrics.getMetricStatus('bodyFatRate', bodyFatRate, member),
      heartRate: metrics.getMetricStatus('heartRate', heartRate, member)
    }
  };
}

function makeMockMeasurement(member, device) {
  const baseWeight = Number(member.targetWeightKg || 68) + 2.2;
  const jitter = (Math.random() - 0.5) * 1.2;
  const rawHex = parser.makeDemoFrameHex({
    weightKg: metrics.round(baseWeight + jitter, 2),
    bodyFatRate: metrics.round(18 + Math.random() * 5, 1),
    heartRate: Math.round(68 + Math.random() * 12),
    completed: true,
    userNo: 1
  });
  const parsed = parser.parseBodyScalePayload({ deviceModel: 'EW-FA33', rawHex });
  return {
    rawHex,
    parsed,
    record: buildMeasurementRecord({ parsed, member, device, source: 'mock' })
  };
}

module.exports = {
  buildMeasurementRecord,
  makeMockMeasurement
};
