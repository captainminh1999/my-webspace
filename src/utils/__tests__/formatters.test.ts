import { test, expect } from 'bun:test';
import { parseWebsiteString } from '../formatters';
import { Github, Linkedin, Twitter, Link as LinkIcon } from 'lucide-react';

// Test GitHub URL
test('parseWebsiteString handles GitHub URLs', () => {
  const result = parseWebsiteString('https://github.com/user');
  expect(result).not.toBeNull();
  expect(result?.label).toBe('GitHub');
  expect(result?.url).toBe('https://github.com/user');
  expect(result?.siteName).toBe('GitHub');
  expect(result?.icon).toBe(Github);
});

// Test LinkedIn URL
test('parseWebsiteString handles LinkedIn URLs', () => {
  const result = parseWebsiteString('linkedin.com/in/user');
  expect(result).not.toBeNull();
  expect(result?.label).toBe('LinkedIn');
  expect(result?.url).toBe('https://linkedin.com/in/user');
  expect(result?.siteName).toBe('LinkedIn');
  expect(result?.icon).toBe(Linkedin);
});

// Test Twitter URL
test('parseWebsiteString handles Twitter URLs', () => {
  const result = parseWebsiteString('http://twitter.com/user');
  expect(result).not.toBeNull();
  expect(result?.label).toBe('Twitter/X');
  expect(result?.url).toBe('http://twitter.com/user');
  expect(result?.siteName).toBe('Twitter/X');
  expect(result?.icon).toBe(Twitter);
});

// Test plain URL
test('parseWebsiteString handles plain URLs', () => {
  const result = parseWebsiteString('example.com');
  expect(result).not.toBeNull();
  expect(result?.label).toBe('Example.com');
  expect(result?.url).toBe('https://example.com');
  expect(result?.siteName).toBeUndefined();
  expect(result?.icon).toBe(LinkIcon);
});
