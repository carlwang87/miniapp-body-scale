function cleanHex(rawHex) {
  return String(rawHex || '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
}

function arrayBufferToHex(buffer) {
  if (!buffer) {
    return '';
  }
  return Array.prototype.map
    .call(new Uint8Array(buffer), (byte) => (`00${byte.toString(16)}`).slice(-2))
    .join('');
}

function hexToBytes(rawHex) {
  const hex = cleanHex(rawHex);
  const bytes = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }
  return bytes;
}

function hexToAscii(rawHex) {
  const bytes = hexToBytes(rawHex);
  return bytes.map((byte) => String.fromCharCode(byte)).join('');
}

function readUInt16BE(bytes, offset) {
  return ((bytes[offset] || 0) << 8) + (bytes[offset + 1] || 0);
}

function normalizeNumber(value, digits) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function normalizeJsonPayload(payload) {
  const weightKg = normalizeNumber(payload.weightKg || payload.weight || payload.weight_kg, 2);
  return {
    success: Boolean(weightKg),
    weightKg,
    bodyFatRate: normalizeNumber(payload.bodyFatRate || payload.bodyFat || payload.body_fat_rate, 1),
    heartRate: payload.heartRate || payload.heart_rate || null,
    userNo: payload.userNo || payload.user_no || null,
    measuredAt: payload.measuredAt || payload.measured_at || new Date().toISOString(),
    measurementCompleted: payload.measurementCompleted !== false,
    raw: payload,
    parser: 'ascii-json'
  };
}

function parseAsciiJson(rawHex) {
  const ascii = hexToAscii(rawHex).trim();
  if (!ascii || ascii[0] !== '{') {
    return null;
  }

  try {
    return normalizeJsonPayload(JSON.parse(ascii));
  } catch (error) {
    return {
      success: false,
      measurementCompleted: false,
      error: `JSON payload 解析失败：${error.message}`,
      raw: { ascii },
      parser: 'ascii-json'
    };
  }
}

function parseA55aFrame(bytes, rawHex) {
  if (bytes.length < 9 || bytes[0] !== 0xa5 || bytes[1] !== 0x5a) {
    return null;
  }

  const weightKg = readUInt16BE(bytes, 2) / 100;
  const bodyFatRate = readUInt16BE(bytes, 4) / 10;
  const heartRate = bytes[6] || null;
  const flags = bytes[7] || 0;
  const userNo = bytes[8] || null;
  const measurementCompleted = (flags & 0x01) === 0x01;

  if (!weightKg || weightKg < 5 || weightKg > 300) {
    return {
      success: false,
      measurementCompleted,
      error: '示例 a55a 帧未解析到可信体重',
      raw: { bytes, rawHex },
      parser: 'a55a-demo'
    };
  }

  return {
    success: true,
    weightKg: normalizeNumber(weightKg, 2),
    bodyFatRate: bodyFatRate > 0 && bodyFatRate < 80 ? normalizeNumber(bodyFatRate, 1) : null,
    heartRate: heartRate > 20 && heartRate < 230 ? heartRate : null,
    userNo,
    measuredAt: new Date().toISOString(),
    measurementCompleted,
    raw: { bytes, rawHex, flags },
    parser: 'a55a-demo'
  };
}

function parseBodyScalePayload({ deviceModel = 'EW-FA33', rawHex }) {
  const hex = cleanHex(rawHex);
  if (!hex) {
    return {
      success: false,
      measurementCompleted: false,
      error: 'rawHex 为空',
      raw: {},
      parser: 'empty'
    };
  }

  const jsonParsed = parseAsciiJson(hex);
  if (jsonParsed) {
    return jsonParsed;
  }

  const bytes = hexToBytes(hex);
  const demoFrame = parseA55aFrame(bytes, hex);
  if (demoFrame) {
    return demoFrame;
  }

  return {
    success: false,
    measurementCompleted: false,
    error: `${deviceModel} 协议未识别，已保存 raw hex 等待抓包分析`,
    raw: { bytes, rawHex: hex },
    parser: 'unknown'
  };
}

function byteToHex(byte) {
  return (`00${byte.toString(16)}`).slice(-2);
}

function makeDemoFrameHex({ weightKg = 70.2, bodyFatRate = 18.5, heartRate = 75, completed = true, userNo = 1 } = {}) {
  const weight = Math.round(weightKg * 100);
  const fat = Math.round(bodyFatRate * 10);
  const bytes = [
    0xa5,
    0x5a,
    (weight >> 8) & 0xff,
    weight & 0xff,
    (fat >> 8) & 0xff,
    fat & 0xff,
    heartRate & 0xff,
    completed ? 0x01 : 0x00,
    userNo & 0xff
  ];
  const checksum = bytes.reduce((total, byte) => total + byte, 0) & 0xff;
  return [...bytes, checksum].map(byteToHex).join('');
}

module.exports = {
  arrayBufferToHex,
  cleanHex,
  hexToBytes,
  parseBodyScalePayload,
  makeDemoFrameHex
};
