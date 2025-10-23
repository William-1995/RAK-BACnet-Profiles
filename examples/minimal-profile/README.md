# 最小可行 Profile 示例

这是一个最简单的 Profile 示例，适合初学者快速理解 Profile 的基本结构。

## 📋 示例说明

**设备类型：** 温度传感器  
**功能：** 定期上报温度数据  
**复杂度：** ⭐ 简单

## 🎯 学习目标

通过这个示例，您将学会：
1. Profile 的基本文件结构
2. 如何编写简单的解码函数
3. 如何配置 BACnet 对象映射
4. 如何配置基础的 LoRaWAN 参数

## 📦 文件说明

```
minimal-profile/
├── README.md                    # 本文件
├── minimal-sensor.yaml          # Profile 配置文件
└── tests/
    ├── test-data.json          # 测试数据
    └── expected-output.json    # 期望输出
```

## 🔍 关键知识点

### 1. Codec 函数结构
```javascript
function Decode(fPort, data, variables) {
  var values = [];
  // ... 解析数据
  values.push({ 
    name: "Temperature",    // 参数名称
    channel: 1,            // 通道编号（用于关联 BACnet 对象）
    value: 25.5,           // 解析后的数值
    unit: '°C'             // 单位（可选）
  });
  return values;
}
```

### 2. BACnet 对象配置
```yaml
datatype:
  "1":                          # 对应 channel: 1
    name: Temperature           # BACnet 对象名称
    type: AnalogInputObject     # 对象类型
    units: degreesCelsius       # BACnet 标准单位
    covIncrement: 0.1          # 变化检测阈值（0.1°C）
    updateInterval: 600        # 更新间隔（600秒 = 10分钟）
```

### 3. 数据解析示例

**原始数据：** `01 00 FF`（十六进制）

**解析过程：**
```javascript
// Byte 0: 0x01 = 版本号（跳过）
// Byte 1-2: 0x00FF = 温度值（大端序）
var temperature = view.getInt16(1, false); // = 255
var temperatureCelsius = temperature / 10.0; // = 25.5°C
```

## 🧪 测试数据

查看 `tests/test-data.json` 和 `tests/expected-output.json` 了解如何组织测试数据。

### 测试方法
```javascript
// 手动测试
var testData = [0x01, 0x00, 0xFF];
var result = Decode(10, testData, {});
console.log(result);
// 期望输出: [{ name: "Temperature", channel: 1, value: 25.5, unit: "°C" }]
```

## 📝 如何基于此示例创建自己的 Profile

### 步骤 1: 复制文件
```bash
cp examples/minimal-profile/minimal-sensor.yaml profiles/YourVendor/YourVendor-Model.yaml
```

### 步骤 2: 修改设备信息
```yaml
model: YourVendor-YourModel
vendor: YourVendor
profileVersion: 1.0.0
```

### 步骤 3: 修改 Codec 函数
根据您设备的数据格式修改解码逻辑。

### 步骤 4: 修改 BACnet 对象
根据您的传感器类型调整对象配置。

### 步骤 5: 准备测试数据
创建真实的测试数据并验证解码结果。

## ⚠️ 注意事项

1. **字节序问题**: 确认您的设备使用大端还是小端
2. **数据单位**: 原始数据可能需要换算（如 ÷10、÷100）
3. **fPort**: 确认设备使用的 fPort 编号
4. **Channel 编号**: 必须从 1 开始，datatype 中用字符串表示

## 🚀 下一步

掌握了最小示例后，可以学习：
- [标准完整示例](../standard-profile/) - 多传感器、更复杂的功能
- 查看仓库中的实际 Profile 文件作为参考

---

**提示**: 遇到问题？访问 [讨论区](https://github.com/RAKWireless/RAK-BACnet-Profiles/discussions) 寻求帮助！

