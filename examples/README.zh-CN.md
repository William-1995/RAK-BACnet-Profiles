# Profile 示例库

本目录包含标准化的 Profile 示例，帮助您快速了解和创建 BACnet Profile 配置。

## 📚 示例列表

### 1. [最小可行示例](./minimal-profile/)
适用于初学者，展示最基础的 Profile 结构。

**特点：**
- 单一传感器（温度）
- 基础 Codec 函数
- 简单的 BACnet 对象映射
- 详细的注释说明

**适用场景：** 快速入门、理解基本结构

---

### 2. [标准完整示例](./standard-profile/)
展示生产环境可用的完整 Profile。

**特点：**
- 多传感器参数（温度、湿度、电池）
- 完整的 LoRaWAN 配置
- 多种 BACnet 对象类型
- 包含测试数据

**适用场景：** 实际项目开发参考

---

## 🎯 如何使用示例

### 步骤 1：选择合适的示例
- 如果是第一次创建 Profile → 从**最小可行示例**开始
- 如果需要完整功能 → 参考**标准完整示例**

### 步骤 2：复制并修改
```bash
# 复制示例 Profile
cp examples/standard-profile/standard-temp-humidity-sensor.yaml profiles/YourVendor/YourVendor-Model.yaml

# 根据实际设备修改配置
```

### 步骤 3：准备测试数据
每个示例都包含 `tests/` 目录，展示了如何组织测试数据：
- `test-data.json` - 测试用的原始上行数据
- `expected-output.json` - 期望的解码结果

### 步骤 4：验证 Profile
确保您的 Profile：
- ✅ YAML 语法正确
- ✅ Codec 函数可以正确解码测试数据
- ✅ BACnet 对象类型正确
- ✅ 所有必需字段完整

---

## 📖 Profile 结构说明

### 完整的 Profile 文件结构

```yaml
# Codec 编解码函数
codec: |
  function Decode(fPort, data, variables) { ... }
  function Encode(data, variables) { ... }
  function decodeUplink(input) { ... }
  function encodeDownlink(input) { ... }

# 数据类型和 BACnet 对象映射
datatype:
  "1":
    name: Temperature
    type: AnalogInputObject
    units: degreesCelsius
    covIncrement: 0.1
    updateInterval: 600

# LoRaWAN 配置
lorawan:
  adrAlgorithm: LoRa Only # Optional Default: LoRa Only
  classCDownlinkTimeout: 5 # Optional Default: 5
  macVersion: LORAWAN_1_0_3
  region: AS923
  supportClassB: false
  supportClassC: false
  supportOTAA: true # Optional Default: true

# 设备信息
model: Vendor-Model
profileVersion: 1.0.0
vendor: YourVendor
```

---

## 🔧 支持的 BACnet 对象类型

| 对象类型 | 说明 | 典型用途 |
|---------|------|---------|
| **AnalogInputObject** | 模拟输入 | 温度、湿度、电压等传感器读数 |
| **AnalogOutputObject** | 模拟输出 | 可控制的模拟量（阀门开度等） |
| **AnalogValueObject** | 模拟值 | 通用模拟量存储 |
| **BinaryInputObject** | 二值输入 | 门窗状态、按钮、报警状态 |
| **BinaryOutputObject** | 二值输出 | 可控制的开关（灯、继电器） |
| **BinaryValueObject** | 二值变量 | 通用布尔值存储 |
| **OctetStringValueObject** | 字节串值 | 字符串或特殊数据 |

---

## 📝 常用单位列表

| 单位名称 | BACnet 单位标识 | 说明 |
|---------|----------------|------|
| 摄氏度 | `degreesCelsius` | 温度 |
| 百分比 | `percent` | 湿度、电池电量 |
| 毫伏 | `millivolts` | 电压 |
| 毫安 | `milliamperes` | 电流 |
| 勒克斯 | `luxes` | 光照强度 |
| 毫米 | `millimeters` | 距离 |
| PPM | `partsPerMillion` | 气体浓度 |
| 秒 | `seconds` | 时间间隔 |
| 分钟 | `minutes` | 时间间隔 |

更多单位请参考 BACnet 标准文档。

---

## ❓ 常见问题

### Q1: Codec 函数必须包含哪些函数？
至少需要实现：
- `Decode(fPort, data, variables)` - 核心解码函数
- `decodeUplink(input)` - 标准上行解码接口

如果设备支持下行控制，还需要：
- `Encode(data, variables)` - 核心编码函数  
- `encodeDownlink(input)` - 标准下行编码接口

### Q2: channel 是什么？如何分配？
`channel` 是数据通道编号，用于关联 Codec 输出和 BACnet 对象。
- 在 Codec 函数中，每个数据点都有一个 channel 编号
- 在 datatype 中，用引号括起的数字对应 channel 编号
- channel 编号从 1 开始，必须唯一

### Q3: fPort 是什么？
fPort 是 LoRaWAN 协议的端口号，用于区分不同类型的消息：
- 通常 fPort 10 用于传感器数据上报
- fPort 12, 13 等可能用于配置或特殊数据
- 具体含义由设备厂商定义

### Q4: updateInterval 和 covIncrement 是什么？
- `updateInterval`: 数据更新间隔（秒），建议设置为设备实际的上报周期
- `covIncrement`: 变化检测阈值，当数值变化超过此值时触发 COV 通知（仅用于模拟量）

### Q5: 如何处理字节序（大端/小端）？
JavaScript DataView 的第二个参数控制字节序：
```javascript
// 大端（Big Endian，默认）- 高位字节在前
view.getInt16(0, false)  

// 小端（Little Endian）- 低位字节在前  
view.getInt16(0, true)
```

---

## 📞 获取帮助

- 🐛 [报告问题](https://github.com/RAKWireless/RAK-BACnet-Profiles/issues/new?template=bug-report.yml) - 发现 Bug
- 🆕 [请求 Profile](https://github.com/RAKWireless/RAK-BACnet-Profiles/issues/new?template=device-profile-request.yml) - 申请新设备支持

---

**最后更新**: 2025-10-23

