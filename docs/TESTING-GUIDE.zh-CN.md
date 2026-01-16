# Profile 测试数据完整指南

本指南详细介绍如何为 BACnet Profile 创建测试数据，确保 Codec 函数的正确性。

---

## 📂 目录结构

每个 Profile 可以包含自己的测试数据：

```
profiles/
└── Vendor/
    ├── Vendor-Model.yaml          # Profile 文件
    └── tests/                      # 测试数据目录
        ├── test-data.json          # 测试输入（必需）
        └── expected-output.json    # 期望输出（可选，推荐）
```

---

## 📋 两个测试文件的作用

### 1. test-data.json（必需）

**用途**: 定义测试输入数据

**包含内容**:
- fPort（LoRaWAN 端口号）
- input（十六进制上行数据）
- 测试用例名称和描述

**验证行为**: 确保 Codec 函数能成功执行，不抛异常

---

### 2. expected-output.json（可选，推荐）

**用途**: 定义期望的解码输出结果

**包含内容**:
- 每个测试用例期望返回的完整数据结构

**验证行为**: **深度比对**实际输出和期望输出，确保完全匹配

**为什么推荐**:
- ✅ 确保输出的正确性，而不仅是"没有错误"
- ✅ 防止回归：代码修改后能立即发现输出变化
- ✅ 作为文档：清晰展示每个测试数据应该解码成什么

---

## 🔧 创建测试数据的步骤

### 步骤 1: 创建测试目录

```bash
mkdir -p profiles/Vendor/tests
```

### 步骤 2: 创建 test-data.json

从真实设备获取上行数据，创建测试输入文件：

```json
{
  "description": "Vendor-Model 测试数据集",
  "testCases": [
    {
      "name": "正常工作数据",
      "model": "LRS20100",
      "fPort": 10,
      "input": "040164010000000f41dc",
      "description": "温度=25°C, 湿度=60%, 电池=100%"
    },
    {
      "name": "低温警报",
      "model": "LRS20100",
      "fPort": 10,
      "input": "0801640100000000ffdc",
      "description": "温度=-5°C, 触发低温报警"
    }
  ]
}
```

**字段说明**:
- `name` (必需): 测试用例名称
- `model` (可选): 设备型号，用于区分不同型号的测试用例
  - 如果指定了 `model`，该测试用例只在验证对应型号的 Profile 时运行
  - 如果不指定 `model`，该测试用例适用于所有型号（通用测试）
  - 型号名称会从 Profile 文件名中自动提取（如 `Senso8-LRS20100.yaml` → `LRS20100`）
- `fPort` (必需): LoRaWAN 端口号
- `input` (必需): 十六进制格式的上行数据
- `description` (可选): 测试用例描述

**最佳实践**:
- ✅ 使用**真实设备数据**，不要编造
- ✅ 覆盖主要场景：正常、边界、异常
- ✅ 添加清晰的描述说明数据含义
- ✅ 对于多型号场景，使用 `model` 字段区分测试用例

### 步骤 3: 运行解码查看实际输出

```bash
node scripts/test-codec.js \
  -f profiles/Vendor/Model.yaml \
  -p 10 \
  -u 040164010000000f41dc
```

**输出示例**:
```json
{
  "data": [
    { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" },
    { "name": "Humidity", "channel": 2, "value": 60.0, "unit": "%" },
    { "name": "Battery", "channel": 3, "value": 100, "unit": "%" }
  ]
}
```

### 步骤 4: 创建 expected-output.json

确认输出正确后，创建期望输出文件：

```json
{
  "description": "Vendor-Model 期望输出",
  "testCases": [
    {
      "name": "正常工作数据",
      "expectedOutput": [
        { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" },
        { "name": "Humidity", "channel": 2, "value": 60.0, "unit": "%" },
        { "name": "Battery", "channel": 3, "value": 100, "unit": "%" }
      ]
    },
    {
      "name": "低温警报",
      "expectedOutput": [
        { "name": "Temperature", "channel": 1, "value": -5.0, "unit": "°C" },
        { "name": "Humidity", "channel": 2, "value": 60.0, "unit": "%" },
        { "name": "Battery", "channel": 3, "value": 100, "unit": "%" },
        { "name": "LowTempAlert", "channel": 4, "value": 1, "unit": null }
      ]
    }
  ]
}
```

**重要提示**:
- ⚠️ `expectedOutput` 是**数组**，直接对应 `data` 字段
- ⚠️ 测试用例顺序必须与 `test-data.json` **完全一致**
- ⚠️ 包括 `name`、`channel`、`value`、`unit` 所有字段

### 步骤 5: 运行完整验证

```bash
node scripts/validate-profile.js profiles/Vendor/Model.yaml
```

**成功输出**:
```
🧪 运行测试数据验证...
  ✓ 通过

测试结果详情:
  ✓ 正常工作数据 [输出匹配]
  ✓ 低温警报 [输出匹配]

======================================================================
✅ 验证通过
======================================================================
```

---

## 📊 验证行为对比

| 测试文件配置 | 验证行为 | 测试结果 | 推荐度 |
|-------------|---------|---------|--------|
| 只有 `test-data.json` | 只检查解码成功 | `[未验证输出]` | ⚠️ 基础 |
| 两个文件都有 | **深度比对输出** | `[输出匹配]` | ✅ 推荐 |

---

## 🔍 深度比对机制

验证脚本会进行**严格的深度比对**：

### 比对内容
- ✅ 数组长度
- ✅ 每个对象的所有字段
- ✅ 字段值的类型和值
- ✅ null 和 undefined

### 示例

**期望输出**:
```json
[
  { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" }
]
```

**实际输出**:
```json
[
  { "name": "Temperature", "channel": 1, "value": 25.1, "unit": "°C" }
]
```

**结果**: ❌ 验证失败（value 不匹配: 25.0 vs 25.1）

---

## ⚠️ 常见错误和解决方案

### 错误 1: 输出不匹配 - 字段顺序

```
❌ 错误: 期望和实际输出字段顺序不同
```

**原因**: JavaScript 对象字段顺序可能不同

**解决**: 深度比对不关心字段顺序，只关心字段存在性和值。如果报错，检查字段名是否拼写错误。

---

### 错误 2: 输出不匹配 - 数值类型

```json
// 期望
{ "value": 25 }

// 实际
{ "value": 25.0 }
```

**原因**: JavaScript 中 `25` 和 `25.0` 相等，但某些情况下 JSON 序列化可能不同

**解决**: 统一使用浮点数格式（`25.0`）或整数格式（`25`）

---

### 错误 3: 测试用例顺序不一致

```
❌ 错误: test-data.json 第 1 个用例和 expected-output.json 第 1 个用例不对应
```

**原因**: 两个文件的测试用例顺序不同

**解决**: 确保两个文件的 `testCases` 数组顺序完全一致

---

### 错误 4: expectedOutput 格式错误

```json
// ❌ 错误格式
{
  "expectedOutput": {
    "data": [...]
  }
}

// ✅ 正确格式
{
  "expectedOutput": [...]
}
```

**原因**: `expectedOutput` 应该直接是数组，不需要包装在 `data` 对象中

**解决**: `expectedOutput` 直接对应 `decodeUplink` 返回的 `data` 字段

---

## 🏢 多型号测试用例管理

当同一厂商目录下有多个型号的 Profile 时，可以使用 `model` 字段来区分和过滤测试用例。

### 使用场景

适用于以下情况：
- 同一厂商有多个产品型号
- 不同型号使用相同的协议但数据格式不同
- 需要在一个 `tests` 目录中管理所有型号的测试用例

### 目录结构示例

```
profiles/Senso8/
├── Senso8-LRS20100.yaml      # 温湿度传感器
├── Senso8-LRS20200.yaml      # 温度传感器
├── Senso8-LRS20310.yaml      # CO2 传感器
├── Senso8-LRS20600.yaml      # 门磁传感器
└── tests/
    ├── test-data.json         # 所有型号的测试输入
    └── expected-output.json   # 所有型号的期望输出
```

### 配置示例

**test-data.json**:
```json
{
  "description": "Senso8 系列测试用例",
  "testCases": [
    {
      "name": "LRS20100 温湿度测试",
      "model": "LRS20100",
      "fPort": 10,
      "input": "01016400e901ef00000000"
    },
    {
      "name": "LRS20200 温度测试",
      "model": "LRS20200",
      "fPort": 10,
      "input": "01010064000000000000"
    },
    {
      "name": "通用电池测试",
      "fPort": 10,
      "input": "010164006400640000"
    }
  ]
}
```

**expected-output.json**:
```json
{
  "description": "期望输出",
  "testCases": [
    {
      "name": "LRS20100 温湿度测试",
      "model": "LRS20100",
      "expectedOutput": [
        {
          "name": "Temperature",
          "channel": 1,
          "value": 23.3,
          "unit": "°C"
        },
        {
          "name": "Humidity",
          "channel": 2,
          "value": 49.5,
          "unit": "%"
        }
      ]
    },
    {
      "name": "LRS20200 温度测试",
      "model": "LRS20200",
      "expectedOutput": [
        {
          "name": "Temperature",
          "channel": 1,
          "value": 10.0,
          "unit": "°C"
        }
      ]
    }
  ]
}
```

### 验证行为

#### 型号自动识别

验证脚本会从文件名中自动提取型号：

- `Senso8-LRS20100.yaml` → Model: `LRS20100`
- `Senso8-LRS20200.yaml` → Model: `LRS20200`
- `Dragino-LDS02.yaml` → Model: `LDS02`

#### 测试用例过滤规则

验证特定 Profile 时：

1. **匹配型号的测试** - 运行 `model` 字段与当前型号相同的测试用例
2. **通用测试** - 运行没有 `model` 字段的测试用例
3. **跳过其他型号** - 跳过 `model` 字段为其他型号的测试用例

#### 验证结果示例

假设有以下测试用例：

```json
{
  "testCases": [
    { "name": "Test A", "model": "LRS20100", ... },
    { "name": "Test B", "model": "LRS20200", ... },
    { "name": "Test C", ... }  // 无 model 字段
  ]
}
```

| 验证的 Profile | 运行的测试用例 |
|--------------|--------------|
| `Senso8-LRS20100.yaml` | Test A, Test C |
| `Senso8-LRS20200.yaml` | Test B, Test C |
| `Senso8-LRS20600.yaml` | Test C |

### 命令行输出

```bash
node scripts/validate-profile.js profiles/Senso8/Senso8-LRS20100.yaml
```

输出示例：
```
🧪 Running test data validation...
  Model detected: LRS20100
  Running 2 of 5 test cases
  ✓ Pass

Test result details:
  ✓ LRS20100 温湿度测试 [LRS20100] [Output matched]
  ✓ 通用电池测试 [Output not verified]
```

**说明**：
- `Model detected: LRS20100` - 自动识别的型号
- `Running 2 of 5 test cases` - 运行了 2 个测试（共 5 个）
- `[LRS20100]` - 显示测试用例所属型号

### 最佳实践

#### 1. 命名规范

测试用例名称建议包含型号信息：

```json
{
  "name": "LRS20100 温湿度正常值测试",
  "model": "LRS20100",
  ...
}
```

#### 2. 通用测试用例

对于所有型号都适用的功能（如电池电量、按钮），不要指定 `model` 字段：

```json
{
  "name": "电池电量测试",
  // 不指定 model，适用于所有型号
  "fPort": 10,
  "input": "..."
}
```

#### 3. 按功能分组

```json
{
  "testCases": [
    // 基本功能测试
    { "name": "LRS20100 基本数据上报", "model": "LRS20100", ... },
    { "name": "LRS20200 基本数据上报", "model": "LRS20200", ... },
    
    // 告警测试
    { "name": "LRS20100 温度高告警", "model": "LRS20100", ... },
    { "name": "LRS20100 温度低告警", "model": "LRS20100", ... },
    
    // 通用测试
    { "name": "通用电池电量测试", ... },
    { "name": "通用按钮测试", ... }
  ]
}
```

### 故障排查

#### 问题：测试用例没有被运行

**原因**：
- `model` 字段拼写错误
- 文件名格式不符合 `Vendor-Model.yaml` 规范

**解决**：
1. 检查 `model` 字段是否与文件名中的型号一致
2. 确保文件名格式为 `Vendor-Model.yaml`

#### 问题：所有测试都被跳过

**原因**：
- 所有测试用例都指定了 `model`，但与当前型号不匹配

**解决**：
- 检查测试用例的 `model` 字段
- 或者移除 `model` 字段使其成为通用测试

#### 问题：无法识别型号

验证脚本输出：
```
Model detected: null
Running 5 of 5 test cases
```

**原因**：
- 文件名不符合 `Vendor-Model.yaml` 格式

**解决**：
- 重命名文件为标准格式，如 `Senso8-LRS20100.yaml`

---

## 🎯 测试数据最佳实践

### 1. 覆盖主要场景

```json
{
  "testCases": [
    { "name": "正常工作数据", ... },
    { "name": "边界值 - 最高温度", ... },
    { "name": "边界值 - 最低温度", ... },
    { "name": "报警触发", ... },
    { "name": "低电量", ... },
    { "name": "传感器断线", ... }
  ]
}
```

### 2. 使用清晰的命名

✅ **好的命名**:
- "正常温湿度数据 - 25°C, 60%"
- "温度传感器断线报警"
- "低电量警告 - 电池 10%"

❌ **不好的命名**:
- "测试1"
- "test"
- "数据"

### 3. 添加详细描述

```json
{
  "name": "高温报警",
  "fPort": 10,
  "input": "0801E40308009C0000640A",
  "description": "温度=45°C, 触发高温报警（阈值40°C）, 湿度=50%, 电池=100%"
}
```

### 4. 使用真实数据

```bash
# 从 RAK 网关获取真实上行数据
# ChirpStack 日志示例:
# Uplink: {"data":"040164010000000f41dc","fPort":10}
```

### 5. 保持期望输出准确

定期运行测试，确保期望输出与实际行为一致：

```bash
# 每次修改 Codec 后运行
node scripts/validate-profile.js profiles/Vendor/Model.yaml
```

---

## 🛠️ 调试技巧

### 技巧 1: 查看详细差异

验证失败时会自动显示差异：

```
✗ 正常数据: Output does not match expected result
  期望输出:
  [
    { "name": "Temperature", "value": 25.0 }
  ]
  实际输出:
  [
    { "name": "Temperature", "value": 25.1 }
  ]
```

### 技巧 2: 逐个添加测试

从简单到复杂，逐步添加：

```json
// 第一步：最简单的用例
{ "testCases": [
  { "name": "基本数据", ... }
]}

// 第二步：添加边界情况
{ "testCases": [
  { "name": "基本数据", ... },
  { "name": "最大值", ... },
  { "name": "最小值", ... }
]}
```

### 技巧 3: 使用 JSON 工具验证格式

```bash
# 验证 JSON 格式正确
cat profiles/Vendor/tests/test-data.json | jq .
cat profiles/Vendor/tests/expected-output.json | jq .
```

---

## 📚 完整示例

查看项目中的示例：

- `examples/minimal-profile/tests/` - 最小示例
- `examples/standard-profile/tests/` - 完整示例

---

## ✅ 检查清单

提交 Profile 前确认：

- [ ] 创建了 `tests/test-data.json`
- [ ] 创建了 `tests/expected-output.json`
- [ ] 至少包含 2-3 个测试用例
- [ ] 测试数据来自真实设备
- [ ] 两个文件的测试用例顺序一致
- [ ] 运行 `validate-profile.js` 全部通过
- [ ] 所有测试显示 `[输出匹配]`

---

**最后更新**: 2025-10-23

