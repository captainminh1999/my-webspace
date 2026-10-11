import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apodProblem, cleanExplanation } from '../apod.ts';

const LOGO = 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png';

// What api.nasa.gov answered for 2026-10-10 (explanation shortened).
const broken = {
  date: '2026-10-10',
  title: 'NASA Science',
  media_type: 'image',
  url: LOGO,
  hdurl: LOGO,
  explanation: "…form dark, smooth maria.Tomorrow's picture: Sunday's Childe\t\t\t\t\t\t",
  service_version: 'v1',
};

const good = {
  date: '2026-10-09',
  title: 'The Lunar Farside',
  media_type: 'image',
  url: 'https://apod.nasa.gov/apod/image/2610/MoonFarside_LRO_1024.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/2610/MoonFarside_LRO_3000.jpg',
  explanation: 'Tidally locked in synchronous rotation, the Moon always presents its familiar nearside.',
};

test('the 2026-10-10 answer (site header instead of the picture) is refused', () => {
  assert.match(apodProblem(broken) ?? '', /NASA Science/);
  assert.match(apodProblem({ ...broken, title: 'Lunar Farside' }) ?? '', /url is on science\.nasa\.gov, not apod\.nasa\.gov/);
  assert.match(apodProblem({ ...good, hdurl: LOGO }) ?? '', /hdurl is on science\.nasa\.gov/);
});

test('a normal picture passes, with or without an HD version', () => {
  assert.equal(apodProblem(good), null);
  const { hdurl: _ignored, ...noHd } = good;
  void _ignored;
  assert.equal(apodProblem(noHd), null);
});

test('video and "other" days are not held to apod.nasa.gov', () => {
  assert.equal(apodProblem({ ...good, media_type: 'video', url: 'https://www.youtube.com/embed/abc', hdurl: undefined, thumbnail_url: 'https://img.youtube.com/vi/abc/0.jpg' }), null);
  assert.equal(apodProblem({ date: '2026-10-08', title: 'Interactive', media_type: 'other' }), null);
});

test('missing or unusable fields are refused without naming a URL', () => {
  assert.equal(apodProblem(null), 'no date');
  assert.equal(apodProblem({ ...good, date: '' }), 'no date');
  assert.equal(apodProblem({ ...good, title: '  ' }), 'no title');
  assert.equal(apodProblem({ ...good, url: 'not a url' }), 'url is on no host, not apod.nasa.gov');
  assert.doesNotMatch(apodProblem({ ...good, url: `${LOGO}?api_key=SECRET` }) ?? '', /SECRET|https?:/);
});

test("the next day's teaser and trailing whitespace are cut from the explanation", () => {
  assert.equal(cleanExplanation(broken.explanation), '…form dark, smooth maria.');
  assert.equal(cleanExplanation('Plain text.  \n'), 'Plain text.');
  assert.equal(cleanExplanation(good.explanation), good.explanation);
});
