# Profile 验证脚本

本目录包含用于验证和测试 BACnet Profile 配置文件的 Node.js 脚本。

## 📦 安装依赖

```bash
cd scripts
npm install
```

## 🛠️ 工具列表

### 1. validate-all.js - 批量验证工具 ⭐

**用途**: 一次验证所有 Profile 文件，快速检查整个项目（不包含测试数据验证）。

**使用方法**:
```bash
# 验证 profiles 目录下所有文件
node scripts/validate-all.js

# 验证特定目录
node scripts/validate-all.js profiles/Senso8

# JSON 格式输出（用于 CI/CD）
node scripts/validate-all.js --json
```

**验证内容**:
- ✅ YAML 语法检查
- ✅ Profile 结构验证（Schema）
- ✅ 必需字段检查
- ✅ Codec 函数语法验证
- ✅ BACnet 对象类型合规性
- ✅ 文件命名规范
- ⏭️ 跳过测试数据执行（快速验证）

**输出示例**:
```
🔍 扫描目录: profiles

📦 找到 16 个 Profile 文件

======================================================================

[1/16] profiles/Carrier/Carrier-BAC-006-v4-20250709.yaml
----------------------------------------------------------------------
✅ 通过

[2/16] profiles/Dragino/Dragino-LDS02.yaml
----------------------------------------------------------------------
✅ 通过

...

======================================================================

📊 验证结果汇总:

  总计: 16
  通过: 15 ✅
  失败: 1 ❌
  成功率: 93.8%

❌ 失败的文件:
  - profiles/Senso8/Senso8-LRS10701.yaml

======================================================================
```

---

### 2. validate-profile.js - 单文件验证工具

**用途**: 对单个 Profile 进行全面验证，包括语法、结构、Codec 函数和测试数据。

**使用方法**:
```bash
node scripts/validate-profile.js profiles/Senso8/Senso8-LRS20600.yaml
```

**验证项目**:
- ✅ YAML 语法检查
- ✅ Profile 结构验证（Schema）
- ✅ 必需字段检查
- ✅ Codec 函数语法验证
- ✅ BACnet 对象类型合规性
- ✅ 文件命名规范
- ✅ 测试数据执行（完整验证）

**选项**:
```bash
# 跳过测试数据验证
node scripts/validate-profile.js profiles/xxx.yaml --no-tests

# JSON 格式输出（用于 CI/CD）
node scripts/validate-profile.js profiles/xxx.yaml --json
```

---

### 3. test-codec.js - Codec 函数测试

**用途**: 单独测试 Profile 的编解码函数。

**单次测试**:
```bash
node scripts/test-codec.js \
  -f profiles/Senso8/Senso8-LRS20600.yaml \
  -p 10 \
  -u 040164010000000f41dc
```

**批量测试**:
```bash
node scripts/test-codec.js --batch \
  profiles/Senso8/Senso8-LRS20600.yaml \
  examples/minimal-profile/tests/test-data.json
```

**参数**:
- `-f, --file`: Profile YAML 文件路径
- `-p, --port`: LoRaWAN fPort（默认: 10）
- `-u, --uplink`: 上行数据（十六进制格式）
- `-b, --batch`: 批量测试模式

---

### 4. profile-schema.json - Profile Schema 定义

**用途**: 定义 Profile YAML 文件的标准结构，用于自动验证。

**支持的 BACnet 对象类型**:
- `AnalogInputObject`
- `AnalogOutputObject`
- `AnalogValueObject`
- `BinaryInputObject`
- `BinaryOutputObject`
- `BinaryValueObject`
- `OctetStringValueObject`

---

## 🔧 工具函数库

### utils/hex-converter.js

十六进制数据转换工具：

```javascript
const { hexToBytes, bytesToHex, formatHex } = require('./utils/hex-converter');

// 十六进制字符串 → 字节数组
const bytes = hexToBytes('040164');  // [4, 1, 100]

// 字节数组 → 十六进制字符串
const hex = bytesToHex([4, 1, 100]);  // "04 01 64"

// 格式化十六进制字符串
const formatted = formatHex('040164');  // "04 01 64"
```

### utils/yaml-parser.js

YAML 解析和验证工具：

```javascript
const {
  loadYAML,
  extractCodec,
  validateRequiredFields,
  validateBACnetObjects
} = require('./utils/yaml-parser');

// 加载 YAML 文件
const profile = loadYAML('profiles/xxx.yaml');

// 提取 Codec 函数
const codec = extractCodec(profile);

// 验证必需字段
const result = validateRequiredFields(profile);

// 验证 BACnet 对象
const bacnetResult = validateBACnetObjects(profile);
```

---

## 📋 验证流程

### 完整验证流程

```
1. YAML 语法检查
   ↓
2. Schema 结构验证
   ↓
3. 必需字段检查
   ↓
4. Codec 函数语法检查
   ↓
5. BACnet 对象合规性验证
   ↓
6. 文件命名规范检查
   ↓
7. 测试数据执行验证
   ↓
生成验证报告
```

### 验证等级

**Level 1 - 基础验证** (`--no-tests`):
- YAML 语法
- Profile 结构
- 必需字段
- 文件命名

**Level 2 - 标准验证**:
- 基础验证 +
- Codec 函数语法
- BACnet 对象配置

**Level 3 - 完整验证** (默认):
- 标准验证 +
- 运行实际测试数据
- 执行解码并验证成功

**Level 4 - 严格验证** (自动启用):
- Level 3 验证 +
- **深度比对解码输出**
- 确保输出完全匹配期望结果
- 需要提供 `expected-output.json`

---

## 🧪 测试数据格式

验证脚本支持两个测试文件，位于 Profile 同目录的 `tests/` 文件夹下：

```
profiles/Vendor/
├── Vendor-Model.yaml
└── tests/
    ├── test-data.json          # 必需：测试输入
    └── expected-output.json    # 可选：期望输出（推荐）
```

### 1. test-data.json（必需）

定义测试输入数据：

```json
{
  "description": "测试数据集描述",
  "testCases": [
    {
      "name": "测试用例名称",
      "fPort": 10,
      "input": "040164010000000f41dc",
      "description": "用例说明（可选）"
    }
  ]
}
```

### 2. expected-output.json（可选，推荐）

定义期望的输出结果，用于**自动验证输出正确性**：

```json
{
  "description": "期望输出",
  "testCases": [
    {
      "name": "测试用例名称",
      "expectedOutput": [
        {
          "name": "Temperature",
          "channel": 1,
          "value": 25.5,
          "unit": "°C"
        },
        {
          "name": "Humidity",
          "channel": 2,
          "value": 60.0,
          "unit": "%"
        }
      ]
    }
  ]
}
```

**重要说明**:
- ✅ `expectedOutput` 是一个**数组**，对应 `decodeUplink` 返回的 `data` 字段
- ✅ 测试用例的顺序必须与 `test-data.json` 保持一致
- ✅ 提供此文件后，验证会进行**深度比对**，确保输出完全匹配
- ⚠️ 如果不提供此文件，验证只检查解码是否成功执行，不验证输出内容

### 验证行为对比

| 文件配置 | 验证行为 | 测试结果显示 |
|---------|---------|-------------|
| 只有 `test-data.json` | 只检查解码成功执行 | `✓ 测试用例名 [未验证输出]` |
| 同时提供两个文件 | **严格验证**：深度比对输出 | `✓ 测试用例名 [输出匹配]` |
| 输出不匹配 | 验证失败，显示差异 | `✗ 测试用例名: Output does not match` |

---

## 🔄 集成到工作流

### 在 package.json 中添加脚本

```json
{
  "scripts": {
    "validate": "node scripts/validate-profile.js",
    "test": "node scripts/test-codec.js"
  }
}
```

### Git Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# 验证所有修改的 Profile 文件
for file in $(git diff --cached --name-only | grep 'profiles/.*\.yaml$'); do
  node scripts/validate-profile.js "$file"
  if [ $? -ne 0 ]; then
    echo "❌ Profile 验证失败: $file"
    exit 1
  fi
done
```

### GitHub Actions

参见 `.github/workflows/validate-profiles.yml` 获取完整的 CI/CD 配置。

---

## 📊 输出格式

### 控制台输出

```
======================================================================
验证 Profile: profiles/Senso8/Senso8-LRS20600.yaml
======================================================================

📝 检查 YAML 语法...
  ✓ 通过

📋 检查 Profile 结构...
  ✓ 通过

📦 检查必需字段...
  ✓ 通过

🔧 检查 Codec 函数...
  ✓ 通过
  ⚠ Optional function not found: encodeDownlink (下行控制将不可用)

🏢 检查 BACnet 对象配置...
  ✓ 通过

📁 检查文件命名规范...
  ✓ 通过

🧪 运行测试数据验证...
  ✓ 通过

测试结果详情:
  ✓ 正常温度数据 [输出匹配]
  ✓ 负温度数据 [输出匹配]

======================================================================
✅ 验证通过
======================================================================
```

### JSON 输出

```json
{
  "file": "profiles/Senso8/Senso8-LRS20600.yaml",
  "timestamp": "2025-10-23T15:30:00.000Z",
  "valid": true,
  "checks": {
    "yamlSyntax": { "valid": true, "errors": [] },
    "schema": { "valid": true, "errors": [] },
    "requiredFields": { "valid": true, "errors": [] },
    "codec": { 
      "valid": true, 
      "errors": [],
      "warnings": ["Optional function not found: encodeDownlink"]
    },
    "bacnet": { "valid": true, "errors": [] },
    "naming": { "valid": true, "errors": [], "warnings": [] },
    "tests": {
      "valid": true,
      "errors": [],
      "results": [
        {
          "name": "正常温度数据",
          "status": "PASS",
          "matched": true
        }
      ]
    }
  }
}
```

---

## 🐛 常见问题

### Q: npm install 失败？
A: 确保 Node.js 版本 >= 14.0.0，并且网络连接正常。

### Q: 验证脚本报错 "Module not found"？
A: 在 scripts/ 目录下运行 `npm install` 安装依赖。

### Q: 测试数据在哪里？
A: 测试数据应该放在 Profile 文件同目录的 `tests/` 子目录下：
- `tests/test-data.json` - 测试输入（必需）
- `tests/expected-output.json` - 期望输出（可选）

### Q: 为什么我的测试显示 "[未验证输出]"？
A: 因为缺少 `expected-output.json` 文件。验证只检查了解码是否成功，但没有验证输出内容。建议添加期望输出文件以进行严格验证。

### Q: 如何生成 expected-output.json？
A: 步骤如下：
1. 先运行 `test-codec.js` 查看实际输出
2. 确认输出正确后，复制到 `expected-output.json`
3. 再次运行验证确保匹配

```bash
# 查看实际输出
node scripts/test-codec.js -f profiles/Vendor/Model.yaml -p 10 -u <hex>

# 将输出的 "data" 部分复制到 expected-output.json 的 expectedOutput 字段
```

### Q: 验证失败提示 "Output does not match"，怎么办？
A: 验证会显示期望输出和实际输出的详细差异。检查：
1. **数据是否正确**：确认 `test-data.json` 中的输入数据正确
2. **期望输出是否正确**：可能期望输出有误，需要更新
3. **Codec 函数问题**：可能 Codec 解码逻辑有 bug

### Q: 如何添加自定义验证规则？
A: 修改 `validate-profile.js` 或扩展 `profile-schema.json`。

---


**最后更新**: 2025-10-23

