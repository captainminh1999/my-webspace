import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, enDash, joinContent, parseReference, rotate, sydneyDate, wholeSentences } from '../verse.ts';
import { METHODS } from '../reflection.ts';
import { scripture } from '../scripture.ts';

test('reads the references the verse sources give', () => {
  assert.deepEqual(parseReference('Philippians 2:3-4'), { book: 'Philippians', name: 'Philippians', usfm: 'PHP', chapter: 2, verses: [3, 4] });
  assert.deepEqual(parseReference('John 3:16,18'), { book: 'John', name: 'John', usfm: 'JHN', chapter: 3, verses: [16, 18] });
  assert.deepEqual(parseReference('1 John 4:7–8'), { book: '1 John', name: '1 John', usfm: '1JN', chapter: 4, verses: [7, 8] });
  assert.deepEqual(parseReference('Psalm 34:18'), { book: 'Psalm', name: 'Psalms', usfm: 'PSA', chapter: 34, verses: [18] });
  assert.deepEqual(parseReference('Song of Songs 8:6-7'), { book: 'Song of Songs', name: 'Song of Solomon', usfm: 'SNG', chapter: 8, verses: [6, 7] });
  assert.deepEqual(parseReference('Jude 24'), { book: 'Jude', name: 'Jude', usfm: 'JUD', chapter: 1, verses: [24] });
  assert.deepEqual(parseReference('Jude 1:24-25'), { book: 'Jude', name: 'Jude', usfm: 'JUD', chapter: 1, verses: [24, 25] });
});

test('gives up on a whole chapter, a passage across chapters and an unknown book', () => {
  assert.equal(parseReference('Psalm 117'), null);
  assert.equal(parseReference('Isaiah 52:13-53:2'), null);
  assert.equal(parseReference('Hezekiah 3:16'), null);
  assert.equal(parseReference('John 3:18-16'), null);
  assert.equal(parseReference(''), null);
});

test('joins a verse whose content is strings, poetry lines and footnote marks', () => {
  assert.equal(joinContent(['Do nothing out of selfish ambition', { noteId: 3 }, 'or empty pride.']), 'Do nothing out of selfish ambition or empty pride.');
  assert.equal(joinContent([{ text: 'The LORD is near to the brokenhearted;', poem: 1 }, { lineBreak: true }, { text: 'He saves the contrite in spirit.', poem: 2 }]), 'The LORD is near to the brokenhearted; He saves the contrite in spirit.');
  assert.equal(joinContent([{ noteId: 1 }]), '');
  assert.equal(joinContent(undefined), '');
});

test("the card's day is Sydney's", () => {
  assert.equal(sydneyDate(new Date('2026-09-18T13:59:00Z')), '2026-09-18'); // 23:59 AEST
  assert.equal(sydneyDate(new Date('2026-09-18T14:00:00Z')), '2026-09-19'); // midnight AEST
  assert.equal(dayNumber('2026-09-20') - dayNumber('2026-09-19'), 1);
});

test('rotations advance daily, and a drifting one meets every partner', () => {
  const five = ['a', 'b', 'c', 'd', 'e'];
  const day = dayNumber('2026-09-19');
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => rotate(five, day + i)), [...five.slice(day % 5), ...five.slice(0, day % 5), five[day % 5]]);
  const pairs = new Set(Array.from({ length: 30 }, (_, i) => `${rotate(five, day + i)}${rotate(five, day + i, true)}`));
  assert.equal(pairs.size, 25);
});

test('sets a reference with an en dash', () => {
  assert.equal(enDash('Philippians 2:3-4'), 'Philippians 2:3–4');
  assert.equal(enDash('1 John 4:7'), '1 John 4:7');
});

test('a long passage is shortened by whole sentences only', () => {
  const text = 'First sentence here. Second one follows! A third, "quoted." And a fourth.';
  assert.deepEqual(wholeSentences(text, 200), { text, continues: false });
  assert.deepEqual(wholeSentences(text, 45), { text: 'First sentence here. Second one follows!', continues: true });
  assert.deepEqual(wholeSentences(text, 5), { text: 'First sentence here.', continues: true });
});

test('every question set keeps the house rules', () => {
  assert.ok(METHODS.length >= 3);
  for (const m of METHODS) {
    assert.equal(m.questions.length, 4, m.name);
    for (const q of m.questions) {
      assert.ok(q.length <= 110, `${m.name}: "${q}" is ${q.length} characters`);
      assert.ok(/\?$/.test(q), `${m.name}: "${q}" is not a question`);
      assert.ok(!/\byou(r)?\b/i.test(q), `${m.name}: "${q}" is not in the first person`);
    }
  }
});

test('a footnote mark leaves no gap before a closing quote, bracket or dash', () => {
  assert.equal(joinContent(['“Truly, truly, I tell you, no one can see the kingdom of God unless he is born again.', { noteId: 13 }, '”']), '“Truly, truly, I tell you, no one can see the kingdom of God unless he is born again.”');
  assert.equal(joinContent(['“I am the Alpha and the Omega,', { noteId: 2 }, '” says the Lord God']), '“I am the Alpha and the Omega,” says the Lord God');
  assert.equal(joinContent(['ruler over Israel', { noteId: 1 }, '— One whose origins are of old']), 'ruler over Israel—One whose origins are of old');
  assert.equal(joinContent(['(as it is written:', { noteId: 4 }, '“consecrated to the Lord”', { noteId: 5 }, '),']), '(as it is written: “consecrated to the Lord”),');
});

test("a publisher's headings are not Scripture, and LORD keeps its printed form", () => {
  assert.equal(scripture('<h3>Ask, Seek, Knock</h3> &#8220;Ask and it will be given to you; seek and you will find.&#8221;'), '“Ask and it will be given to you; seek and you will find.”');
  assert.equal(scripture('<h3>Psalm 14</h3><h4>For the director of music. Of David.</h4> The fool says in his heart, &#8220;There is no God.&#8221;'), 'The fool says in his heart, “There is no God.”');
  assert.equal(scripture('<h3>Praise to the <span class="small-caps">Lord</span></h3>My help comes from the <span class="small-caps" >Lord</span>, the Maker of heaven and earth.'), 'My help comes from the LORD, the Maker of heaven and earth.');
  assert.equal(scripture('The <span class="small-caps">Lord</span>&#8217;s word is flawless; says the Sovereign <span class="small-caps">Lord</span>!'), 'The LORD’s word is flawless; says the Sovereign LORD!');
  assert.equal(scripture('<sup class="versenum">22 </sup>But the fruit of the Spirit is love, <b>5:23</b> gentleness.'), 'But the fruit of the Spirit is love, gentleness.');
  assert.equal(scripture('Don&#8217;t be selfish; don&#8217;t try to impress others.'), 'Don’t be selfish; don’t try to impress others.');
});
