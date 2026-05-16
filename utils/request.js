const API_BASE_URL = '';

function request({ url, method = 'GET', data = {}, token = '' }) {
  if (!API_BASE_URL) {
    return Promise.resolve({
      mock: true,
      url,
      method,
      data
    });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300) {
          resolve(result.data);
          return;
        }
        reject(new Error(`HTTP ${result.statusCode}`));
      },
      fail: (error) => reject(new Error(error.errMsg || '网络请求失败'))
    });
  });
}

module.exports = {
  loginByWechatCode(code) {
    return request({
      url: '/api/auth/wechat-login',
      method: 'POST',
      data: { code }
    });
  },

  updateProfile(profile, token) {
    return request({
      url: '/api/users/profile',
      method: 'PUT',
      data: profile,
      token
    });
  },

  bindDevice(device, token) {
    return request({
      url: '/api/devices/bind',
      method: 'POST',
      data: device,
      token
    });
  },

  saveMeasurement(record, token) {
    return request({
      url: '/api/measurements',
      method: 'POST',
      data: record,
      token
    });
  },

  uploadRawBleData(log, token) {
    return request({
      url: '/api/ble/raw-data',
      method: 'POST',
      data: log,
      token
    });
  }
};
