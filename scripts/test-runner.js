#!/usr/bin/env node

/**
 * Test runner script for zustand-crud-registry
 * 
 * This script runs all tests and provides a summary
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running Zustand CRUD Registry Tests');
console.log('=====================================\n');

// Run Jest with coverage
const jestProcess = spawn('npx', ['jest', '--coverage', '--verbose'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

jestProcess.on('close', (code) => {
  console.log('\n=====================================');
  
  if (code === 0) {
    console.log('✅ All tests passed!');
    console.log('📊 Coverage report generated in ./coverage/');
  } else {
    console.log('❌ Some tests failed');
    console.log('Please check the output above for details');
  }
  
  process.exit(code);
});

jestProcess.on('error', (error) => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});
