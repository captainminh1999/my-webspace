import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromWordPress, selectReading, type Article } from '../papers.ts';

const NOW = Date.parse('2026-09-19T03:00:00Z');
const at = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();
const a = (source: string, title: string, daysAgo: number, url = `https://${source.toLowerCase().replace(/\W/g, '')}.example/${encodeURIComponent(title)}`): Article =>
  ({ source, title, url, image: '', publishedAt: at(daysAgo) });

test('reads WordPress posts: decoded title, square thumbnail by name, date_gmt as UTC, campaign tags off the link', () => {
  const posts = [
    {
      title: { rendered: 'Opening a coffee shop in 2026: What&#8217;s <em>actually</em> changed?' },
      link: 'https://pdg.example/opening/?utm_source=rss&utm_medium=feed',
      date_gmt: '2026-09-15T05:45:00',
      _embedded: { 'wp:featuredmedia': [{ media_details: { sizes: { thumbnail: { source_url: 'https://pdg.example/t-150x52.webp' }, thumblist: { source_url: 'https://pdg.example/t-300x300.webp' } } } }] },
    },
    { title: { rendered: 'No picture allowed' }, link: 'https://pdg.example/no-picture/', date_gmt: '2026-09-14T05:00:00', _embedded: { 'wp:featuredmedia': [{ code: 'rest_forbidden' }] } },
    { title: { rendered: '' }, link: 'https://pdg.example/untitled/' },
  ];
  assert.deepEqual(fromWordPress(posts, 'Perfect Daily Grind', 'thumblist'), [
    { source: 'Perfect Daily Grind', title: 'Opening a coffee shop in 2026: What’s actually changed?', url: 'https://pdg.example/opening/', image: 'https://pdg.example/t-300x300.webp', publishedAt: '2026-09-15T05:45:00.000Z' },
    { source: 'Perfect Daily Grind', title: 'No picture allowed', url: 'https://pdg.example/no-picture/', image: '', publishedAt: '2026-09-14T05:00:00.000Z' },
  ]);
  assert.deepEqual(fromWordPress({ code: 'rest_no_route' }, 'Sprudge'), []);
});

test('one item per paper first, then a second round up to the cap', () => {
  const pool = [a('Sprudge', 'One', 0.1), a('Sprudge', 'Two', 0.2), a('Sprudge', 'Three', 0.3), a('Fresh Cup', 'Four', 1), a('BeanScene', 'Coffee five', 2), a('BeanScene', 'Coffee six', 3)];
  const picked = selectReading(pool, { count: 8, days: 14, caps: { BeanScene: 1 }, now: NOW });
  assert.deepEqual(picked.map((p) => p.title), ['One', 'Four', 'Coffee five', 'Two']);
});

test('drops housekeeping posts, old and undated items, and a story told twice', () => {
  const pool = [
    a('Sprudge', 'Build-Outs Of Coffee: Hijau Coffee In San Jose, CA', 0.1),
    a('Perfect Daily Grind', 'Coffee News Recap, 18 Sep: a very long title', 0.2),
    a('Barista Magazine', 'The Insider: Headlines from the Coffee Industry', 0.3),
    a('Fresh Cup', 'A Growing Taste for Zambian Coffee', 20),
    { ...a('Fresh Cup', 'No date on this one', 0), publishedAt: '' },
    a('Daily Coffee News', 'Hijau Coffee Opens Its First Cafe In San Jose', 1),
    a('Sprudge', 'Hijau Coffee opens its first cafe in San Jose, California', 2),
    a('Sprudge', 'A quiet grinder', 3),
  ];
  assert.deepEqual(selectReading(pool, { count: 8, days: 14, now: NOW }).map((p) => p.title), ['Hijau Coffee Opens Its First Cafe In San Jose', 'A quiet grinder']);
});

test("a paper's own keep and drop rules apply to that paper only", () => {
  const only = { BeanScene: { keep: /coffee|barista/i, drop: /\bkfc\b/i } };
  const pool = [a('BeanScene', 'KFC brings breakfast coffee to two states', 0.1), a('BeanScene', 'Soul Origin outlines aggressive expansion plan', 0.2), a('BeanScene', 'UNSW delegation explores robot coffee potential', 0.3), a('Sprudge', 'KFC has a new fried chicken latte', 0.4)];
  assert.deepEqual(selectReading(pool, { count: 8, days: 14, only, now: NOW }).map((p) => p.title), ['UNSW delegation explores robot coffee potential', 'KFC has a new fried chicken latte']);
});

test('a series within one paper is not a repeat, and titles without ASCII words never collide', () => {
  const pool = [
    a('Barista Magazine', 'Highlights from World of Coffee Brussels 2026: Part Two', 1),
    a('Barista Magazine', 'Highlights from World of Coffee Brussels 2026: Part One', 2),
    a('Sprudge', 'Highlights from World of Coffee Brussels 2026, reported again', 3),
    a('Sprudge', 'コーヒーの未来', 4),
    a('Fresh Cup', '咖啡的未来', 5),
  ];
  assert.deepEqual(selectReading(pool, { count: 8, days: 14, caps: { 'Barista Magazine': 2 }, now: NOW }).map((p) => p.title).sort(), [
    'Highlights from World of Coffee Brussels 2026: Part One',
    'Highlights from World of Coffee Brussels 2026: Part Two',
    'コーヒーの未来',
    '咖啡的未来',
  ].sort());
});
