const parser = require('./parser');

const STATES = {
  idle: '未连接',
  scanning: '搜索中',
  connecting: '连接中',
  connected: '已连接',
  measuring: '测量中',
  failed: '连接失败',
  disconnected: '设备断开'
};

let activeDeviceId = '';
let discoveryHandler = null;
let valueHandler = null;

function callWx(methodName, options = {}) {
  return new Promise((resolve, reject) => {
    const method = wx[methodName];
    if (!method) {
      reject(new Error(`当前微信基础库不支持 ${methodName}`));
      return;
    }
    method({
      ...options,
      success: resolve,
      fail: (error) => reject(new Error(error.errMsg || `${methodName} 调用失败`))
    });
  });
}

async function ensureBluetooth() {
  try {
    await callWx('openBluetoothAdapter');
  } catch (error) {
    if (!String(error.message).includes('already')) {
      throw error;
    }
  }

  const state = await callWx('getBluetoothAdapterState');
  if (!state.available) {
    throw new Error('手机蓝牙未开启或未授权微信使用蓝牙');
  }
  return state;
}

function normalizeDevice(device) {
  const name = device.name || device.localName || '未知设备';
  const advertisHex = device.advertisData ? parser.arrayBufferToHex(device.advertisData) : '';
  return {
    ...device,
    name,
    displayName: name,
    advertisHex,
    rssi: device.RSSI || device.rssi || 0,
    candidate: isPanasonicCandidate({ name, advertisHex }),
    score: getDeviceScore({ name, advertisHex, rssi: device.RSSI || device.rssi || 0 })
  };
}

function isPanasonicCandidate(device) {
  const text = `${device.name || ''} ${device.advertisHex || ''}`.toUpperCase();
  return text.includes('PANASONIC') || text.includes('EW') || text.includes('FA33');
}

function getDeviceScore(device) {
  const text = `${device.name || ''}`.toUpperCase();
  let score = device.rssi || 0;
  if (text.includes('PANASONIC')) score += 1000;
  if (text.includes('EW')) score += 500;
  if (text.includes('FA33')) score += 500;
  return score;
}

async function startScan({ onDeviceFound, onStateChange } = {}) {
  await ensureBluetooth();
  if (onStateChange) onStateChange(STATES.scanning);

  if (discoveryHandler && wx.offBluetoothDeviceFound) {
    wx.offBluetoothDeviceFound(discoveryHandler);
  }

  discoveryHandler = (result) => {
    const devices = (result.devices || []).map(normalizeDevice).sort((a, b) => b.score - a.score);
    if (devices.length && onDeviceFound) {
      onDeviceFound(devices);
    }
  };
  wx.onBluetoothDeviceFound(discoveryHandler);

  await callWx('startBluetoothDevicesDiscovery', {
    allowDuplicatesKey: false,
    interval: 0
  });
}

async function stopScan() {
  try {
    await callWx('stopBluetoothDevicesDiscovery');
  } catch (error) {
    // Discovery may already be stopped.
  }
}

async function connect(device) {
  const deviceId = device.deviceId || device.bluetoothDeviceId;
  if (!deviceId) {
    throw new Error('缺少 bluetooth deviceId');
  }

  await ensureBluetooth();
  await stopScan();
  await callWx('createBLEConnection', { deviceId, timeout: 12000 });
  activeDeviceId = deviceId;
  return discoverCharacteristics(deviceId);
}

async function discoverCharacteristics(deviceId) {
  const servicesResult = await callWx('getBLEDeviceServices', { deviceId });
  const services = servicesResult.services || [];
  let matched = null;

  for (let index = 0; index < services.length; index += 1) {
    const service = services[index];
    const characteristicsResult = await callWx('getBLEDeviceCharacteristics', {
      deviceId,
      serviceId: service.uuid
    });
    const characteristics = characteristicsResult.characteristics || [];
    const notify = characteristics.find((item) => item.properties && (item.properties.notify || item.properties.indicate));
    const writable = characteristics.find((item) => item.properties && (item.properties.write || item.properties.writeNoResponse));
    if (notify || writable) {
      matched = {
        deviceId,
        serviceUuid: service.uuid,
        notifyCharacteristicUuid: notify ? notify.uuid : '',
        writeCharacteristicUuid: writable ? writable.uuid : '',
        characteristics
      };
      break;
    }
  }

  if (!matched) {
    throw new Error('未找到可用的 notify/write characteristic');
  }

  return matched;
}

async function enableNotify({ deviceId, serviceUuid, notifyCharacteristicUuid, onValue }) {
  if (!notifyCharacteristicUuid) {
    throw new Error('缺少 notify characteristic');
  }

  if (valueHandler && wx.offBLECharacteristicValueChange) {
    wx.offBLECharacteristicValueChange(valueHandler);
  }

  valueHandler = (result) => {
    if (result.deviceId !== deviceId) {
      return;
    }
    const rawHex = parser.arrayBufferToHex(result.value);
    if (onValue) {
      onValue({
        rawHex,
        deviceId: result.deviceId,
        serviceUuid: result.serviceId,
        characteristicUuid: result.characteristicId
      });
    }
  };
  wx.onBLECharacteristicValueChange(valueHandler);

  await callWx('notifyBLECharacteristicValueChange', {
    state: true,
    deviceId,
    serviceId: serviceUuid,
    characteristicId: notifyCharacteristicUuid
  });
}

async function disconnect() {
  if (valueHandler && wx.offBLECharacteristicValueChange) {
    wx.offBLECharacteristicValueChange(valueHandler);
    valueHandler = null;
  }

  if (!activeDeviceId) {
    return;
  }

  const deviceId = activeDeviceId;
  activeDeviceId = '';
  try {
    await callWx('closeBLEConnection', { deviceId });
  } catch (error) {
    // The device may have disconnected first.
  }
}

function createMockDevice() {
  return {
    id: '',
    deviceName: 'Panasonic EW-FA33 Mock',
    deviceModel: 'EW-FA33',
    brand: 'Panasonic',
    bluetoothDeviceId: 'MOCK_EW_FA33',
    serviceUuid: '0000FFF0-0000-1000-8000-00805F9B34FB',
    notifyCharacteristicUuid: '0000FFF1-0000-1000-8000-00805F9B34FB',
    writeCharacteristicUuid: '0000FFF2-0000-1000-8000-00805F9B34FB',
    active: true
  };
}

module.exports = {
  STATES,
  ensureBluetooth,
  startScan,
  stopScan,
  connect,
  discoverCharacteristics,
  enableNotify,
  disconnect,
  normalizeDevice,
  isPanasonicCandidate,
  createMockDevice
};
