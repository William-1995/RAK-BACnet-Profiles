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
      "fPort": 10,
      "input": "040164010000000f41dc",
      "description": "温度=25°C, 湿度=60%, 电池=100%"
    },
    {
      "name": "低温警报",
      "fPort": 10,
      "input": "0801640100000000ffdc",
      "description": "温度=-5°C, 触发低温报警"
    }
  ]
}
```

**最佳实践**:
- ✅ 使用**真实设备数据**，不要编造
- ✅ 覆盖主要场景：正常、边界、异常
- ✅ 添加清晰的描述说明数据含义

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

