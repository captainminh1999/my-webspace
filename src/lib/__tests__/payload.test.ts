import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeStrings } from '../payload.ts';

test('named entities decode, and &nbsp; is a no-break space like &#160;', () => {
  assert.equal(decodeStrings('Tom &amp; Jerry &lt;3 &quot;hi&quot; &#39;x&#39; &apos;y&apos;'), `Tom & Jerry <3 "hi" 'x' 'y'`);
  assert.equal(decodeStrings('10&nbsp;km'), '10 km');
  assert.equal(decodeStrings('10&nbsp;km'), decodeStrings('10&#160;km'));
});

test('numeric entities decode, astral ones whole; unknown and out-of-range ones are left alone', () => {
  assert.equal(decodeStrings('I Couldn&#39;t &#x2014; &#128512;'), "I Couldn't — \u{1F600}");
  assert.equal(decodeStrings('&mdash; &#x110000; &bogus;'), '&mdash; &#x110000; &bogus;');
});

test('every string in a nested payload is decoded once; other values pass through', () => {
  const input = { a: ['x &amp;amp; y', { b: '&lt;b&gt;' }], n: 3, f: false, z: null };
  assert.deepStrictEqual(decodeStrings(input), { a: ['x &amp; y', { b: '<b>' }], n: 3, f: false, z: null });
});
