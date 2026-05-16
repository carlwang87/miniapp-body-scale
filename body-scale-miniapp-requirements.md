# 智能体脂秤小程序需求文档

## 1. 项目名称

智能体脂秤蓝牙连接小程序

## 2. 项目背景

现有 Panasonic EW-FA33 体脂秤原配小程序已停止服务，用户无法继续通过原小程序连接体脂秤、同步测量数据、查看身体指标和历史趋势。

为了恢复核心使用能力，需要重新开发一个微信小程序，通过蓝牙 BLE 连接体脂秤，读取测量数据，并提供数据展示、历史记录、趋势分析、多用户管理等功能。

## 3. 项目目标

### 3.1 核心目标

开发一个替代原小程序的微信小程序，实现：

1. 搜索并连接 Panasonic EW-FA33 体脂秤。
2. 通过 BLE 接收体脂秤测量数据。
3. 解析体重、体脂率、BMI、心率等身体指标。
4. 保存每次测量记录。
5. 展示历史趋势图。
6. 支持家庭成员多用户管理。

### 3.2 非目标

第一阶段不做以下内容：

1. 不做医疗诊断功能。
2. 不承诺完全还原原厂 50 项指标。
3. 不做复杂 AI 健康诊断。
4. 不做第三方健康平台同步。
5. 不做苹果 HealthKit / 华为健康 / 小米健康接入。

## 4. 关键风险

### 4.1 BLE 协议风险

体脂秤通过蓝牙发送的数据可能是私有协议。小程序可以连接设备，但如果无法解析 BLE 数据格式，就无法准确获得体脂率、肌肉量、水分率等指标。

因此项目必须分两个阶段：

```text
第一阶段：BLE 协议验证 PoC
第二阶段：完整小程序与后端开发
```

### 4.2 指标准确性风险

体重、BMI 可以根据基础数据计算。

但以下指标通常依赖体脂秤厂商算法：

1. 体脂率
2. 肌肉量
3. 水分率
4. 骨量
5. 内脏脂肪等级
6. 基础代谢率
7. 分段脂肪
8. 分段肌肉

如果设备没有直接返回这些指标，就需要根据阻抗、年龄、性别、身高等数据进行估算。估算结果只能作为参考，不能作为医疗依据。

## 5. 用户角色

### 5.1 普通用户

普通用户可以：

1. 登录小程序。
2. 绑定体脂秤。
3. 发起测量。
4. 查看本人的测量结果。
5. 查看历史趋势。
6. 设置身高、性别、生日等个人资料。

### 5.2 家庭管理员

家庭管理员可以：

1. 添加家庭成员。
2. 管理家庭成员资料。
3. 为不同成员保存测量记录。
4. 查看家庭成员的历史数据。

### 5.3 系统管理员

系统管理员可以：

1. 查看设备接入日志。
2. 查看 BLE 原始数据日志。
3. 管理用户反馈。
4. 协助排查设备连接问题。

## 6. 业务流程

### 6.1 首次使用流程

```text
用户打开小程序
 -> 微信授权登录
 -> 填写个人资料
 -> 打开手机蓝牙
 -> 搜索附近体脂秤
 -> 选择 Panasonic EW-FA33
 -> 建立蓝牙连接
 -> 绑定设备
 -> 完成初始化
```

### 6.2 测量流程

```text
用户进入测量页面
 -> 小程序检查蓝牙状态
 -> 自动连接已绑定体脂秤
 -> 用户站上体脂秤并握住手柄
 -> 体脂秤完成测量
 -> 小程序接收 BLE 数据
 -> 解析身体指标
 -> 展示本次测量结果
 -> 保存测量记录
 -> 更新趋势图
```

### 6.3 历史查看流程

```text
用户进入历史页面
 -> 选择指标
 -> 选择时间范围
 -> 查看趋势图
 -> 查看单次测量详情
```

## 7. 功能需求

## 7.1 微信登录

### 功能说明

用户通过微信小程序登录系统。

### 需求点

1. 支持微信授权登录。
2. 获取用户 openid。
3. 后端根据 openid 创建或查询用户。
4. 用户首次登录时需要完善个人资料。

### 字段

```text
openid
nickname
avatar
gender
birthday
height_cm
create_time
last_login_time
```

## 7.2 用户资料管理

### 功能说明

用户需要维护基础身体信息，用于 BMI、基础代谢率、体脂估算等计算。

### 需求点

1. 支持设置昵称。
2. 支持设置性别。
3. 支持设置生日。
4. 支持设置身高。
5. 支持设置目标体重。
6. 支持修改个人资料。

### 必填字段

```text
昵称
性别
生日
身高
```

### 可选字段

```text
目标体重
备注
```

## 7.3 家庭成员管理

### 功能说明

一个微信用户可以管理多个家庭成员。

### 需求点

1. 添加家庭成员。
2. 编辑家庭成员。
3. 删除家庭成员。
4. 切换当前测量成员。
5. 每个成员单独保存测量记录。

### 家庭成员字段

```text
member_id
owner_user_id
name
gender
birthday
height_cm
target_weight_kg
active
create_time
update_time
```

## 7.4 设备搜索

### 功能说明

小程序通过 BLE 搜索附近体脂秤设备。

### 需求点

1. 检查手机蓝牙是否开启。
2. 检查微信蓝牙权限是否开启。
3. 启动 BLE 设备扫描。
4. 展示搜索到的设备列表。
5. 优先展示疑似 Panasonic EW-FA33 设备。
6. 支持手动刷新设备列表。

### 设备识别规则

初始版本可以根据以下信息识别：

```text
设备名称包含 Panasonic
设备名称包含 EW
设备名称包含 FA33
广播数据中包含特定 service UUID
```

最终识别规则需要根据实际抓包结果确定。

## 7.5 设备绑定

### 功能说明

用户选择设备后，将设备与当前账号绑定。

### 需求点

1. 建立 BLE 连接。
2. 获取设备 services。
3. 获取 characteristics。
4. 识别 notify characteristic。
5. 识别 write characteristic。
6. 保存设备信息。
7. 保存绑定关系。

### 设备字段

```text
device_id
user_id
device_name
device_model
brand
bluetooth_device_id
service_uuid
notify_characteristic_uuid
write_characteristic_uuid
bind_time
last_connected_time
active
```

## 7.6 蓝牙连接管理

### 功能说明

管理小程序和体脂秤之间的 BLE 连接。

### 需求点

1. 自动连接已绑定设备。
2. 手动断开连接。
3. 连接失败提示。
4. 蓝牙关闭提示。
5. 设备超时提示。
6. 连接状态实时展示。
7. 小程序退出或页面关闭时释放连接。

### 连接状态

```text
未连接
搜索中
连接中
已连接
测量中
连接失败
设备断开
```

## 7.7 BLE 数据接收

### 功能说明

通过 notify characteristic 接收体脂秤推送的原始数据。

### 需求点

1. 开启 notify。
2. 监听 BLE characteristic value change。
3. 将 ArrayBuffer 转换为 hex 字符串。
4. 保存原始 BLE 数据。
5. 调用协议解析模块。
6. 解析成功后生成测量记录。
7. 解析失败时保存错误日志。

### 原始数据格式

```text
raw_hex
device_id
service_uuid
characteristic_uuid
received_time
parse_status
parse_error
```

## 7.8 BLE 协议解析

### 功能说明

解析体脂秤发送的原始 hex 数据。

### 第一阶段目标

先完成协议分析，不要求一次性支持全部指标。

优先解析：

```text
体重
心率
体脂率
测量时间
用户编号
测量完成状态
```

### 第二阶段目标

继续解析：

```text
BMI
肌肉量
水分率
骨量
基础代谢率
内脏脂肪等级
身体年龄
蛋白质率
皮下脂肪率
分段脂肪
分段肌肉
```

### 协议解析模块输入

```json
{
  "deviceModel": "EW-FA33",
  "rawHex": "..."
}
```

### 协议解析模块输出

```json
{
  "success": true,
  "weightKg": 70.25,
  "bodyFatRate": 18.5,
  "heartRate": 75,
  "measurementCompleted": true,
  "raw": {}
}
```

## 7.9 测量结果展示

### 功能说明

测量完成后展示本次身体指标。

### 第一版展示指标

```text
体重
BMI
体脂率
心率
测量时间
```

### 第二版展示指标

```text
肌肉量
水分率
骨量
内脏脂肪等级
基础代谢率
身体年龄
蛋白质率
皮下脂肪率
```

### 结果状态

每个指标需要展示状态：

```text
偏低
正常
偏高
严重偏高
```

状态判断规则第一阶段可以使用通用参考区间，后续可调整。

## 7.10 历史记录

### 功能说明

保存用户每次测量数据。

### 需求点

1. 保存测量记录。
2. 按时间倒序展示。
3. 支持查看单次详情。
4. 支持删除误测记录。
5. 支持按成员筛选。
6. 支持按时间范围筛选。

### 时间范围

```text
最近 7 天
最近 30 天
最近 90 天
最近 1 年
全部
```

## 7.11 趋势图

### 功能说明

展示身体指标变化趋势。

### 第一版趋势图

```text
体重趋势
BMI 趋势
体脂率趋势
心率趋势
```

### 第二版趋势图

```text
肌肉量趋势
水分率趋势
内脏脂肪趋势
基础代谢趋势
```

### 图表需求

1. 折线图展示。
2. 支持切换指标。
3. 支持切换时间范围。
4. 支持点击某个点查看具体数值。
5. 支持显示目标体重参考线。

## 7.12 健康报告

### 功能说明

根据测量结果生成简单报告。

### 第一版报告内容

```text
当前体重
BMI 状态
体脂状态
与上次相比变化
与目标体重差距
简单建议
```

### 示例

```text
本次体重 70.2kg，较上次下降 0.4kg。
BMI 为 23.1，处于正常范围。
体脂率为 18.5%，处于正常范围。
距离目标体重还有 3.2kg。
```

## 7.13 数据导出

### 功能说明

用户可以导出历史测量数据。

### 第一版

暂不实现。

### 第二版

支持导出 Excel，字段包括：

```text
成员
测量时间
体重
BMI
体脂率
心率
肌肉量
水分率
骨量
内脏脂肪等级
基础代谢率
```

## 8. 页面需求

## 8.1 首页

### 内容

```text
当前成员
最近一次测量结果
开始测量按钮
体重趋势简图
设备连接状态
```

### 操作

```text
开始测量
切换成员
查看历史
进入设备管理
```

## 8.2 测量页

### 内容

```text
蓝牙连接状态
设备名称
测量引导文案
实时测量状态
测量结果
```

### 测量引导文案

```text
请赤脚站上体脂秤
请双手握住手柄
请保持身体稳定
测量中，请稍候
测量完成
```

## 8.3 设备管理页

### 内容

```text
已绑定设备
设备名称
最近连接时间
连接状态
重新连接按钮
解绑按钮
搜索新设备按钮
```

## 8.4 历史记录页

### 内容

```text
测量日期
体重
BMI
体脂率
心率
详情按钮
```

## 8.5 趋势页

### 内容

```text
指标选择
时间范围选择
趋势图
最大值
最小值
平均值
变化趋势
```

## 8.6 成员管理页

### 内容

```text
成员列表
新增成员
编辑成员
删除成员
设置默认成员
```

## 8.7 个人设置页

### 内容

```text
昵称
性别
生日
身高
目标体重
隐私说明
数据清除
```

## 9. 后端接口设计

## 9.1 用户接口

### 微信登录

```http
POST /api/auth/wechat-login
```

请求：

```json
{
  "code": "wx-login-code"
}
```

响应：

```json
{
  "token": "jwt-token",
  "userId": 1,
  "needCompleteProfile": true
}
```

### 更新用户资料

```http
PUT /api/users/profile
```

请求：

```json
{
  "nickname": "Carl",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "heightCm": 175,
  "targetWeightKg": 68
}
```

## 9.2 家庭成员接口

### 获取成员列表

```http
GET /api/members
```

### 新增成员

```http
POST /api/members
```

请求：

```json
{
  "name": "Carl",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "heightCm": 175,
  "targetWeightKg": 68
}
```

### 更新成员

```http
PUT /api/members/{memberId}
```

### 删除成员

```http
DELETE /api/members/{memberId}
```

## 9.3 设备接口

### 绑定设备

```http
POST /api/devices/bind
```

请求：

```json
{
  "deviceName": "EW-FA33",
  "deviceModel": "EW-FA33",
  "brand": "Panasonic",
  "bluetoothDeviceId": "xxx",
  "serviceUuid": "xxx",
  "notifyCharacteristicUuid": "xxx",
  "writeCharacteristicUuid": "xxx"
}
```

### 获取已绑定设备

```http
GET /api/devices
```

### 解绑设备

```http
DELETE /api/devices/{deviceId}
```

## 9.4 测量记录接口

### 保存测量记录

```http
POST /api/measurements
```

请求：

```json
{
  "memberId": 1,
  "deviceId": 1,
  "measuredAt": "2026-05-16T10:00:00",
  "weightKg": 70.25,
  "bmi": 22.94,
  "bodyFatRate": 18.5,
  "heartRate": 75,
  "rawData": {}
}
```

### 查询历史记录

```http
GET /api/measurements?memberId=1&startDate=2026-01-01&endDate=2026-05-16
```

### 删除记录

```http
DELETE /api/measurements/{measurementId}
```

## 9.5 BLE 原始数据接口

### 上传 BLE 原始数据

```http
POST /api/ble/raw-data
```

请求：

```json
{
  "deviceId": 1,
  "rawHex": "a55a010203",
  "serviceUuid": "xxx",
  "characteristicUuid": "xxx",
  "receivedAt": "2026-05-16T10:00:00"
}
```

## 10. 数据库设计

## 10.1 用户表

```sql
CREATE TABLE t_user (
    id BIGSERIAL PRIMARY KEY,
    openid VARCHAR(128) NOT NULL UNIQUE,
    nickname VARCHAR(128),
    avatar_url TEXT,
    gender VARCHAR(16),
    birthday DATE,
    height_cm NUMERIC(5,2),
    target_weight_kg NUMERIC(5,2),
    create_at TIMESTAMP DEFAULT now(),
    update_at TIMESTAMP DEFAULT now(),
    active BOOLEAN DEFAULT true
);
```

## 10.2 家庭成员表

```sql
CREATE TABLE t_family_member (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    gender VARCHAR(16),
    birthday DATE,
    height_cm NUMERIC(5,2),
    target_weight_kg NUMERIC(5,2),
    is_default BOOLEAN DEFAULT false,
    create_at TIMESTAMP DEFAULT now(),
    update_at TIMESTAMP DEFAULT now(),
    active BOOLEAN DEFAULT true
);
```

## 10.3 设备表

```sql
CREATE TABLE t_body_scale_device (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_name VARCHAR(128),
    device_model VARCHAR(64),
    brand VARCHAR(64),
    bluetooth_device_id VARCHAR(256),
    service_uuid VARCHAR(128),
    notify_characteristic_uuid VARCHAR(128),
    write_characteristic_uuid VARCHAR(128),
    bind_time TIMESTAMP DEFAULT now(),
    last_connected_time TIMESTAMP,
    create_at TIMESTAMP DEFAULT now(),
    update_at TIMESTAMP DEFAULT now(),
    active BOOLEAN DEFAULT true
);
```

## 10.4 测量记录表

```sql
CREATE TABLE t_body_measurement (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    device_id BIGINT,
    measured_at TIMESTAMP NOT NULL,

    weight_kg NUMERIC(6,2),
    bmi NUMERIC(5,2),
    body_fat_rate NUMERIC(5,2),
    muscle_mass_kg NUMERIC(6,2),
    water_rate NUMERIC(5,2),
    bone_mass_kg NUMERIC(5,2),
    visceral_fat_level NUMERIC(5,2),
    bmr NUMERIC(8,2),
    heart_rate INT,

    raw_data JSONB,

    create_at TIMESTAMP DEFAULT now(),
    update_at TIMESTAMP DEFAULT now(),
    active BOOLEAN DEFAULT true
);
```

## 10.5 BLE 原始数据表

```sql
CREATE TABLE t_ble_raw_data (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    device_id BIGINT,
    raw_hex TEXT NOT NULL,
    service_uuid VARCHAR(128),
    characteristic_uuid VARCHAR(128),
    parse_status VARCHAR(32),
    parse_error TEXT,
    received_at TIMESTAMP NOT NULL,
    create_at TIMESTAMP DEFAULT now()
);
```

## 11. 技术方案

## 11.1 小程序端

建议技术栈：

```text
微信小程序原生开发
TypeScript
ECharts / wx-charts
BLE API
```

核心模块：

```text
pages/index              首页
pages/measure            测量页
pages/device             设备管理页
pages/history            历史记录页
pages/trend              趋势页
pages/member             成员管理页
pages/profile            个人设置页

utils/ble.ts             蓝牙工具
utils/parser.ts          BLE 数据解析
utils/request.ts         HTTP 请求封装
utils/date.ts            日期工具
```

## 11.2 后端

建议技术栈：

```text
Spring Boot 3
Spring Security
JWT
PostgreSQL
MyBatis / JPA
Redis 可选
```

## 11.3 部署

```text
后端服务：云服务器 / Docker
数据库：PostgreSQL
文件存储：暂不需要
小程序：微信公众平台发布
```

## 12. BLE PoC 验证需求

这是整个项目最重要的前置任务。

## 12.1 验证目标

确认 Panasonic EW-FA33 是否可以被第三方小程序连接和读取数据。

## 12.2 验证工具

```text
nRF Connect
LightBlue
微信小程序 BLE Demo
Android 手机
iPhone
```

## 12.3 验证步骤

```text
1. 打开体脂秤
2. 使用 nRF Connect 扫描设备
3. 记录设备名称
4. 记录 service UUID
5. 记录 characteristic UUID
6. 找到 notify characteristic
7. 订阅 notify
8. 站上体脂秤完成一次测量
9. 保存所有 raw hex 数据
10. 多测几次，对比数据差异
```

## 12.4 输出结果

PoC 完成后需要输出：

```text
设备名称
广播数据
service UUID
notify characteristic UUID
write characteristic UUID
是否需要写入握手命令
测量过程 raw hex
已解析字段
未解析字段
是否可继续完整开发
```

## 13. 指标计算规则

## 13.1 BMI

```text
BMI = 体重 kg / 身高 m / 身高 m
```

示例：

```text
体重 70kg
身高 1.75m

BMI = 70 / 1.75 / 1.75 = 22.86
```

## 13.2 年龄

```text
年龄 = 当前日期 - 出生日期
```

## 13.3 体重变化

```text
本次体重 - 上次体重
```

## 13.4 目标差距

```text
当前体重 - 目标体重
```

## 14. 验收标准

## 14.1 BLE PoC 验收

满足以下条件视为通过：

```text
可以搜索到 EW-FA33 设备
可以建立 BLE 连接
可以获取 service 和 characteristic
可以订阅 notify
可以在测量时收到 raw hex 数据
至少可以稳定解析体重数据
```

## 14.2 MVP 验收

满足以下条件视为通过：

```text
用户可以微信登录
用户可以设置个人资料
用户可以绑定体脂秤
用户可以连接体脂秤
用户可以完成一次测量
系统可以保存测量记录
用户可以查看历史记录
用户可以查看体重趋势图
```

## 14.3 第二阶段验收

满足以下条件视为通过：

```text
支持家庭成员管理
支持多指标趋势图
支持体脂率、心率等更多指标
支持测量报告
支持删除误测记录
支持设备重新绑定
```

## 15. 项目里程碑

## 阶段一：BLE 协议验证

时间：1 到 2 周

目标：

```text
确认设备是否可连接
确认是否能接收 BLE 数据
确认是否能解析核心指标
```

交付物：

```text
BLE 抓包记录
service/characteristic 文档
raw hex 样本
协议解析初版
可行性结论
```

## 阶段二：MVP 小程序

时间：2 到 4 周

目标：

```text
完成微信登录
完成设备绑定
完成测量流程
完成历史记录
完成趋势图
```

交付物：

```text
小程序 MVP
后端 API
数据库表
基础部署环境
```

## 阶段三：多用户和指标完善

时间：2 到 3 周

目标：

```text
家庭成员管理
更多身体指标解析
更完整趋势分析
健康报告
```

## 阶段四：优化和发布

时间：1 到 2 周

目标：

```text
异常处理
兼容性测试
iOS / Android 测试
小程序提审
正式发布
```

## 16. 优先级

## P0 必须做

```text
微信登录
个人资料
蓝牙搜索
蓝牙连接
BLE 数据接收
体重解析
测量记录保存
历史记录
体重趋势图
```

## P1 应该做

```text
家庭成员
体脂率解析
心率解析
BMI 计算
设备自动重连
测量报告
```

## P2 可以后做

```text
50 项指标
Excel 导出
健康建议
目标管理
异常提醒
云端备份
```

## 17. 开发任务拆分

## 17.1 BLE 任务

```text
- [ ] 调研微信小程序 BLE API
- [ ] 使用 nRF Connect 扫描 EW-FA33
- [ ] 记录设备广播信息
- [ ] 记录 service UUID
- [ ] 记录 characteristic UUID
- [ ] 实现小程序蓝牙搜索
- [ ] 实现小程序蓝牙连接
- [ ] 实现 notify 订阅
- [ ] 实现 raw hex 日志打印
- [ ] 完成多组测量抓包
- [ ] 初步解析体重数据
```

## 17.2 小程序任务

```text
- [ ] 创建小程序项目
- [ ] 首页
- [ ] 测量页
- [ ] 设备管理页
- [ ] 历史记录页
- [ ] 趋势页
- [ ] 成员管理页
- [ ] 个人设置页
- [ ] 请求封装
- [ ] 登录态管理
```

## 17.3 后端任务

```text
- [ ] 创建 Spring Boot 项目
- [ ] 配置 PostgreSQL
- [ ] 用户表
- [ ] 家庭成员表
- [ ] 设备表
- [ ] 测量记录表
- [ ] BLE 原始数据表
- [ ] 微信登录接口
- [ ] 设备绑定接口
- [ ] 测量记录接口
- [ ] 历史查询接口
```

## 17.4 测试任务

```text
- [ ] Android 蓝牙连接测试
- [ ] iPhone 蓝牙连接测试
- [ ] 弱网测试
- [ ] 蓝牙关闭测试
- [ ] 设备断开测试
- [ ] 重复测量测试
- [ ] 多成员切换测试
- [ ] 数据保存测试
```

## 18. 需要进一步确认的问题

```text
1. EW-FA33 是否可以被第三方 BLE 工具稳定连接？
2. 是否需要向设备写入握手命令？
3. 设备是否主动推送完整测量结果？
4. 原始数据是否加密？
5. 体脂率等指标是设备直接返回，还是原小程序计算？
6. 是否需要支持多个体脂秤设备？
7. 是否只做个人使用，还是准备上线给其他用户使用？
8. 后端部署在哪里？
9. 是否需要微信小程序正式上架？
10. 是否需要接入微信支付或会员功能？
```

## 19. 推荐开发顺序

```text
1. BLE 抓包
2. 小程序 BLE Demo
3. 协议解析
4. 后端建表
5. 微信登录
6. 测量记录保存
7. 首页和测量页
8. 历史记录
9. 趋势图
10. 家庭成员
11. 发布测试版
```

## 20. 一句话结论

本项目可以开发，但必须先完成 **EW-FA33 BLE 协议验证**。只要能稳定读取和解析体脂秤原始数据，就可以继续开发完整小程序；如果数据加密或协议无法解析，项目只能实现蓝牙连接和体重等有限指标，无法完整还原原厂小程序的 50 项身体数据。
