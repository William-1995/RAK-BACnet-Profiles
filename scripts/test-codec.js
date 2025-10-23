#!/usr/bin/env node

/**
 * Codec 函数测试工具
 * 用于测试 Profile 中的编解码函数
 */

const fs = require('fs');
const vm = require('vm');
const { hexToBytes, bytesToHex, formatHex } = require('./utils/hex-converter');
const { loadYAML, extractCodec } = require('./utils/yaml-parser');

/**
 * 在沙箱中测试 Codec 函数
 * @param {string} codecSource - Codec JavaScript 源码
 * @param {number} fPort - LoRaWAN fPort
 * @param {string} uplinkData - 十六进制格式的上行数据
 * @returns {object} 解码结果
 */
function testDecode(codecSource, fPort, uplinkData) {
  // 创建沙箱环境
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
  
  // 执行 codec 代码
  try {
    vm.createContext(sandbox);
    // 直接执行 codec 代码，不包装（因为我们需要在 sandbox 中访问定义的函数）
    vm.runInContext(codecSource, sandbox);
  } catch (error) {
    throw new Error(`Codec syntax error: ${error.message}`);
  }
  
  // 验证必需的函数是否存在
  if (!sandbox.decodeUplink) {
    throw new Error('decodeUplink function not found in codec');
  }
  
  // 准备输入数据
  const bytes = hexToBytes(uplinkData);
  const input = {
    bytes: bytes,
    fPort: parseInt(fPort),
    variables: {}
  };
  
  // 调用 decodeUplink 函数
  try {
    const result = sandbox.decodeUplink(input);
    return result;
  } catch (error) {
    throw new Error(`Decode execution error: ${error.message}`);
  }
}

/**
 * 测试编码功能（下行）
 * @param {string} codecSource - Codec JavaScript 源码
 * @param {object} data - 要编码的数据
 * @returns {object} 编码结果
 */
function testEncode(codecSource, data) {
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
  
  try {
    vm.createContext(sandbox);
    // 直接执行 codec 代码，不包装（因为我们需要在 sandbox 中访问定义的函数）
    vm.runInContext(codecSource, sandbox);
  } catch (error) {
    throw new Error(`Codec syntax error: ${error.message}`);
  }
  
  if (!sandbox.encodeDownlink) {
    throw new Error('encodeDownlink function not found in codec');
  }
  
  try {
    const result = sandbox.encodeDownlink({ data: data, variables: {} });
    return result;
  } catch (error) {
    throw new Error(`Encode execution error: ${error.message}`);
  }
}

/**
 * 批量测试（从测试数据文件）
 * @param {string} profilePath - Profile YAML 文件路径
 * @param {string} testDataPath - 测试数据 JSON 文件路径
 * @returns {object} 测试结果
 */
function runBatchTest(profilePath, testDataPath) {
  const profile = loadYAML(profilePath);
  const codec = extractCodec(profile);
  
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  for (const testCase of testData.testCases || []) {
    results.total++;
    
    try {
      const result = testDecode(codec, testCase.fPort, testCase.input);
      results.passed++;
      results.tests.push({
        name: testCase.name,
        status: 'PASS',
        result: result
      });
    } catch (error) {
      results.failed++;
      results.tests.push({
        name: testCase.name,
        status: 'FAIL',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 命令行接口
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Codec Function Testing Tool

用法:
  node test-codec.js --file <profile.yaml> --port <fPort> --uplink <hex_data>
  node test-codec.js -f <profile.yaml> -p <fPort> -u <hex_data>
  node test-codec.js --batch <profile.yaml> <test-data.json>

选项:
  -f, --file <file>       Profile YAML 文件路径
  -p, --port <port>       LoRaWAN fPort (默认: 10)
  -u, --uplink <data>     上行数据 (十六进制格式)
  -b, --batch             批量测试模式
  -h, --help              显示帮助信息

示例:
  # 单个测试
  node test-codec.js -f profiles/Senso8/Senso8-LRS20600.yaml -p 10 -u 040164010000000f41dc
  
  # 批量测试
  node test-codec.js --batch profiles/Senso8/Senso8-LRS20600.yaml examples/minimal-profile/tests/test-data.json
    `);
    process.exit(0);
  }
  
  // 批量测试模式
  if (args.includes('--batch') || args.includes('-b')) {
    const profilePath = args[1] || args[2];
    const testDataPath = args[2] || args[3];
    
    if (!profilePath || !testDataPath) {
      console.error('❌ 批量测试需要提供 Profile 路径和测试数据路径');
      process.exit(1);
    }
    
    try {
      console.log('🧪 批量测试开始...\n');
      const results = runBatchTest(profilePath, testDataPath);
      
      console.log(`📊 测试结果:`);
      console.log(`   总计: ${results.total}`);
      console.log(`   通过: ${results.passed} ✅`);
      console.log(`   失败: ${results.failed} ❌\n`);
      
      for (const test of results.tests) {
        if (test.status === 'PASS') {
          console.log(`✅ ${test.name}`);
          console.log(JSON.stringify(test.result, null, 2));
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   错误: ${test.error}`);
        }
        console.log('');
      }
      
      process.exit(results.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(`\n❌ 批量测试失败: ${error.message}`);
      process.exit(1);
    }
    return;
  }
  
  // 单个测试模式
  let yamlFile = null;
  let fPort = '10';
  let uplinkData = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' || args[i] === '--file') {
      yamlFile = args[++i];
    } else if (args[i] === '-p' || args[i] === '--port') {
      fPort = args[++i];
    } else if (args[i] === '-u' || args[i] === '--uplink') {
      uplinkData = args[++i];
    }
  }
  
  if (!yamlFile) {
    console.error('❌ 错误: 缺少 --file 参数');
    process.exit(1);
  }
  
  if (!uplinkData) {
    console.error('❌ 错误: 缺少 --uplink 参数');
    process.exit(1);
  }
  
  try {
    console.log(`📖 读取 Profile: ${yamlFile}`);
    const profile = loadYAML(yamlFile);
    const codec = extractCodec(profile);
    
    console.log(`🧪 测试解码: fPort=${fPort}, data=${formatHex(uplinkData)}`);
    const result = testDecode(codec, fPort, uplinkData);
    
    console.log('\n✅ 解码成功:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ 解码失败:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\n堆栈跟踪:');
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
  testDecode,
  testEncode,
  runBatchTest
};

