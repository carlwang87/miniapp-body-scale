# 智能体脂秤蓝牙连接小程序

这是一个按 `body-scale-miniapp-requirements.md` 搭建的微信原生小程序 MVP，可在微信开发者工具中直接导入当前目录运行。

## 已实现

- 首页：当前成员、最近测量、设备状态、体重趋势简图。
- 测量页：BLE 连接入口、notify 数据接收、raw hex 日志、模拟测量兜底。
- 设备页：BLE 搜索、候选设备排序、绑定、重连、解绑、模拟设备。
- 历史页：按成员和时间范围筛选、详情查看、误测删除。
- 趋势页：体重、BMI、体脂率、心率折线图与统计。
- 成员页：新增、编辑、删除、默认成员切换。
- 设置页：微信登录态、个人资料、隐私提示、清除本地数据。
- 工具模块：BLE 封装、协议解析、BMI/状态/报告计算、本地存储、请求封装。

## 使用方式

1. 打开微信开发者工具。
2. 选择“导入项目”，目录选择当前仓库。
3. AppID 可继续使用 `touristappid`，或替换为你的小程序 AppID。
4. 先在“设备管理”页添加模拟设备或扫描真实 BLE 设备。
5. 在“测量”页可以用模拟测量完成一次完整数据闭环。

## BLE 协议说明

EW-FA33 的真实 BLE 协议仍需实机抓包确认。当前 `utils/parser.js` 支持：

- ASCII JSON payload，用于调试。
- `a55a` 示例帧格式，用于 PoC 和模拟测量。
- 未识别 payload 的 raw hex 保存和错误记录。

拿到真实 raw hex 后，优先在 `utils/parser.js` 中补充稳定的帧头、字段偏移、校验和完成状态判断。

## 后端

当前 MVP 使用本地 `wx.setStorageSync` 完成数据闭环。`utils/request.js` 已按需求封装后端接口路径，配置 `API_BASE_URL` 后即可替换为真实 API。

## GitHub Actions

项目内置两个 workflow：

- `.github/workflows/ci.yml`：每次 push / pull request 检查 JS 语法和 JSON 配置。
- `.github/workflows/miniprogram-upload.yml`：手动触发微信小程序代码上传。

自动上传前，需要在 GitHub 仓库配置 Actions secrets：

```text
MP_APPID=微信小程序 AppID
MP_PRIVATE_KEY=微信公众平台下载的代码上传密钥文件内容
```

注意：

- `AppSecret` 不是代码上传密钥，不要放进小程序前端代码。
- 代码上传密钥来自“微信公众平台 -> 开发 -> 开发管理 -> 开发设置 -> 小程序代码上传”。
- GitHub Actions 的公网 IP 不固定，如微信后台开启 IP 白名单，可能需要关闭白名单或改用固定 IP 的 self-hosted runner。
