// Simple test script to verify file upload functionality
const { generateSanitizedFilename } = require('./app/lib/utils.ts');

// Test various file name formats
const testCases = [
  'normal_file.csv',
  'file with spaces.csv',
  'file-with-dashes.csv',
  'file_with_underscores.csv',
  'UPPERCASE.CSV',
  'file.with.multiple.dots.csv',
  'file@#$%^&*().csv',
  'very long filename with lots of spaces and special characters !@#$%^&*()_+-=[]{}|;:,.<>?.csv',
  'файл_на_русском.csv',
  'file\\with\\backslashes.csv',
  'file/with/slashes.csv'
];

console.log('Testing file name sanitization:');
console.log('='.repeat(50));

testCases.forEach(testCase => {
  try {
    const sanitized = generateSanitizedFilename(testCase);
    console.log(`✓ "${testCase}" -> "${sanitized}"`);
  } catch (error) {
    console.log(`✗ "${testCase}" -> ERROR: ${error.message}`);
  }
});

console.log('\nTesting edge cases:');
console.log('='.repeat(50));

const edgeCases = [
  '',
  null,
  undefined,
  123,
  'file_without_extension',
  '.hidden_file',
  'file.',
  '/\\/',
  '...',
];

edgeCases.forEach(testCase => {
  try {
    const sanitized = generateSanitizedFilename(testCase);
    console.log(`✓ "${testCase}" -> "${sanitized}"`);
  } catch (error) {
    console.log(`✗ "${testCase}" -> ERROR: ${error.message}`);
  }
});