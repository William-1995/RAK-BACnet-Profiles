# Complete Guide to Profile Test Data

This guide provides detailed instructions on how to create test data for BACnet Profiles to ensure the correctness of Codec functions.

---

## 📂 Directory Structure

Each Profile can contain its own test data:

```
profiles/
└── Vendor/
    ├── Vendor-Model.yaml          # Profile file
    └── tests/                      # Test data directory
        ├── test-data.json          # Test input (required)
        └── expected-output.json    # Expected output (optional, recommended)
```

---

## 📋 Purpose of the Two Test Files

### 1. test-data.json (Required)

**Purpose**: Define test input data

**Contains**:
- fPort (LoRaWAN port number)
- input (hexadecimal uplink data)
- Test case names and descriptions

**Validation Behavior**: Ensures Codec functions execute successfully without throwing exceptions

---

### 2. expected-output.json (Optional, Recommended)

**Purpose**: Define expected decode output results

**Contains**:
- Complete data structure expected to be returned by each test case

**Validation Behavior**: **Deep comparison** of actual output against expected output, ensuring complete match

**Why Recommended**:
- ✅ Ensures output correctness, not just "no errors"
- ✅ Prevents regression: immediately detects output changes after code modifications
- ✅ Serves as documentation: clearly shows what each test data should decode to

---

## 🔧 Steps to Create Test Data

### Step 1: Create Test Directory

```bash
mkdir -p profiles/Vendor/tests
```

### Step 2: Create test-data.json

Obtain uplink data from real devices and create the test input file:

```json
{
  "description": "Vendor-Model test data set",
  "testCases": [
    {
      "name": "Normal working data",
      "model": "LRS20100",
      "fPort": 10,
      "input": "040164010000000f41dc",
      "description": "Temperature=25°C, Humidity=60%, Battery=100%"
    },
    {
      "name": "Low temperature alert",
      "model": "LRS20100",
      "fPort": 10,
      "input": "0801640100000000ffdc",
      "description": "Temperature=-5°C, triggers low temperature alarm"
    }
  ]
}
```

**Field Descriptions**:
- `name` (Required): Test case name
- `model` (Optional): Device model, used to distinguish test cases for different models
  - If `model` is specified, the test case will only run when validating the corresponding model Profile
  - If `model` is not specified, the test case applies to all models (generic test)
  - Model name is automatically extracted from the Profile filename (e.g., `Senso8-LRS20100.yaml` → `LRS20100`)
- `fPort` (Required): LoRaWAN port number
- `input` (Required): Uplink data in hexadecimal format
- `description` (Optional): Test case description

**Best Practices**:
- ✅ Use **real device data**, do not fabricate
- ✅ Cover main scenarios: normal, boundary, exceptional
- ✅ Add clear descriptions explaining data meaning
- ✅ For multi-model scenarios, use `model` field to distinguish test cases

### Step 3: Run Decode to View Actual Output

```bash
node scripts/test-codec.js \
  -f profiles/Vendor/Model.yaml \
  -p 10 \
  -u 040164010000000f41dc
```

**Example Output**:
```json
{
  "data": [
    { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" },
    { "name": "Humidity", "channel": 2, "value": 60.0, "unit": "%" },
    { "name": "Battery", "channel": 3, "value": 100, "unit": "%" }
  ]
}
```

### Step 4: Create expected-output.json

After confirming the output is correct, create the expected output file:

```json
{
  "description": "Vendor-Model expected output",
  "testCases": [
    {
      "name": "Normal working data",
      "expectedOutput": [
        { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" },
        { "name": "Humidity", "channel": 2, "value": 60.0, "unit": "%" },
        { "name": "Battery", "channel": 3, "value": 100, "unit": "%" }
      ]
    },
    {
      "name": "Low temperature alert",
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

**Important Notes**:
- ⚠️ `expectedOutput` is an **array**, directly corresponding to the `data` field
- ⚠️ Test case order must **exactly match** `test-data.json`
- ⚠️ Include all fields: `name`, `channel`, `value`, `unit`

### Step 5: Run Complete Validation

```bash
node scripts/validate-profile.js profiles/Vendor/Model.yaml
```

**Success Output**:
```
🧪 Running test data validation...
  ✓ Pass

Test result details:
  ✓ Normal working data [Output matched]
  ✓ Low temperature alert [Output matched]

======================================================================
✅ Validation passed
======================================================================
```

---

## 📊 Validation Behavior Comparison

| Test File Configuration | Validation Behavior | Test Result | Recommendation |
|------------------------|---------------------|-------------|----------------|
| Only `test-data.json` | Only checks decode success | `[Output not verified]` | ⚠️ Basic |
| Both files present | **Deep comparison of output** | `[Output matched]` | ✅ Recommended |

---

## 🔍 Deep Comparison Mechanism

The validation script performs **strict deep comparison**:

### Comparison Content
- ✅ Array length
- ✅ All fields in each object
- ✅ Field value types and values
- ✅ null and undefined

### Example

**Expected Output**:
```json
[
  { "name": "Temperature", "channel": 1, "value": 25.0, "unit": "°C" }
]
```

**Actual Output**:
```json
[
  { "name": "Temperature", "channel": 1, "value": 25.1, "unit": "°C" }
]
```

**Result**: ❌ Validation failed (value mismatch: 25.0 vs 25.1)

---

## ⚠️ Common Errors and Solutions

### Error 1: Output Mismatch - Field Order

```
❌ Error: Expected and actual output field order differs
```

**Cause**: JavaScript object field order may vary

**Solution**: Deep comparison doesn't care about field order, only field existence and values. If error occurs, check for field name typos.

---

### Error 2: Output Mismatch - Numeric Types

```json
// Expected
{ "value": 25 }

// Actual
{ "value": 25.0 }
```

**Cause**: In JavaScript, `25` and `25.0` are equal, but JSON serialization may differ in some cases

**Solution**: Consistently use float format (`25.0`) or integer format (`25`)

---

### Error 3: Test Case Order Inconsistent

```
❌ Error: Test case 1 in test-data.json doesn't match test case 1 in expected-output.json
```

**Cause**: Test case order differs between the two files

**Solution**: Ensure the `testCases` array order is exactly the same in both files

---

### Error 4: expectedOutput Format Error

```json
// ❌ Incorrect format
{
  "expectedOutput": {
    "data": [...]
  }
}

// ✅ Correct format
{
  "expectedOutput": [...]
}
```

**Cause**: `expectedOutput` should be a direct array, not wrapped in a `data` object

**Solution**: `expectedOutput` directly corresponds to the `data` field returned by `decodeUplink`

---

## 🏢 Multi-Model Test Case Management

When multiple model Profiles exist under the same vendor directory, you can use the `model` field to distinguish and filter test cases.

### Use Cases

Suitable for situations where:
- A vendor has multiple product models
- Different models use the same protocol but different data formats
- You need to manage test cases for all models in a single `tests` directory

### Directory Structure Example

```
profiles/Senso8/
├── Senso8-LRS20100.yaml      # Temperature & Humidity Sensor
├── Senso8-LRS20200.yaml      # Temperature Sensor
├── Senso8-LRS20310.yaml      # CO2 Sensor
├── Senso8-LRS20600.yaml      # Door Sensor
└── tests/
    ├── test-data.json         # Test inputs for all models
    └── expected-output.json   # Expected outputs for all models
```

### Configuration Example

**test-data.json**:
```json
{
  "description": "Senso8 Series Test Cases",
  "testCases": [
    {
      "name": "LRS20100 Temperature & Humidity Test",
      "model": "LRS20100",
      "fPort": 10,
      "input": "01016400e901ef00000000"
    },
    {
      "name": "LRS20200 Temperature Test",
      "model": "LRS20200",
      "fPort": 10,
      "input": "01010064000000000000"
    },
    {
      "name": "Generic Battery Test",
      "fPort": 10,
      "input": "010164006400640000"
    }
  ]
}
```

**expected-output.json**:
```json
{
  "description": "Expected Outputs",
  "testCases": [
    {
      "name": "LRS20100 Temperature & Humidity Test",
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
      "name": "LRS20200 Temperature Test",
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

### Validation Behavior

#### Automatic Model Detection

The validation script automatically extracts the model from the filename:

- `Senso8-LRS20100.yaml` → Model: `LRS20100`
- `Senso8-LRS20200.yaml` → Model: `LRS20200`
- `Dragino-LDS02.yaml` → Model: `LDS02`

#### Test Case Filtering Rules

When validating a specific Profile:

1. **Matching Model Tests** - Run test cases where `model` field matches the current model
2. **Generic Tests** - Run test cases without a `model` field
3. **Skip Other Models** - Skip test cases with `model` field for other models

#### Validation Results Example

Given the following test cases:

```json
{
  "testCases": [
    { "name": "Test A", "model": "LRS20100", ... },
    { "name": "Test B", "model": "LRS20200", ... },
    { "name": "Test C", ... }  // No model field
  ]
}
```

| Profile Being Validated | Test Cases Run |
|------------------------|----------------|
| `Senso8-LRS20100.yaml` | Test A, Test C |
| `Senso8-LRS20200.yaml` | Test B, Test C |
| `Senso8-LRS20600.yaml` | Test C |

### Command Line Output

```bash
node scripts/validate-profile.js profiles/Senso8/Senso8-LRS20100.yaml
```

Output example:
```
🧪 Running test data validation...
  Model detected: LRS20100
  Running 2 of 5 test cases
  ✓ Pass

Test result details:
  ✓ LRS20100 Temperature & Humidity Test [LRS20100] [Output matched]
  ✓ Generic Battery Test [Output not verified]
```

**Description**:
- `Model detected: LRS20100` - Automatically detected model
- `Running 2 of 5 test cases` - Ran 2 tests out of 5 total
- `[LRS20100]` - Displays the model this test case belongs to

### Best Practices

#### 1. Naming Convention

Include model information in test case names:

```json
{
  "name": "LRS20100 Normal Temperature & Humidity Test",
  "model": "LRS20100",
  ...
}
```

#### 2. Generic Test Cases

For functionality applicable to all models (like battery level, button), don't specify the `model` field:

```json
{
  "name": "Battery Level Test",
  // No model field, applies to all models
  "fPort": 10,
  "input": "..."
}
```

#### 3. Group by Functionality

```json
{
  "testCases": [
    // Basic functionality tests
    { "name": "LRS20100 Basic Data Report", "model": "LRS20100", ... },
    { "name": "LRS20200 Basic Data Report", "model": "LRS20200", ... },
    
    // Alarm tests
    { "name": "LRS20100 High Temperature Alarm", "model": "LRS20100", ... },
    { "name": "LRS20100 Low Temperature Alarm", "model": "LRS20100", ... },
    
    // Generic tests
    { "name": "Generic Battery Level Test", ... },
    { "name": "Generic Button Test", ... }
  ]
}
```

### Troubleshooting

#### Issue: Test cases are not being run

**Cause**:
- Typo in `model` field
- Filename doesn't follow `Vendor-Model.yaml` format

**Solution**:
1. Check if `model` field matches the model in filename
2. Ensure filename format is `Vendor-Model.yaml`

#### Issue: All tests are skipped

**Cause**:
- All test cases have `model` specified, but none match the current model

**Solution**:
- Check the `model` field of test cases
- Or remove `model` field to make them generic tests

#### Issue: Cannot detect model

Validation script outputs:
```
Model detected: null
Running 5 of 5 test cases
```

**Cause**:
- Filename doesn't follow `Vendor-Model.yaml` format

**Solution**:
- Rename file to standard format, e.g., `Senso8-LRS20100.yaml`

---

## 🎯 Test Data Best Practices

### 1. Cover Main Scenarios

```json
{
  "testCases": [
    { "name": "Normal working data", ... },
    { "name": "Boundary value - Maximum temperature", ... },
    { "name": "Boundary value - Minimum temperature", ... },
    { "name": "Alarm triggered", ... },
    { "name": "Low battery", ... },
    { "name": "Sensor disconnected", ... }
  ]
}
```

### 2. Use Clear Naming

✅ **Good Naming**:
- "Normal temperature humidity data - 25°C, 60%"
- "Temperature sensor disconnect alarm"
- "Low battery warning - Battery 10%"

❌ **Poor Naming**:
- "Test1"
- "test"
- "data"

### 3. Add Detailed Descriptions

```json
{
  "name": "High temperature alarm",
  "fPort": 10,
  "input": "0801E40308009C0000640A",
  "description": "Temperature=45°C, triggers high temperature alarm (threshold 40°C), Humidity=50%, Battery=100%"
}
```

### 4. Use Real Data

```bash
# Obtain real uplink data from RAK gateway
# ChirpStack log example:
# Uplink: {"data":"040164010000000f41dc","fPort":10}
```

### 5. Keep Expected Output Accurate

Run tests regularly to ensure expected output matches actual behavior:

```bash
# Run after each Codec modification
node scripts/validate-profile.js profiles/Vendor/Model.yaml
```

---

## 🛠️ Debugging Tips

### Tip 1: View Detailed Differences

Validation failures automatically display differences:

```
✗ Normal data: Output does not match expected result
  Expected output:
  [
    { "name": "Temperature", "value": 25.0 }
  ]
  Actual output:
  [
    { "name": "Temperature", "value": 25.1 }
  ]
```

### Tip 2: Add Tests Incrementally

Progress from simple to complex:

```json
// Step 1: Simplest case
{ "testCases": [
  { "name": "Basic data", ... }
]}

// Step 2: Add boundary cases
{ "testCases": [
  { "name": "Basic data", ... },
  { "name": "Maximum value", ... },
  { "name": "Minimum value", ... }
]}
```

### Tip 3: Use JSON Tools to Validate Format

```bash
# Validate JSON format is correct
cat profiles/Vendor/tests/test-data.json | jq .
cat profiles/Vendor/tests/expected-output.json | jq .
```

---

## 📚 Complete Examples

View examples in the project:

- `examples/minimal-profile/tests/` - Minimal example
- `examples/standard-profile/tests/` - Complete example

---

## ✅ Checklist

Confirm before submitting Profile:

- [ ] Created `tests/test-data.json`
- [ ] Created `tests/expected-output.json`
- [ ] Contains at least 2-3 test cases
- [ ] Test data comes from real devices
- [ ] Test case order is consistent in both files
- [ ] All tests pass when running `validate-profile.js`
- [ ] All tests show `[Output matched]`

---

**Last Updated**: 2025-10-23
