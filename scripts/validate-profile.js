#!/usr/bin/env node

/**
 * Profile 验证工具
 * 完整验证 BACnet Profile 配置文件
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const {
  loadYAML,
  validateRequiredFields,
  validateBACnetObjects,
  extractVendorModel
} = require('./utils/yaml-parser');
const { testDecode } = require('./test-codec');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * 验证 YAML 语法
 * @param {string} filePath - YAML 文件路径
 * @returns {object} 验证结果
 */
function validateYAMLSyntax(filePath) {
  const errors = [];
  
  try {
    loadYAML(filePath);
  } catch (error) {
    errors.push(`YAML syntax error: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证 Profile Schema
 * @param {object} profile - Profile 对象
 * @returns {object} 验证结果
 */
function validateSchema(profile) {
  const ajv = new Ajv({ allErrors: true });
  const schemaPath = path.join(__dirname, 'profile-schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  
  const validate = ajv.compile(schema);
  const valid = validate(profile);
  
  const errors = validate.errors
    ? validate.errors.map(err => `${err.instancePath} ${err.message}`)
    : [];
  
  return {
    valid,
    errors
  };
}

/**
 * 验证 Codec 函数语法
 * @param {string} codecSource - Codec 源码
 * @returns {object} 验证结果
 */
function validateCodecSyntax(codecSource) {
  const errors = [];
  const warnings = [];
  
  // 检查必需的函数
  const requiredFunctions = ['Decode', 'decodeUplink'];
  for (const func of requiredFunctions) {
    if (!codecSource.includes(func)) {
      errors.push(`Missing required function: ${func}`);
    }
  }
  
  // 检查可选函数
  const optionalFunctions = ['Encode', 'encodeDownlink'];
  for (const func of optionalFunctions) {
    if (!codecSource.includes(func)) {
      warnings.push(`Optional function not found: ${func} (下行控制将不可用)`);
    }
  }
  
  // 尝试在沙箱中执行以检查语法
  const vm = require('vm');
  try {
    const sandbox = {
      console: console,
      Uint8Array: Uint8Array,
      DataView: DataView,
      Array: Array,
      parseInt: parseInt,
      parseFloat: parseFloat,
      Math: Math,
      JSON: JSON,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean
    };
    vm.createContext(sandbox);
    
    // 使用 vm.Script 来更好地处理语法检查，避免作用域问题
    const script = new vm.Script(codecSource, {
      filename: 'codec.js',
      lineOffset: 0,
      columnOffset: 0
    });
    script.runInContext(sandbox);
  } catch (error) {
    errors.push(`JavaScript syntax error: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证文件命名规范
 * @param {string} filePath - 文件路径
 * @returns {object} 验证结果
 */
function validateFileNaming(filePath) {
  const errors = [];
  const warnings = [];
  
  const filename = path.basename(filePath);
  
  // 检查文件扩展名
  if (!filename.endsWith('.yaml') && !filename.endsWith('.yml')) {
    errors.push('File must have .yaml or .yml extension');
  }
  
  // 检查命名格式（应该是 Vendor-Model.yaml）
  const namePattern = /^[A-Za-z0-9]+-[A-Za-z0-9-]+\.(yaml|yml)$/;
  if (!namePattern.test(filename)) {
    warnings.push('Filename should follow format: Vendor-Model.yaml');
  }
  
  // 检查目录结构（应该在 profiles/Vendor/ 下）
  const parts = filePath.split(/[\/\\]/);
  if (parts.length >= 3) {
    const profilesIndex = parts.indexOf('profiles');
    if (profilesIndex >= 0 && profilesIndex < parts.length - 2) {
      const vendor = parts[profilesIndex + 1];
      if (!filename.startsWith(vendor)) {
        warnings.push(`Filename should start with vendor name: ${vendor}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 深度比较两个值是否相等
 * @param {*} actual - 实际值
 * @param {*} expected - 期望值
 * @returns {boolean} 是否相等
 */
function deepEqual(actual, expected) {
  // 处理 null 和 undefined
  if (actual === expected) return true;
  if (actual == null || expected == null) return false;
  
  // 处理数组
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i])) return false;
    }
    return true;
  }
  
  // 处理对象
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    
    // 检查键数量
    if (actualKeys.length !== expectedKeys.length) return false;
    
    // 检查每个键和值
    for (const key of actualKeys) {
      if (!expectedKeys.includes(key)) return false;
      if (!deepEqual(actual[key], expected[key])) return false;
    }
    return true;
  }
  
  // 基本类型比较
  return actual === expected;
}

/**
 * 运行测试数据验证
 * @param {object} profile - Profile 对象
 * @param {string} filePath - Profile 文件路径
 * @returns {object} 验证结果
 */
function runTestDataValidation(profile, filePath) {
  const errors = [];
  const warnings = [];
  const results = [];
  
  // 查找测试数据文件
  const dir = path.dirname(filePath);
  const testDataPath = path.join(dir, 'tests', 'test-data.json');
  const expectedOutputPath = path.join(dir, 'tests', 'expected-output.json');
  
  if (!fs.existsSync(testDataPath)) {
    warnings.push('No test data found (tests/test-data.json)');
    return {
      valid: true,
      errors,
      warnings,
      results
    };
  }
  
  // 尝试加载期望输出
  let expectedOutputData = null;
  if (fs.existsSync(expectedOutputPath)) {
    try {
      expectedOutputData = JSON.parse(fs.readFileSync(expectedOutputPath, 'utf8'));
    } catch (error) {
      warnings.push(`Failed to load expected output: ${error.message}`);
    }
  }
  
  try {
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    const codec = profile.codec;
    
    for (let i = 0; i < (testData.testCases || []).length; i++) {
      const testCase = testData.testCases[i];
      
      try {
        const result = testDecode(codec, testCase.fPort, testCase.input);
        
        // 如果有期望输出，进行比对
        if (expectedOutputData && expectedOutputData.testCases && expectedOutputData.testCases[i]) {
          const expectedCase = expectedOutputData.testCases[i];
          const expectedOutput = expectedCase.expectedOutput;
          const actualOutput = result.data;
          
          if (expectedOutput) {
            // 比对实际输出和期望输出
            if (deepEqual(actualOutput, expectedOutput)) {
              results.push({
                name: testCase.name,
                status: 'PASS',
                result: result,
                matched: true
              });
            } else {
              // 输出不匹配
              errors.push(`Test case '${testCase.name}' output mismatch`);
              results.push({
                name: testCase.name,
                status: 'FAIL',
                error: 'Output does not match expected result',
                actualOutput: actualOutput,
                expectedOutput: expectedOutput,
                matched: false
              });
            }
          } else {
            // 没有期望输出，只检查是否成功执行
            results.push({
              name: testCase.name,
              status: 'PASS',
              result: result,
              matched: null
            });
          }
        } else {
          // 没有期望输出文件，只检查是否成功执行
          results.push({
            name: testCase.name,
            status: 'PASS',
            result: result,
            matched: null
          });
        }
      } catch (error) {
        errors.push(`Test case '${testCase.name}' failed: ${error.message}`);
        results.push({
          name: testCase.name,
          status: 'FAIL',
          error: error.message
        });
      }
    }
  } catch (error) {
    errors.push(`Failed to load test data: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    results
  };
}

/**
 * 完整验证流程
 * @param {string} filePath - Profile YAML 文件路径
 * @param {object} options - 验证选项
 * @returns {object} 完整验证结果
 */
function validateProfile(filePath, options = {}) {
  const report = {
    file: filePath,
    timestamp: new Date().toISOString(),
    valid: true,
    checks: {}
  };
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.blue}验证 Profile: ${filePath}${colors.reset}`);
  console.log(`${'='.repeat(70)}\n`);
  
  // 1. YAML 语法验证
  console.log('📝 检查 YAML 语法...');
  const yamlCheck = validateYAMLSyntax(filePath);
  report.checks.yamlSyntax = yamlCheck;
  printResult(yamlCheck);
  
  if (!yamlCheck.valid) {
    report.valid = false;
    return report;
  }
  
  // 加载 Profile
  const profile = loadYAML(filePath);
  
  // 2. Schema 验证
  console.log('\n📋 检查 Profile 结构...');
  const schemaCheck = validateSchema(profile);
  report.checks.schema = schemaCheck;
  printResult(schemaCheck);
  if (!schemaCheck.valid) report.valid = false;
  
  // 3. 必需字段验证
  console.log('\n📦 检查必需字段...');
  const fieldsCheck = validateRequiredFields(profile);
  report.checks.requiredFields = fieldsCheck;
  printResult(fieldsCheck);
  if (!fieldsCheck.valid) report.valid = false;
  
  // 4. Codec 函数验证
  console.log('\n🔧 检查 Codec 函数...');
  const codecCheck = validateCodecSyntax(profile.codec);
  report.checks.codec = codecCheck;
  printResult(codecCheck);
  if (!codecCheck.valid) report.valid = false;
  
  // 5. BACnet 对象验证
  console.log('\n🏢 检查 BACnet 对象配置...');
  const bacnetCheck = validateBACnetObjects(profile);
  report.checks.bacnet = bacnetCheck;
  printResult(bacnetCheck);
  if (!bacnetCheck.valid) report.valid = false;
  
  // 6. 文件命名验证
  console.log('\n📁 检查文件命名规范...');
  const namingCheck = validateFileNaming(filePath);
  report.checks.naming = namingCheck;
  printResult(namingCheck);
  
  // 7. 测试数据验证（完整验证）
  if (options.runTests !== false) {
    console.log('\n🧪 运行测试数据验证...');
    const testCheck = runTestDataValidation(profile, filePath);
    report.checks.tests = testCheck;
    printResult(testCheck);
    if (!testCheck.valid) report.valid = false;
    
    if (testCheck.results && testCheck.results.length > 0) {
      console.log('\n测试结果详情:');
      for (const test of testCheck.results) {
        if (test.status === 'PASS') {
          if (test.matched === true) {
            console.log(`  ${colors.green}✓${colors.reset} ${test.name} ${colors.green}[输出匹配]${colors.reset}`);
          } else if (test.matched === null) {
            console.log(`  ${colors.green}✓${colors.reset} ${test.name} ${colors.yellow}[未验证输出]${colors.reset}`);
          } else {
            console.log(`  ${colors.green}✓${colors.reset} ${test.name}`);
          }
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${test.name}: ${test.error}`);
          
          // 如果是输出不匹配，显示详细信息
          if (test.matched === false && test.actualOutput && test.expectedOutput) {
            console.log(`    ${colors.yellow}期望输出:${colors.reset}`);
            console.log(`    ${JSON.stringify(test.expectedOutput, null, 2).split('\n').join('\n    ')}`);
            console.log(`    ${colors.yellow}实际输出:${colors.reset}`);
            console.log(`    ${JSON.stringify(test.actualOutput, null, 2).split('\n').join('\n    ')}`);
          }
        }
      }
    }
  }
  
  // 最终结果
  console.log(`\n${'='.repeat(70)}`);
  if (report.valid) {
    console.log(`${colors.green}✅ 验证通过${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ 验证失败${colors.reset}`);
  }
  console.log(`${'='.repeat(70)}\n`);
  
  return report;
}

/**
 * 打印验证结果
 * @param {object} result - 验证结果
 */
function printResult(result) {
  if (result.valid) {
    console.log(`  ${colors.green}✓ 通过${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✗ 失败${colors.reset}`);
  }
  
  if (result.errors && result.errors.length > 0) {
    for (const error of result.errors) {
      console.log(`  ${colors.red}  ✗ ${error}${colors.reset}`);
    }
  }
  
  if (result.warnings && result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.log(`  ${colors.yellow}  ⚠ ${warning}${colors.reset}`);
    }
  }
}

/**
 * 命令行接口
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Profile Validation Tool

用法:
  node validate-profile.js <profile.yaml> [options]

选项:
  --no-tests              跳过测试数据验证
  --json                  输出 JSON 格式的报告
  -h, --help              显示帮助信息

示例:
  node validate-profile.js profiles/Senso8/Senso8-LRS20600.yaml
  node validate-profile.js profiles/Dragino/Dragino-LDS02.yaml --no-tests
  node validate-profile.js profiles/Milesight/Milesight-VS330.yaml --json
    `);
    process.exit(0);
  }
  
  const filePath = args[0];
  const options = {
    runTests: !args.includes('--no-tests'),
    jsonOutput: args.includes('--json')
  };
  
  if (!filePath) {
    console.error('❌ 错误: 请提供 Profile 文件路径');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 错误: 文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const report = validateProfile(filePath, options);
    
    if (options.jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    }
    
    process.exit(report.valid ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ 验证过程出错: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 如果作为主模块运行
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  validateProfile,
  validateYAMLSyntax,
  validateSchema,
  validateCodecSyntax,
  validateBACnetObjects,
  validateFileNaming
};

