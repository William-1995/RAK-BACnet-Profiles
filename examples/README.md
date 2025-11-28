# Profile Examples

This directory contains standardized Profile examples to help you quickly understand and create BACnet Profile configurations.

## 📚 Example List

### 1. [Minimal Viable Example](./minimal-profile/)
Suitable for beginners, demonstrating the most basic Profile structure.

**Features:**
- Single sensor (temperature)
- Basic Codec functions
- Simple BACnet object mapping
- Detailed explanatory comments

**Use Case:** Quick start, understanding basic structure

---

### 2. [Standard Complete Example](./standard-profile/)
Demonstrates a production-ready complete Profile.

**Features:**
- Multiple sensor parameters (temperature, humidity, battery)
- Complete LoRaWAN configuration
- Various BACnet object types
- Includes test data

**Use Case:** Real project development reference

---

## 🎯 How to Use Examples

### Step 1: Choose the Right Example
- If creating a Profile for the first time → Start with the **Minimal Viable Example**
- If you need full functionality → Refer to the **Standard Complete Example**

### Step 2: Copy and Modify
```bash
# Copy example Profile
cp examples/standard-profile/standard-temp-humidity-sensor.yaml profiles/YourVendor/YourVendor-Model.yaml

# Modify configuration based on actual device
```

### Step 3: Prepare Test Data
Each example includes a `tests/` directory showing how to organize test data:
- `test-data.json` - Raw uplink data for testing
- `expected-output.json` - Expected decode results

### Step 4: Validate Profile
Ensure your Profile:
- ✅ YAML syntax is correct
- ✅ Codec functions can correctly decode test data
- ✅ BACnet object types are correct
- ✅ All required fields are complete

---

## 📖 Profile Structure Overview

### Complete Profile File Structure

```yaml
# Codec encode/decode functions
codec: |
  function Decode(fPort, data, variables) { ... }
  function Encode(data, variables) { ... }
  function decodeUplink(input) { ... }
  function encodeDownlink(input) { ... }

# Data types and BACnet object mapping
datatype:
  "1":
    name: Temperature
    type: AnalogInputObject
    units: degreesCelsius
    covIncrement: 0.1
    updateInterval: 600

# LoRaWAN configuration
lorawan:
  adrAlgorithm: LoRa Only # Optional Default: LoRa Only
  classCDownlinkTimeout: 5 # Optional Default: 5
  macVersion: LORAWAN_1_0_3
  region: AS923
  supportClassB: false
  supportClassC: false
  supportOTAA: true # Optional Default: true

# Device information
model: Vendor-Model
profileVersion: 1.0.0
vendor: YourVendor
```

---

## 🔧 Supported BACnet Object Types

| Object Type | Description | Typical Use |
|-------------|-------------|-------------|
| **AnalogInputObject** | Analog input | Temperature, humidity, voltage and other sensor readings |
| **AnalogOutputObject** | Analog output | Controllable analog values (valve openings, etc.) |
| **AnalogValueObject** | Analog value | General analog value storage |
| **BinaryInputObject** | Binary input | Door/window status, buttons, alarm status |
| **BinaryOutputObject** | Binary output | Controllable switches (lights, relays) |
| **BinaryValueObject** | Binary value | General boolean value storage |
| **OctetStringValueObject** | Octet string value | Strings or special data |

---

## 📝 Common Units List

| Unit Name | BACnet Unit Identifier | Description |
|-----------|----------------------|-------------|
| Celsius | `degreesCelsius` | Temperature |
| Percentage | `percent` | Humidity, battery level |
| Millivolts | `millivolts` | Voltage |
| Milliamperes | `milliamperes` | Current |
| Lux | `luxes` | Light intensity |
| Millimeters | `millimeters` | Distance |
| PPM | `partsPerMillion` | Gas concentration |
| Seconds | `seconds` | Time interval |
| Minutes | `minutes` | Time interval |

For more units, please refer to the BACnet standard documentation.

---

## ❓ Frequently Asked Questions

### Q1: Which functions must the Codec include?
At minimum, you need to implement:
- `Decode(fPort, data, variables)` - Core decode function
- `decodeUplink(input)` - Standard uplink decode interface

If the device supports downlink control, you also need:
- `Encode(data, variables)` - Core encode function
- `encodeDownlink(input)` - Standard downlink encode interface

### Q2: What is channel? How to assign it?
`channel` is a data channel number used to associate Codec output with BACnet objects.
- In the Codec function, each data point has a channel number
- In datatype, quoted numbers correspond to channel numbers
- Channel numbers start from 1 and must be unique

### Q3: What is fPort?
fPort is the LoRaWAN protocol port number used to distinguish different types of messages:
- Usually fPort 10 is used for sensor data reporting
- fPort 12, 13, etc. may be used for configuration or special data
- Specific meanings are defined by device vendors

### Q4: What are updateInterval and covIncrement?
- `updateInterval`: Data update interval (seconds), recommended to match device's actual reporting period
- `covIncrement`: Change detection threshold, triggers COV notification when value changes exceed this amount (for analog values only)

### Q5: How to handle byte order (big-endian/little-endian)?
JavaScript DataView's second parameter controls byte order:
```javascript
// Big Endian (default) - high byte first
view.getInt16(0, false)  

// Little Endian - low byte first
view.getInt16(0, true)
```

---

## 📞 Get Help

- 🐛 [Report Issue](https://github.com/RAKWireless/RAK-BACnet-Profiles/issues/new?template=bug-report.yml) - Found a bug
- 🆕 [Request Profile](https://github.com/RAKWireless/RAK-BACnet-Profiles/issues/new?template=device-profile-request.yml) - Request new device support

---

**Last Updated**: 2025-10-23
