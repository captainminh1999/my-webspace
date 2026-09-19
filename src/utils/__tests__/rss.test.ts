import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, headline, parseFeed, shareImage } from '../rss.ts';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>A coffee paper</title>
  <link>https://example.com</link>
  <item>
    <title><![CDATA[Opening a coffee shop in 2026: What&#8217;s <em>actually</em> changed?]]></title>
    <link>https://example.com/opening-a-coffee-shop/?utm_source=rss&amp;utm_medium=feed</link>
    <pubDate>Tue, 15 Sep 2026 05:45:00 +0000</pubDate>
    <category><![CDATA[Café Management]]></category>
    <category>barista</category>
    <media:content url="https://secure.gravatar.com/avatar/abc?s=96" medium="image" />
    <content:encoded><![CDATA[<figure><img width="1" height="1" src="https://example.com/pixel.gif"><img src="https://example.com/uploads/shop.webp" alt=""></figure><p>Text</p>]]></content:encoded>
  </item>
  <item>
    <title>Escaped body &amp; an enclosure</title>
    <link>https://example.com/escaped</link>
    <pubDate>not a date</pubDate>
    <description>&lt;div&gt;&lt;img src=&quot;https://example.com/uploads/body.jpg&quot; /&gt;&lt;/div&gt;</description>
    <enclosure url="https://example.com/episode.mp3" type="audio/mpeg" length="1" />
  </item>
  <item>
    <title>No link, so it is skipped</title>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <title type="html">A new grinder</title>
    <link rel="self" href="https://example.org/feed/1"/>
    <link rel="alternate" type="text/html" href="https://example.org/a-new-grinder"/>
    <published>2026-09-18T14:00:08Z</published>
    <updated>2026-09-19T01:00:00Z</updated>
    <media:group><media:thumbnail url="https://example.org/thumb.jpg" width="480" height="360"/></media:group>
  </entry>
</feed>`;

test('reads an RSS item: CDATA title without markup, decoded link, date, categories', () => {
  const [first] = parseFeed(RSS);
  assert.equal(first.title, 'Opening a coffee shop in 2026: What’s actually changed?');
  assert.equal(first.url, 'https://example.com/opening-a-coffee-shop/');
  assert.equal(first.publishedAt, '2026-09-15T05:45:00.000Z');
  assert.deepEqual(first.categories, ['Café Management', 'barista']);
});

test('takes the first real picture: not the author avatar, not a 1px tracker', () => {
  assert.equal(parseFeed(RSS)[0].image, 'https://example.com/uploads/shop.webp');
});

test('prefers a small srcset candidate for the thumbnail and never a TIFF', () => {
  const item = (img: string) => `<rss><channel><item><title>T</title><link>https://example.com/t</link><description><![CDATA[${img}]]></description></item></channel></rss>`;
  const srcset = '<img src="https://example.com/a-620x465.jpg" srcset="https://example.com/a-620x465.jpg 620w, https://example.com/a-300x225.jpg 300w, https://example.com/a-150x113.jpg 150w, https://example.com/a-80x60.jpg 80w">';
  assert.equal(parseFeed(item(srcset))[0].image, 'https://example.com/a-150x113.jpg');
  assert.equal(parseFeed(item('<img src="https://example.com/scan.tiff"><img src="https://example.com/b.avif">'))[0].image, 'https://example.com/b.avif');
});

test('leaves out a date more than a day ahead', () => {
  const xml = '<rss><channel><item><title>T</title><link>https://example.com/t</link><pubDate>Fri, 01 Jan 2100 00:00:00 +0000</pubDate></item></channel></rss>';
  assert.equal(parseFeed(xml)[0].publishedAt, '');
});

test('finds a picture in an escaped description, ignores an audio enclosure and an unreadable date', () => {
  const second = parseFeed(RSS)[1];
  assert.equal(second.title, 'Escaped body & an enclosure');
  assert.equal(second.image, 'https://example.com/uploads/body.jpg');
  assert.equal(second.publishedAt, '');
});

test('skips items without a link', () => {
  assert.equal(parseFeed(RSS).length, 2);
});

test('reads an Atom entry: alternate link, published before updated, media:thumbnail', () => {
  assert.deepEqual(parseFeed(ATOM), [
    { title: 'A new grinder', url: 'https://example.org/a-new-grinder', image: 'https://example.org/thumb.jpg', publishedAt: '2026-09-18T14:00:08.000Z', categories: [] },
  ]);
});

test('returns nothing for a page that is not a feed', () => {
  assert.deepEqual(parseFeed('<!doctype html><html><body>Just a moment...</body></html>'), []);
});

test('reads the share picture of a page', () => {
  const html = `<head><meta name="viewport" content="width=device-width"><meta content="https://example.com/og.jpg?w=1200&amp;h=630" property="og:image"><meta name="twitter:image" content="https://example.com/tw.jpg"></head>`;
  assert.equal(shareImage(html), 'https://example.com/og.jpg?w=1200&h=630');
  assert.equal(shareImage('<head><title>None</title></head>'), '');
});

test('a headline keeps literal angle brackets and loses only markup', () => {
  assert.equal(headline('I <3 Coffee: Why Latte > Mocha'), 'I <3 Coffee: Why Latte > Mocha');
  assert.equal(headline("Pressure < 9 bar, <em class='x'>flow</em> > 2 ml/s<br/>"), 'Pressure < 9 bar, flow > 2 ml/s');
  const xml = '<rss><channel><item><title>I &lt;3 Coffee: Why Latte &gt; Mocha</title><link>https://example.com/t</link></item></channel></rss>';
  assert.equal(parseFeed(xml)[0].title, 'I <3 Coffee: Why Latte > Mocha');
});

test('a long run of "<" is stripped in linear time', () => {
  const started = Date.now();
  headline('<'.repeat(300_000));
  assert.ok(Date.now() - started < 1000);
});

test('only http(s) links survive', () => {
  assert.equal(cleanUrl('javascript:alert(1)'), '');
  assert.equal(cleanUrl('data:text/html,hi'), '');
  assert.equal(cleanUrl('/relative'), '');
  assert.equal(cleanUrl(' https://example.com/a?utm_campaign=x&id=7 '), 'https://example.com/a?id=7');
});
