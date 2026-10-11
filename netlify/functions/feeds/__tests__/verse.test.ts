// netlify/functions/feeds/__tests__/verse.test.ts — the verse feed against saved BibleGateway, bible.helloao.org and NET Bible
// responses. The clock is the feed's first run, 19:05 UTC: 06:05 the next morning in Sydney, whose date picks the translation.
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { verse } from "../sources.ts";
import { READER } from "../lib.ts";
import { METHODS } from "../../../../src/utils/reflection.ts";
import { answer, fakeDb, fixture, fixtureJson, frozenAt, json, quiet, replaced, respond, upstream, urls, type Answer } from "./harness.ts";

const BG = (code: string) => `https://www.biblegateway.com/votd/get/?format=json&version=${code}`;
const HELLOAO_PHP_2 = "https://bible.helloao.org/api/BSB/PHP/2.json";
const NET = "https://labs.bible.org/api/?passage=votd&type=json";

// Sydney days and what the rotations give them (dayNumber % 5 over NIV, KJV, ESV, NLT, BSB; the methods drift).
const NIV_DAY = { at: "2026-10-08T19:05:00Z", date: "2026-10-09", method: METHODS[2] }; // SOAP
const BSB_DAY = { at: "2026-10-07T19:05:00Z", date: "2026-10-08", method: METHODS[0] }; // Observe · Interpret · Apply
const ESV_DAY = { at: "2026-10-10T19:05:00Z", date: "2026-10-11", method: METHODS[4] }; // Sword

const NOTICE = {
  NIV: "Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.",
  KJV: "King James Version (1611; the text of 1769). Public domain outside the United Kingdom.",
  ESV: "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. ESV Text Edition: 2025. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated in whole or in part into any other language. Used by permission. All rights reserved.",
  BSB: "Berean Standard Bible. Public domain.",
  NET: "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. http://netbible.com All rights reserved.",
};

const day = (t: TestContext, d: typeof NIV_DAY) => {
  frozenAt(t, d.at);
  return quiet(t);
};
const questions = (d: typeof NIV_DAY) => ({ questions: [...d.method.questions], method: d.method.name, methodNote: d.method.note });
const viaBibleGateway = { source: "BibleGateway.com", sourceUrl: "https://www.biblegateway.com" };
const passage = (search: string, code: string) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${code}`;

const KJV_PHP_2_3_4 =
  "Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves. Look not every man on his own things, but every man also on the things of others.";
const BSB_PHP_2 = {
  3: "Do nothing out of selfish ambition or empty pride, but in humility consider others more important than yourselves.",
  4: "Each of you should look not only to your own interests, but also to the interests of others.",
  5: "Let this mind be in you which was also in Christ Jesus:",
};
const NET_PHP_2 = {
  3: "Instead of being motivated by selfish ambition or vanity, each of you should, in humility, be moved to treat one another as more important than yourself.",
  4: "Each of you should be concerned not only about your own interests, but about the interests of others as well.",
};

test("a BibleGateway day: the verse as plain text — small-caps LORD kept, entities decoded — with links built from the reference", async (t) => {
  day(t, NIV_DAY);
  const sent = upstream(t, { [BG("NIV")]: "biblegateway-votd-niv.json" });
  const fake = fakeDb();

  const note = await verse(fake.db);

  assert.equal(note, "Jeremiah 29:11 · NIV · via BibleGateway.com · SOAP");
  assert.deepEqual(urls(sent), [BG("NIV")]);
  assert.equal(sent[0].headers["user-agent"], READER["User-Agent"]);
  assert.deepEqual(fake.calls, [
    replaced("verse", {
      date: "2026-10-09",
      reference: "Jeremiah 29:11",
      book: "Jeremiah",
      chapter: 29,
      text: "“For I know the plans I have for you,” declares the LORD, “plans to prosper you and not to harm you, plans to give you hope and a future.”",
      translation: "NIV",
      translationName: "New International Version",
      notice: NOTICE.NIV,
      publicDomain: false,
      passageUrl: "https://www.biblegateway.com/passage/?search=Jeremiah%2029%3A11&version=NIV",
      chapterUrl: "https://www.biblegateway.com/passage/?search=Jeremiah%2029&version=NIV",
      ...questions(NIV_DAY),
      ...viaBibleGateway,
    }),
  ]);
});

test("a BSB day: BibleGateway picks the verse (asked in the public-domain KJV), the Berean text comes verse by verse from helloao", async (t) => {
  day(t, BSB_DAY);
  const sent = upstream(t, { [BG("KJV")]: "biblegateway-votd-kjv.json", [HELLOAO_PHP_2]: "helloao-bsb-php-2.json" });
  const fake = fakeDb();

  const note = await verse(fake.db);

  assert.equal(note, "Philippians 2:3-4 · BSB · via BibleGateway.com · Observe · Interpret · Apply");
  assert.deepEqual(urls(sent), [BG("KJV"), HELLOAO_PHP_2]);
  assert.deepEqual(fake.calls, [
    replaced("verse", {
      date: "2026-10-08",
      reference: "Philippians 2:3-4",
      book: "Philippians",
      chapter: 2,
      // The footnote mark inside verse 3 leaves nothing behind.
      text: `${BSB_PHP_2[3]} ${BSB_PHP_2[4]}`,
      verses: [
        { number: 3, text: BSB_PHP_2[3] },
        { number: 4, text: BSB_PHP_2[4] },
      ],
      translation: "BSB",
      translationName: "Berean Standard Bible",
      notice: NOTICE.BSB,
      publicDomain: true,
      // BibleGateway has no BSB; Bible Hub does.
      passageUrl: "https://biblehub.com/bsb/philippians/2.htm",
      chapterUrl: "https://biblehub.com/bsb/philippians/2.htm",
      ...questions(BSB_DAY),
      ...viaBibleGateway,
    }),
  ]);
});

test("a BSB day whose resolver is down or has changed shape stays in the King James, marked as not the one wanted", async (t) => {
  day(t, BSB_DAY);
  let helloao: Answer = 503;
  upstream(t, { [BG("KJV")]: "biblegateway-votd-kjv.json", [HELLOAO_PHP_2]: () => answer(helloao) });
  const changed = fixtureJson("helloao-bsb-php-2.json");
  changed.chapter = { number: 2, verses: changed.chapter.content };

  for (helloao of [503, () => json(changed)]) {
    const fake = fakeDb();
    const note = await verse(fake.db);
    assert.equal(note, "Philippians 2:3-4 · KJV (wanted BSB) · via BibleGateway.com · Observe · Interpret · Apply");
    // Before settling for a stand-in it checks whether an earlier run this morning already stored the wanted one.
    assert.deepEqual(fake.calls, [
      { coll: "singletons", op: "findOne", args: [{ _id: "verse" }] },
      replaced("verse", {
        date: "2026-10-08",
        reference: "Philippians 2:3-4",
        book: "Philippians",
        chapter: 2,
        text: KJV_PHP_2_3_4,
        translation: "KJV",
        translationName: "King James Version",
        notice: NOTICE.KJV,
        publicDomain: true,
        passageUrl: passage("Philippians 2:3-4", "KJV"),
        chapterUrl: passage("Philippians 2", "KJV"),
        ...questions(BSB_DAY),
        ...viaBibleGateway,
      }),
    ]);
  }
});

test('"Romans 8:35,37" from BibleGateway, which sends verse 35 only, is cited as Romans 8:35', async (t) => {
  day(t, ESV_DAY);
  upstream(t, { [BG("ESV")]: "biblegateway-votd-esv.json" });
  const fake = fakeDb();

  assert.equal(await verse(fake.db), "Romans 8:35 · ESV · via BibleGateway.com · Sword");
  assert.deepEqual(fake.calls, [
    replaced("verse", {
      date: "2026-10-11",
      reference: "Romans 8:35",
      book: "Romans",
      chapter: 8,
      text: "Who shall separate us from the love of Christ? Shall tribulation, or distress, or persecution, or famine, or nakedness, or danger, or sword?",
      translation: "ESV",
      translationName: "English Standard Version",
      notice: NOTICE.ESV,
      publicDomain: false,
      passageUrl: passage("Romans 8:35", "ESV"),
      chapterUrl: passage("Romans 8", "ESV"),
      ...questions(ESV_DAY),
      ...viaBibleGateway,
    }),
  ]);
});

test("a reference with a comma keeps both parts when the verses are read one by one", async (t) => {
  day(t, BSB_DAY);
  const kjv = fixtureJson("biblegateway-votd-kjv.json");
  kjv.votd.reference = kjv.votd.display_ref = "Philippians 2:3,5";
  upstream(t, { [BG("KJV")]: () => json(kjv), [HELLOAO_PHP_2]: "helloao-bsb-php-2.json" });
  const fake = fakeDb();

  await verse(fake.db);

  const doc = fake.calls[0].args[1] as Record<string, unknown>;
  assert.equal(doc.reference, "Philippians 2:3,5");
  assert.deepEqual(doc.verses, [
    { number: 3, text: BSB_PHP_2[3] },
    { number: 5, text: BSB_PHP_2[5] },
  ]);
  assert.equal(doc.translation, "BSB");
});

test("when BibleGateway is down, sends an error with a 200, or sends a page, the NET Bible's verse of the day stands in", async (t) => {
  const { warn } = day(t, NIV_DAY);
  let bibleGateway: Answer = 503;
  const sent = upstream(t, { [BG("NIV")]: () => answer(bibleGateway), [NET]: "netbible-votd.json" });
  const answers: Answer[] = [
    503,
    () => json({ error: "Version not available" }),
    () => json({ votd: { ...fixtureJson("biblegateway-votd-niv.json").votd, content: "" } }),
    () => respond(fixture("firewall-challenge.html"), 200),
  ];

  for (bibleGateway of answers) {
    sent.length = 0;
    const fake = fakeDb();
    const note = await verse(fake.db);
    assert.equal(note, "Philippians 2:3-4 · NET (wanted NIV) · via NET Bible · SOAP");
    assert.deepEqual(urls(sent), [BG("NIV"), NET]);
    assert.deepEqual(fake.calls, [
      { coll: "singletons", op: "findOne", args: [{ _id: "verse" }] },
      replaced("verse", {
        date: "2026-10-09",
        reference: "Philippians 2:3-4",
        book: "Philippians",
        chapter: 2,
        text: `${NET_PHP_2[3]} ${NET_PHP_2[4]}`,
        verses: [
          { number: 3, text: NET_PHP_2[3] },
          { number: 4, text: NET_PHP_2[4] },
        ],
        translation: "NET",
        translationName: "New English Translation",
        notice: NOTICE.NET,
        publicDomain: false,
        passageUrl: passage("Philippians 2:3-4", "NET"),
        chapterUrl: passage("Philippians 2", "NET"),
        ...questions(NIV_DAY),
        source: "NET Bible",
        sourceUrl: "https://netbible.org",
      }),
    ]);
  }
  assert.equal(warn.mock.callCount(), answers.length);
});

test("the second run of the morning never swaps this morning's wanted verse for a stand-in", async (t) => {
  day(t, NIV_DAY);
  upstream(t, { [BG("NIV")]: 503, [NET]: "netbible-votd.json" });
  const morning = { _id: "verse", date: "2026-10-09", reference: "Jeremiah 29:11", translation: "NIV" };

  const kept = fakeDb({ stored: { singletons: [morning] } });
  assert.equal(await verse(kept.db), "kept this morning's Jeremiah 29:11 · NIV (this run got NET via NET Bible)");
  assert.deepEqual(kept.ops(), ["singletons.findOne"]);

  // Yesterday's verse, this morning's stand-in, or a store that cannot be read: the stand-in is written.
  for (const fake of [
    fakeDb({ stored: { singletons: [{ ...morning, date: "2026-10-08" }] } }),
    fakeDb({ stored: { singletons: [{ ...morning, translation: "NET" }] } }),
    fakeDb({ findOne: () => Promise.reject(new Error("not primary")) }),
  ]) {
    await verse(fake.db);
    assert.deepEqual(fake.ops(), ["singletons.findOne", "singletons.replaceOne"]);
    assert.equal((fake.calls[1].args[1] as Record<string, unknown>).translation, "NET");
  }
});

test("with both sources down, or the NET Bible in a new shape, nothing is written", async (t) => {
  day(t, NIV_DAY);
  let net: Answer = 503;
  upstream(t, { [BG("NIV")]: 502, [NET]: () => answer(net) });

  let fake = fakeDb();
  await assert.rejects(verse(fake.db), /^Error: 503 Service Unavailable from labs\.bible\.org$/);
  assert.deepEqual(fake.calls, []);

  for (const payload of [[], { bookname: "Philippians", chapter: "2", verse: "3", text: "Instead of being motivated…" }, [{ book: "Philippians", chapter: 2, verse: 3, content: "Instead of being motivated…" }]]) {
    net = () => json(payload);
    fake = fakeDb();
    await assert.rejects(verse(fake.db), /^Error: unexpected NET Bible payload$/);
    assert.deepEqual(fake.calls, []);
  }
});

test("scripture that looks cut, empty, still encoded or too long keeps yesterday's verse", async (t) => {
  day(t, NIV_DAY);
  const votd = fixtureJson("biblegateway-votd-niv.json").votd;
  let content = "";
  upstream(t, { [BG("NIV")]: () => json({ votd: { ...votd, content } }) });

  for (content of [
    "&amp;ldquo;For I know the plans I have for you,&amp;rdquo; declares the LORD", // encoded twice: one entity survives
    "For I", // cut
    "For I know the plans I have for you, <a href", // markup that is not a tag
    "For I know the plans I have for you. ".repeat(42), // past 1500 characters
  ]) {
    const fake = fakeDb();
    await assert.rejects(verse(fake.db), /^Error: unexpected verse payload$/, content.slice(0, 40));
    assert.deepEqual(fake.calls, []);
  }
});
