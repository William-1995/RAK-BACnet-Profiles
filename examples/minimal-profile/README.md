# Minimal Viable Profile Example

This is the simplest Profile example, suitable for beginners to quickly understand the basic structure of a Profile.

## 📋 Example Description

**Device Type:** Temperature Sensor  
**Function:** Periodically report temperature data  
**Complexity:** ⭐ Simple

## 🎯 Learning Objectives

Through this example, you will learn:
1. Basic Profile file structure
2. How to write simple decode functions
3. How to configure BACnet object mapping
4. How to configure basic LoRaWAN parameters

## 📦 File Description

```
minimal-profile/
├── README.md                    # This file
├── minimal-sensor.yaml          # Profile configuration file
└── tests/
    ├── test-data.json          # Test data
    └── expected-output.json    # Expected output
```

## 🔍 Key Concepts

### 1. Codec Function Structure
```javascript
function Decode(fPort, data, variables) {
  var values = [];
  // ... Parse data
  values.push({ 
    name: "Temperature",    // Parameter name
    channel: 1,            // Channel number (used to associate with BACnet object)
    value: 25.5,           // Parsed value
    unit: '°C'             // Unit (optional)
  });
  return values;
}
```

### 2. BACnet Object Configuration
```yaml
datatype:
  "1":                          # Corresponds to channel: 1
    name: Temperature           # BACnet object name
    type: AnalogInputObject     # Object type
    units: degreesCelsius       # BACnet standard unit
    covIncrement: 0.1          # Change detection threshold (0.1°C)
    updateInterval: 600        # Update interval (600 seconds = 10 minutes)
```

### 3. Data Parsing Example

**Raw Data:** `01 00 FF` (hexadecimal)

**Parsing Process:**
```javascript
// Byte 0: 0x01 = Version number (skip)
// Byte 1-2: 0x00FF = Temperature value (big-endian)
var temperature = view.getInt16(1, false); // = 255
var temperatureCelsius = temperature / 10.0; // = 25.5°C
```

## 🧪 Test Data

View `tests/test-data.json` and `tests/expected-output.json` to understand how to organize test data.

### Testing Method
```javascript
// Manual testing
var testData = [0x01, 0x00, 0xFF];
var result = Decode(10, testData, {});
console.log(result);
// Expected output: [{ name: "Temperature", channel: 1, value: 25.5, unit: "°C" }]
```

## 📝 How to Create Your Own Profile Based on This Example

### Step 1: Copy Files
```bash
cp examples/minimal-profile/minimal-sensor.yaml profiles/YourVendor/YourVendor-Model.yaml
```

### Step 2: Modify Device Information
```yaml
model: YourVendor-YourModel
vendor: YourVendor
profileVersion: 1.0.0
```

### Step 3: Modify Codec Functions
Modify the decode logic based on your device's data format.

### Step 4: Modify BACnet Objects
Adjust object configuration based on your sensor type.

### Step 5: Prepare Test Data
Create real test data and verify decode results.

## ⚠️ Important Notes

1. **Byte Order**: Confirm whether your device uses big-endian or little-endian
2. **Data Units**: Raw data may need conversion (e.g., ÷10, ÷100)
3. **fPort**: Confirm the fPort number used by the device
4. **Channel Numbering**: Must start from 1, use strings in datatype

## 🚀 Next Steps

After mastering the minimal example, you can learn:
- [Standard Complete Example](../standard-profile/) - Multiple sensors, more complex functionality
- View actual Profile files in the repository as reference

---

**Tip**: Having issues? [Submit an Issue](https://github.com/RAKWireless/RAK-BACnet-Profiles/issues) for help!
