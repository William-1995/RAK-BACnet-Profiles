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
      "fPort": 10,
      "input": "040164010000000f41dc",
      "description": "Temperature=25°C, Humidity=60%, Battery=100%"
    },
    {
      "name": "Low temperature alert",
      "fPort": 10,
      "input": "0801640100000000ffdc",
      "description": "Temperature=-5°C, triggers low temperature alarm"
    }
  ]
}
```

**Best Practices**:
- ✅ Use **real device data**, do not fabricate
- ✅ Cover main scenarios: normal, boundary, exceptional
- ✅ Add clear descriptions explaining data meaning

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
