import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apodProblem, cleanExplanation, fromApodFeed } from '../apod.ts';

const LOGO = 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png';
const PICTURES = 'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/apod/apod/2026/october';

/** One day of APOD's feed in its markup (science.nasa.gov/feed/apod-basic/); `fields` replaces or adds elements. */
function item(fields: Record<string, string> = {}): string {
  const all: Record<string, string> = {
    title: 'Lunar Farside',
    link: 'https://science.nasa.gov/image-article/apod-2026-october-10-lunar-farside/',
    'apod:hdurl': `${PICTURES}/farside_lro1600.jpg?w=1600&#038;h=1600&#038;fit=clip&#038;crop=faces%2Cfocalpoint`,
    'apod:copyright': '<![CDATA[<a href="https://www.nasa.gov/">NASA</a> / <a href="https://www.gsfc.nasa.gov/">GSFC</a> / Arizona State Univ.]]>',
    'apod:alt': 'A mosaic image of the farside of the Moon.',
    'apod:explanation':
      "<![CDATA[<strong>Explanation:</strong> Tidally locked in <a href=\"https://example.com\">synchronous rotation</a>, the Moon always presents its familiar <em>nearside</em>.<br><br><strong>Tomorrow's picture: </strong>Sunday's Childe<br>]]>",
    'content:encoded': '<![CDATA[<html><body><center><p>2026 October 10<br><IMG SRC="x.jpg"></center></body></html>]]>',
    ...fields,
  };
  return `<item>${Object.entries(all).map(([name, value]) => `<${name}>${value}</${name}>`).join('')}</item>`;
}
const feed = (...items: string[]) => `<?xml version="1.0"?><rss xmlns:apod="https://science.nasa.gov/apod/"><channel>${items.join('')}</channel></rss>`;

const farside = {
  date: '2026-10-10',
  title: 'Lunar Farside',
  explanation: 'Tidally locked in synchronous rotation, the Moon always presents its familiar nearside.',
  copyright: 'NASA / GSFC / Arizona State Univ.',
  alt: 'A mosaic image of the farside of the Moon.',
  media_type: 'image',
  url: `${PICTURES}/farside_lro1600.jpg?w=1280&h=1280&fit=clip`,
  hdurl: 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/farside_lro1600.jpg',
};

test("an image day in the API's shape: the resizer's copy within 1280 px, the file as uploaded for HD, text without markup or teaser", () => {
  assert.deepEqual(fromApodFeed(feed(item())), farside);
});

test('a video day: the player from the page, the still as the thumbnail', () => {
  const day = fromApodFeed(
    feed(item({ 'content:encoded': '<![CDATA[<p>2026 October 18<br><iframe width="960" src="//www.youtube.com/embed/DzrCEm1ZBRY?rel=0"></iframe>]]>', link: 'https://science.nasa.gov/x/' })),
  );
  assert.equal(day?.date, '2026-10-18', 'the date from the page when the address carries none');
  assert.equal(day?.media_type, 'video');
  assert.equal(day?.url, 'https://www.youtube.com/embed/DzrCEm1ZBRY?rel=0');
  assert.equal(day?.thumbnail_url, `${PICTURES}/farside_lro1600.jpg?w=1280&h=1280&fit=clip`);
  assert.equal(day?.hdurl, undefined);
});

test('only the first paragraph is the explanation: no repeated label, no notices after it', () => {
  const day = fromApodFeed(
    feed(
      item({
        'apod:explanation':
          "<![CDATA[<strong>Explanation:</strong> <b>Explanation</b> : What is Treble Clef? An unusual radio source.<br><br><strong>APOD's main NASA site has <a href=\"https://example.com\">moved</a> </strong>: From apod.nasa.gov to science.nasa.gov/apod<br><strong>Tomorrow's picture: </strong>backwards rainbow]]>",
      }),
    ),
  );
  assert.equal(day?.explanation, 'What is Treble Clef? An unusual radio source.');
});

test('a day with neither picture nor player is "other"; a day without credit or alt text leaves them out', () => {
  const day = fromApodFeed(feed(item({ 'apod:hdurl': '', 'apod:copyright': '', 'apod:alt': '' })));
  assert.equal(day?.media_type, 'other');
  assert.equal(day?.url, undefined);
  assert.ok(!('copyright' in (day ?? {})) && !('alt' in (day ?? {})));
});

test('the latest day is the first; the credit loses its label; entities are decoded', () => {
  const newer = item({
    title: 'Smörgåsbord &amp; more',
    link: 'https://science.nasa.gov/image-article/apod-2026-october-9-newer/',
    'apod:copyright': '<![CDATA[<em>Image Credit:</em><strong> </strong><a href="https://www.nasa.gov/">NASA</a>, ESA &amp; J. Smith]]>',
  });
  const older = item({ title: 'Older', link: 'https://science.nasa.gov/image-article/apod-2026-september-30-older/' });
  const day = fromApodFeed(feed(newer, older));
  assert.equal(day?.date, '2026-10-09');
  assert.equal(day?.title, 'Smörgåsbord & more');
  assert.equal(day?.copyright, 'NASA, ESA & J. Smith');
});

test('a latest day whose date cannot be read is refused, not passed over for an older one', () => {
  const undated = item({ title: 'New format', link: 'https://science.nasa.gov/apod/new-format/', 'content:encoded': '' });
  const day = fromApodFeed(feed(undated, item()));
  assert.equal(day?.title, 'New format');
  assert.equal(apodProblem(day), 'no date');
});

test("APOD's stock alt text is left out, so the picture is named by its title", () => {
  for (const stock of [
    'See Explanation. Clicking on the picture will download the highest resolution version available.',
    'See Explanation. Moving the cursor over the image will bring up an annotated version.',
  ]) {
    assert.ok(!('alt' in (fromApodFeed(feed(item({ 'apod:alt': stock }))) ?? {})), stock);
  }
});

test('a day whose hdurl gives no size (w=0&h=0) still links the file as uploaded', () => {
  const day = fromApodFeed(feed(item({ 'apod:hdurl': `${PICTURES}/JupiterMoons_3105.jpg?w=0&#038;h=0&#038;fit=clip` })));
  assert.equal(day?.hdurl, 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2026/october/JupiterMoons_3105.jpg');
  assert.equal(day?.url, `${PICTURES}/JupiterMoons_3105.jpg?w=1280&h=1280&fit=clip`);
});

test('no days, or a page that is not the feed, gives nothing to store', () => {
  assert.equal(fromApodFeed(feed()), null);
  assert.equal(fromApodFeed('<!doctype html><title>APOD - NASA Science</title>'), null);
  assert.equal(apodProblem(fromApodFeed(feed(item({ link: 'https://science.nasa.gov/x/', 'content:encoded': '' })))), 'no date');
});

test('the site header the API gave from 2026-10-10 is refused, however it arrives', () => {
  assert.match(apodProblem({ ...farside, title: 'NASA Science' }) ?? '', /NASA Science/);
  assert.match(apodProblem({ ...farside, url: LOGO, hdurl: LOGO }) ?? '', /url is on science\.nasa\.gov, not assets\.science\.nasa\.gov/);
  assert.match(apodProblem({ ...farside, hdurl: LOGO }) ?? '', /hdurl is on science\.nasa\.gov/);
  assert.match(apodProblem(fromApodFeed(feed(item({ 'apod:hdurl': LOGO })))) ?? '', /url is on science\.nasa\.gov/);
});

test('a normal picture passes, with or without an HD version', () => {
  assert.equal(apodProblem(farside), null);
  const { hdurl: _ignored, ...noHd } = farside;
  void _ignored;
  assert.equal(apodProblem(noHd), null);
});

test("a video day's still is held to APOD's host, its player is not; \"other\" days pass", () => {
  const video = { ...farside, media_type: 'video', url: 'https://www.youtube.com/embed/abc', hdurl: undefined, thumbnail_url: `${PICTURES}/still.jpg` };
  assert.equal(apodProblem(video), null);
  assert.equal(apodProblem({ ...video, thumbnail_url: undefined }), null);
  assert.match(apodProblem({ ...video, thumbnail_url: LOGO }) ?? '', /thumbnail_url is on science\.nasa\.gov/);
  assert.equal(apodProblem({ date: '2026-10-08', title: 'Interactive', media_type: 'other' }), null);
});

test('missing or unusable fields are refused without naming a URL', () => {
  assert.equal(apodProblem(null), 'no date');
  assert.equal(apodProblem({ ...farside, date: '' }), 'no date');
  assert.equal(apodProblem({ ...farside, title: '  ' }), 'no title');
  assert.equal(apodProblem({ ...farside, url: 'not a url' }), 'url is on no host, not assets.science.nasa.gov');
  assert.doesNotMatch(apodProblem({ ...farside, url: `${LOGO}?token=SECRET` }) ?? '', /SECRET|https?:/);
});

test("the next day's teaser and trailing whitespace are cut from the explanation", () => {
  assert.equal(cleanExplanation("…form dark, smooth maria.Tomorrow's picture: Sunday's Childe\t\t\t"), '…form dark, smooth maria.');
  assert.equal(cleanExplanation('Plain text.  \n'), 'Plain text.');
  assert.equal(cleanExplanation(farside.explanation), farside.explanation);
});
