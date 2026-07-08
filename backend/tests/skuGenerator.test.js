// skuGenerator requires config/database at module load, which constructs a
// PrismaClient. Give it a placeholder URL so the require never throws in CI
// environments without a .env — the pure helpers under test never connect.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/test';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveCompanyCode,
  numberToAlphaSuffix,
  formatBaseSku,
  variantSkuFor,
} = require('../utils/skuGenerator');

test('deriveCompanyCode: multi-word company → initials, uppercase', () => {
  assert.equal(deriveCompanyCode('My Nice Company'), 'MNC');
});

test('deriveCompanyCode: single word → first three characters', () => {
  assert.equal(deriveCompanyCode('Textiles'), 'TEX');
});

test('numberToAlphaSuffix: bijective base-26 boundaries', () => {
  assert.equal(numberToAlphaSuffix(1), 'A');
  assert.equal(numberToAlphaSuffix(26), 'Z');
  assert.equal(numberToAlphaSuffix(27), 'AA');
  assert.equal(numberToAlphaSuffix(28), 'AB');
  assert.equal(numberToAlphaSuffix(52), 'AZ');
  assert.equal(numberToAlphaSuffix(53), 'BA');
});

test('formatBaseSku pads the serial to six digits', () => {
  assert.equal(formatBaseSku('MNC', '26', 1), 'MNC-26-000001');
  assert.equal(formatBaseSku('MNC', '26', 123456), 'MNC-26-123456');
});

test('formatBaseSku never truncates serials past the pad width', () => {
  assert.equal(formatBaseSku('MNC', '26', 1234567), 'MNC-26-1234567');
});

test('variantSkuFor appends the alpha suffix to the base SKU', () => {
  assert.equal(variantSkuFor('MNC-26-000001', 1), 'MNC-26-000001-A');
  assert.equal(variantSkuFor('MNC-26-000001', 27), 'MNC-26-000001-AA');
});
