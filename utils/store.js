const date = require('./date');

const KEYS = {
  user: 'bodyScale:user',
  members: 'bodyScale:members',
  currentMemberId: 'bodyScale:currentMemberId',
  devices: 'bodyScale:devices',
  measurements: 'bodyScale:measurements',
  rawBleLogs: 'bodyScale:rawBleLogs'
};

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined || value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function getDefaultUser() {
  const now = new Date().toISOString();
  return {
    id: 'user_local',
    openid: 'local-openid',
    nickname: 'Carl',
    avatar: '',
    gender: 'MALE',
    birthday: '1990-01-01',
    heightCm: 175,
    targetWeightKg: 68,
    remark: '',
    createTime: now,
    lastLoginTime: now,
    needCompleteProfile: false
  };
}

function getDefaultMember(user) {
  const now = new Date().toISOString();
  return {
    id: 'member_self',
    ownerUserId: user.id,
    name: user.nickname || '本人',
    gender: user.gender || 'MALE',
    birthday: user.birthday || '1990-01-01',
    heightCm: user.heightCm || 175,
    targetWeightKg: user.targetWeightKg || 68,
    active: true,
    isDefault: true,
    createTime: now,
    updateTime: now
  };
}

function ensureBootstrap() {
  const user = read(KEYS.user, null) || write(KEYS.user, getDefaultUser());
  const members = read(KEYS.members, null);
  if (!members || !members.length) {
    const defaultMember = getDefaultMember(user);
    write(KEYS.members, [defaultMember]);
    write(KEYS.currentMemberId, defaultMember.id);
  }
  if (!read(KEYS.devices, null)) {
    write(KEYS.devices, []);
  }
  if (!read(KEYS.measurements, null)) {
    write(KEYS.measurements, []);
  }
  if (!read(KEYS.rawBleLogs, null)) {
    write(KEYS.rawBleLogs, []);
  }
}

function getUser() {
  return read(KEYS.user, getDefaultUser());
}

function saveUser(user) {
  const current = getUser();
  const nextUser = {
    ...current,
    ...user,
    updateTime: new Date().toISOString()
  };
  write(KEYS.user, nextUser);

  const members = getMembers();
  const selfIndex = members.findIndex((item) => item.id === 'member_self');
  if (selfIndex >= 0) {
    members[selfIndex] = {
      ...members[selfIndex],
      name: nextUser.nickname,
      gender: nextUser.gender,
      birthday: nextUser.birthday,
      heightCm: nextUser.heightCm,
      targetWeightKg: nextUser.targetWeightKg,
      updateTime: new Date().toISOString()
    };
    write(KEYS.members, members);
  }

  return nextUser;
}

function getMembers(includeInactive = false) {
  const members = read(KEYS.members, []);
  return includeInactive ? members : members.filter((item) => item.active !== false);
}

function getCurrentMember() {
  const members = getMembers();
  const currentMemberId = read(KEYS.currentMemberId, '');
  return members.find((item) => item.id === currentMemberId) || members[0] || null;
}

function setCurrentMemberId(memberId) {
  write(KEYS.currentMemberId, memberId);
  return getCurrentMember();
}

function saveMember(member) {
  const now = new Date().toISOString();
  const members = getMembers(true);
  const id = member.id || createId('member');
  const nextMember = {
    active: true,
    isDefault: false,
    createTime: now,
    ...member,
    id,
    heightCm: Number(member.heightCm || 0),
    targetWeightKg: Number(member.targetWeightKg || 0),
    updateTime: now
  };

  const nextMembers = members.map((item) => {
    if (nextMember.isDefault) {
      return item.id === id ? nextMember : { ...item, isDefault: false };
    }
    return item.id === id ? { ...item, ...nextMember } : item;
  });

  if (!members.some((item) => item.id === id)) {
    nextMembers.push(nextMember);
  }

  write(KEYS.members, nextMembers);
  if (nextMember.isDefault || !read(KEYS.currentMemberId, '')) {
    setCurrentMemberId(id);
  }
  return nextMember;
}

function deleteMember(memberId) {
  const members = getMembers(true);
  const nextMembers = members.map((item) => (item.id === memberId ? { ...item, active: false, updateTime: new Date().toISOString() } : item));
  write(KEYS.members, nextMembers);
  if (read(KEYS.currentMemberId, '') === memberId) {
    const fallback = nextMembers.find((item) => item.active !== false);
    write(KEYS.currentMemberId, fallback ? fallback.id : '');
  }
}

function getDevices(includeInactive = false) {
  const devices = read(KEYS.devices, []);
  return includeInactive ? devices : devices.filter((item) => item.active !== false);
}

function getActiveDevice() {
  return getDevices().find((item) => item.active !== false) || null;
}

function saveDevice(device) {
  const now = new Date().toISOString();
  const devices = getDevices(true);
  const id = device.id || createId('device');
  const nextDevice = {
    brand: 'Panasonic',
    deviceModel: 'EW-FA33',
    active: true,
    bindTime: now,
    ...device,
    id,
    updateTime: now
  };
  const withoutDuplicate = devices.filter((item) => item.id !== id && item.bluetoothDeviceId !== nextDevice.bluetoothDeviceId);
  write(KEYS.devices, [nextDevice, ...withoutDuplicate]);
  return nextDevice;
}

function markDeviceConnected(deviceId) {
  const devices = getDevices(true);
  const now = new Date().toISOString();
  const nextDevices = devices.map((item) => (item.id === deviceId ? { ...item, lastConnectedTime: now, updateTime: now } : item));
  write(KEYS.devices, nextDevices);
}

function deleteDevice(deviceId) {
  const devices = getDevices(true).map((item) => (item.id === deviceId ? { ...item, active: false, updateTime: new Date().toISOString() } : item));
  write(KEYS.devices, devices);
}

function getMeasurements(filters = {}) {
  let records = read(KEYS.measurements, []).filter((item) => item.active !== false);
  if (filters.memberId) {
    records = records.filter((item) => item.memberId === filters.memberId);
  }
  if (filters.rangeKey) {
    records = records.filter((item) => date.isInRange(item.measuredAt, filters.rangeKey));
  }
  return date.sortByTimeDesc(records);
}

function saveMeasurement(record) {
  const now = new Date().toISOString();
  const records = read(KEYS.measurements, []);
  const id = record.id || createId('measurement');
  const nextRecord = {
    active: true,
    createTime: now,
    ...record,
    id,
    updateTime: now
  };
  write(KEYS.measurements, [nextRecord, ...records.filter((item) => item.id !== id)]);
  return nextRecord;
}

function deleteMeasurement(measurementId) {
  const records = read(KEYS.measurements, []).map((item) => (item.id === measurementId ? { ...item, active: false, updateTime: new Date().toISOString() } : item));
  write(KEYS.measurements, records);
}

function saveRawBleLog(log) {
  const logs = read(KEYS.rawBleLogs, []);
  const nextLog = {
    id: log.id || createId('raw'),
    receivedAt: log.receivedAt || new Date().toISOString(),
    ...log
  };
  write(KEYS.rawBleLogs, [nextLog, ...logs].slice(0, 200));
  return nextLog;
}

function getRawBleLogs() {
  return read(KEYS.rawBleLogs, []);
}

function clearAll() {
  Object.keys(KEYS).forEach((key) => {
    wx.removeStorageSync(KEYS[key]);
  });
  ensureBootstrap();
}

module.exports = {
  createId,
  ensureBootstrap,
  getUser,
  saveUser,
  getMembers,
  getCurrentMember,
  setCurrentMemberId,
  saveMember,
  deleteMember,
  getDevices,
  getActiveDevice,
  saveDevice,
  markDeviceConnected,
  deleteDevice,
  getMeasurements,
  saveMeasurement,
  deleteMeasurement,
  saveRawBleLog,
  getRawBleLogs,
  clearAll
};
