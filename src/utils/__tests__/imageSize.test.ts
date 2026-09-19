import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeFromBytes } from '../imageSize.ts';

const u16 = (n: number) => [n >> 8, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** A JPEG segment: marker, big-endian length (payload + 2), payload. */
const segment = (marker: number, payload: number[]) => [0xff, marker, ...u16(payload.length + 2), ...payload];
const frame = (marker: number, width: number, height: number) => segment(marker, [8, ...u16(height), ...u16(width), 3, 0, 0, 0]);

test('reads a PNG header', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...u32(13), 0x49, 0x48, 0x44, 0x52, ...u32(2048), ...u32(1365)]);
  assert.deepEqual(sizeFromBytes(png), { width: 2048, height: 1365 });
});

test('reads a GIF header', () => {
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02]);
  assert.deepEqual(sizeFromBytes(gif), { width: 800, height: 600 });
});

test('reads a baseline JPEG past its APP0 segment', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, ...segment(0xe0, new Array(14).fill(0)), ...frame(0xc0, 1024, 855)]);
  assert.deepEqual(sizeFromBytes(jpeg), { width: 1024, height: 855 });
});

test('reads a progressive JPEG and ignores a thumbnail inside the EXIF block', () => {
  const thumbnail = [0xff, 0xd8, ...frame(0xc0, 160, 120), 0xff, 0xd9];
  const jpeg = new Uint8Array([0xff, 0xd8, ...segment(0xe1, thumbnail), 0xff, ...segment(0xc4, [0, 0, 0]), ...frame(0xc2, 4000, 6000)]);
  assert.deepEqual(sizeFromBytes(jpeg), { width: 4000, height: 6000 });
});

test('gives up on a truncated JPEG, an unknown format and an empty buffer', () => {
  assert.equal(sizeFromBytes(new Uint8Array([0xff, 0xd8, ...segment(0xe1, new Array(64).fill(0))])), null);
  assert.equal(sizeFromBytes(new TextEncoder().encode('<!doctype html><html><body>Not found</body></html>')), null);
  assert.equal(sizeFromBytes(new Uint8Array(0)), null);
});
