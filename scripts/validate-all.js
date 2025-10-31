#!/usr/bin/env node

/**
 * Batch validate all Profile files
 * For quickly checking syntax and structure of all Profiles
 */

const fs = require('fs');
const path = require('path');
const { validateProfile } = require('./validate-profile');

// Recursively find all YAML files
function findYAMLFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip special directories
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
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  // Help information
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Batch Validation Tool

Usage:
  node scripts/validate-all.js [options] [directory]

Options:
  --json                  Output JSON format
  -h, --help              Show help information

Arguments:
  directory               Directory to validate (default: profiles)

Description:
  By default, only performs basic validation (excludes test data validation),
  quickly checking syntax and structure of all Profiles.

Examples:
  # Validate all files in profiles directory
  node scripts/validate-all.js
  
  # Validate specific directory
  node scripts/validate-all.js profiles/Senso8
  
  # JSON format output (for CI/CD)
  node scripts/validate-all.js --json
    `);
    process.exit(0);
  }
  
  // Parse arguments
  const jsonOutput = args.includes('--json');
  const targetDir = args.find(arg => !arg.startsWith('--')) || 'profiles';
  
  // Check if directory exists
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory does not exist: ${targetDir}`);
    process.exit(1);
  }
  
  // Find all YAML files
  console.log(`\n🔍 Scanning directory: ${targetDir}\n`);
  const yamlFiles = findYAMLFiles(targetDir);
  
  if (yamlFiles.length === 0) {
    console.log('⚠️  No YAML files found');
    process.exit(0);
  }
  
  console.log(`📦 Found ${yamlFiles.length} Profile files\n`);
  console.log('='.repeat(70));
  
  // Validation options (default excludes test data validation)
  const validateOptions = {
    runTests: false
  };
  
  // Result statistics
  const results = {
    total: yamlFiles.length,
    passed: 0,
    failed: 0,
    files: []
  };
  
  // Validate one by one
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
          console.log('✅ Pass');
        }
      } else {
        results.failed++;
        results.files.push({
          file: relativePath,
          status: 'FAIL',
          report: report
        });
        
        if (!jsonOutput) {
          console.log('❌ Fail');
          // Show error summary
          for (const [check, result] of Object.entries(report.checks)) {
            if (result.errors && result.errors.length > 0) {
              console.log(`  ${check}: ${result.errors.length} errors`);
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
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Validation Summary:\n');
    console.log(`  Total: ${results.total}`);
    console.log(`  Passed: ${results.passed} ✅`);
    console.log(`  Failed: ${results.failed} ❌`);
    console.log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    // Show list of failed files
    if (results.failed > 0) {
      console.log('\n❌ Failed files:');
      for (const result of results.files) {
        if (result.status !== 'PASS') {
          console.log(`  - ${result.file}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
    if (results.failed === 0) {
      console.log('\n🎉 All Profile validations passed!\n');
    } else {
      console.log(`\n⚠️  ${results.failed} Profile validations failed\n`);
      console.log('Tip: Run single file validation to see detailed errors:');
      console.log('  node scripts/validate-profile.js <file>\n');
    }
  }
  
  // Return exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
if (require.main === module) {
  main();
}

module.exports = { findYAMLFiles };

