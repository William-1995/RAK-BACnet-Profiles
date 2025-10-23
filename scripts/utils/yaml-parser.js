/**
 * YAML 解析和 Profile 提取工具
 */

const fs = require('fs');
const yaml = require('js-yaml');

/**
 * 读取并解析 YAML 文件
 * @param {string} filePath - YAML 文件路径
 * @returns {object} 解析后的对象
 */
function loadYAML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    throw new Error(`Failed to load YAML file ${filePath}: ${error.message}`);
  }
}

/**
 * 从 Profile 中提取 Codec 函数代码
 * @param {object} profile - Profile 对象
 * @returns {string} Codec JavaScript 代码
 */
function extractCodec(profile) {
  if (!profile.codec) {
    throw new Error('No codec found in profile');
  }
  
  return profile.codec;
}

/**
 * 验证 Profile 必需字段
 * @param {object} profile - Profile 对象
 * @returns {object} 验证结果 {valid: boolean, errors: string[]}
 */
function validateRequiredFields(profile) {
  const requiredFields = ['model', 'codec', 'datatype', 'lorawan'];
  const errors = [];
  
  for (const field of requiredFields) {
    if (!profile[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // 验证 codec 字段的内容
  if (profile.codec) {
    if (typeof profile.codec !== 'string') {
      errors.push('codec field must be a string');
    } else {
      // 检查是否包含必需的函数
      if (!profile.codec.includes('decodeUplink')) {
        errors.push('codec must include decodeUplink function');
      }
    }
  }
  
  // 验证 datatype 字段
  if (profile.datatype) {
    if (typeof profile.datatype !== 'object') {
      errors.push('datatype field must be an object');
    } else {
      // 验证每个 channel 的配置
      for (const [channel, config] of Object.entries(profile.datatype)) {
        if (!config.name) {
          errors.push(`datatype.${channel}: missing 'name' field`);
        }
        if (!config.type) {
          errors.push(`datatype.${channel}: missing 'type' field`);
        }
      }
    }
  }
  
  // 验证 lorawan 字段
  if (profile.lorawan) {
    const lorawanRequired = ['macVersion', 'region', 'supportOTAA'];
    for (const field of lorawanRequired) {
      if (profile.lorawan[field] === undefined) {
        errors.push(`lorawan.${field} is required`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证 BACnet 对象类型
 * @param {object} profile - Profile 对象
 * @returns {object} 验证结果
 */
function validateBACnetObjects(profile) {
  const supportedTypes = [
    'AnalogInputObject',
    'AnalogOutputObject',
    'AnalogValueObject',
    'BinaryInputObject',
    'BinaryOutputObject',
    'BinaryValueObject',
    'OctetStringValueObject'
  ];
  
  const errors = [];
  const warnings = [];
  
  if (profile.datatype) {
    for (const [channel, config] of Object.entries(profile.datatype)) {
      // 验证对象类型
      if (!supportedTypes.includes(config.type)) {
        errors.push(`datatype.${channel}: unsupported BACnet object type '${config.type}'`);
      }
      
      // // 验证 Analog 对象的单位
      // if (config.type.startsWith('Analog') && !config.units) {
      //   warnings.push(`datatype.${channel}: Analog object should have 'units' field`);
      // }
      
      // // 验证 updateInterval
      // if (!config.updateInterval) {
      //   warnings.push(`datatype.${channel}: missing 'updateInterval' field`);
      // }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 从 Profile 文件路径提取厂商和型号
 * @param {string} filePath - Profile 文件路径
 * @returns {object} {vendor: string, model: string}
 */
function extractVendorModel(filePath) {
  const parts = filePath.split(/[\/\\]/);
  const filename = parts[parts.length - 1];
  const vendor = parts[parts.length - 2] || 'Unknown';
  const model = filename.replace('.yaml', '').replace('.yml', '');
  
  return { vendor, model };
}

module.exports = {
  loadYAML,
  extractCodec,
  validateRequiredFields,
  validateBACnetObjects,
  extractVendorModel
};

