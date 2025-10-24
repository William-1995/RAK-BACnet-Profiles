#!/usr/bin/env node

/**
 * 批量验证所有 Profile 文件
 * 用于快速检查所有 Profile 的语法和结构
 */

const fs = require('fs');
const path = require('path');
const { validateProfile } = require('./validate-profile');

// 递归查找所有 YAML 文件
function findYAMLFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过特殊目录
      if (file === 'node_modules' || file === '.git' || file === 'tests') {
        continue;
      }
      findYAMLFiles(filePath, fileList);
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  // 帮助信息
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
批量验证工具

用法:
  node scripts/validate-all.js [options] [directory]

选项:
  --json                  输出 JSON 格式
  -h, --help              显示帮助信息

参数:
  directory               要验证的目录（默认: profiles）

说明:
  默认只进行基础验证（不包含测试数据验证），快速检查所有 Profile 的语法和结构。

示例:
  # 验证 profiles 目录下所有文件
  node scripts/validate-all.js
  
  # 验证特定目录
  node scripts/validate-all.js profiles/Senso8
  
  # JSON 格式输出（用于 CI/CD）
  node scripts/validate-all.js --json
    `);
    process.exit(0);
  }
  
  // 解析参数
  const jsonOutput = args.includes('--json');
  const targetDir = args.find(arg => !arg.startsWith('--')) || 'profiles';
  
  // 检查目录是否存在
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ 错误: 目录不存在: ${targetDir}`);
    process.exit(1);
  }
  
  // 查找所有 YAML 文件
  console.log(`\n🔍 扫描目录: ${targetDir}\n`);
  const yamlFiles = findYAMLFiles(targetDir);
  
  if (yamlFiles.length === 0) {
    console.log('⚠️  未找到 YAML 文件');
    process.exit(0);
  }
  
  console.log(`📦 找到 ${yamlFiles.length} 个 Profile 文件\n`);
  console.log('='.repeat(70));
  
  // 验证选项（默认不包含测试数据验证）
  const validateOptions = {
    runTests: false
  };
  
  // 结果统计
  const results = {
    total: yamlFiles.length,
    passed: 0,
    failed: 0,
    files: []
  };
  
  // 逐个验证
  for (let i = 0; i < yamlFiles.length; i++) {
    const file = yamlFiles[i];
    const relativePath = path.relative(process.cwd(), file);
    
    if (!jsonOutput) {
      console.log(`\n[${i + 1}/${yamlFiles.length}] ${relativePath}`);
      console.log('-'.repeat(70));
    }
    
    try {
      const report = validateProfile(file, validateOptions);
      
      if (report.valid) {
        results.passed++;
        results.files.push({
          file: relativePath,
          status: 'PASS',
          report: report
        });
        
        if (!jsonOutput) {
          console.log('✅ 通过');
        }
      } else {
        results.failed++;
        results.files.push({
          file: relativePath,
          status: 'FAIL',
          report: report
        });
        
        if (!jsonOutput) {
          console.log('❌ 失败');
          // 显示错误摘要
          for (const [check, result] of Object.entries(report.checks)) {
            if (result.errors && result.errors.length > 0) {
              console.log(`  ${check}: ${result.errors.length} 个错误`);
            }
          }
        }
      }
    } catch (error) {
      results.failed++;
      results.files.push({
        file: relativePath,
        status: 'ERROR',
        error: error.message
      });
      
      if (!jsonOutput) {
        console.log(`❌ 错误: ${error.message}`);
      }
    }
  }
  
  // 输出结果
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 验证结果汇总:\n');
    console.log(`  总计: ${results.total}`);
    console.log(`  通过: ${results.passed} ✅`);
    console.log(`  失败: ${results.failed} ❌`);
    console.log(`  成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    // 显示失败的文件列表
    if (results.failed > 0) {
      console.log('\n❌ 失败的文件:');
      for (const result of results.files) {
        if (result.status !== 'PASS') {
          console.log(`  - ${result.file}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
    if (results.failed === 0) {
      console.log('\n🎉 所有 Profile 验证通过！\n');
    } else {
      console.log(`\n⚠️  ${results.failed} 个 Profile 验证失败\n`);
      console.log('提示: 运行单个文件验证查看详细错误:');
      console.log('  node scripts/validate-profile.js <file>\n');
    }
  }
  
  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { findYAMLFiles };

