import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWebsiteString } from '../formatters.ts';

// Test GitHub URL
test('parseWebsiteString handles GitHub URLs', () => {
  const result = parseWebsiteString('https://github.com/user');
  assert.notEqual(result, null);
  assert.equal(result?.label, 'GitHub');
  assert.equal(result?.url, 'https://github.com/user');
  assert.equal(result?.siteName, 'GitHub');
});

// Test LinkedIn URL
test('parseWebsiteString handles LinkedIn URLs', () => {
  const result = parseWebsiteString('linkedin.com/in/user');
  assert.notEqual(result, null);
  assert.equal(result?.label, 'LinkedIn');
  assert.equal(result?.url, 'https://linkedin.com/in/user');
  assert.equal(result?.siteName, 'LinkedIn');
});

// Test Twitter URL
test('parseWebsiteString handles Twitter URLs', () => {
  const result = parseWebsiteString('http://twitter.com/user');
  assert.notEqual(result, null);
  assert.equal(result?.label, 'Twitter/X');
  assert.equal(result?.url, 'http://twitter.com/user');
  assert.equal(result?.siteName, 'Twitter/X');
});

// Test plain URL
test('parseWebsiteString handles plain URLs', () => {
  const result = parseWebsiteString('example.com');
  assert.notEqual(result, null);
  assert.equal(result?.label, 'Example.com');
  assert.equal(result?.url, 'https://example.com');
  assert.equal(result?.siteName, undefined);
});
