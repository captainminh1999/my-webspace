import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elapsed, monthOf, orderSection } from '../cvOrder.ts';

test('reads the date forms the CV holds', () => {
  assert.equal(monthOf('Oct 2017'), 2017 * 12 + 9);
  assert.equal(monthOf('October 2017'), 2017 * 12 + 9);
  assert.equal(monthOf('2017'), 2017 * 12);
  assert.equal(monthOf('Mar 25'), 2025 * 12 + 2); // the export's two-digit year
  assert.equal(monthOf('Dec 15'), 2015 * 12 + 11);
  assert.equal(monthOf('Jun 98'), 1998 * 12 + 5);
  assert.equal(monthOf('Present'), Infinity);
  assert.equal(monthOf(''), null);
  assert.equal(monthOf(undefined), null);
  assert.equal(monthOf('sometime'), null);
});

test('experience: current roles first, then by end, then by start; roles inside a company too', () => {
  const role = (title: string, startDate: string, endDate: string) => ({ title, startDate, endDate, responsibilities: [], skills: [] });
  const stored = [
    { companyName: 'Oxfordcaps', roles: [role('Associate', 'Oct 2017', 'Jul 2018')] },
    { companyName: 'Selling Simplified', roles: [role('Coordinator', 'Sep 2021', 'Nov 2021'), role('Senior Coordinator', 'Dec 2021', 'Apr 2023')] },
    { companyName: 'Naritas', roles: [role('R&D', 'Aug 2020', 'Jan 2021')] },
    { companyName: 'NEXTGEN oSpace', roles: [role('Specialist, Lead Generation', 'May 2023', 'Jun 2024'), role('Specialist, CRM Automation', 'Jul 2024', 'Present')] },
    { companyName: 'Dan Phuong Highschool', roles: [role('Social Media Manager', 'Apr 2022', 'Present')] },
    { companyName: 'Foundry', roles: [role('Data Team Lead', 'Apr 2022', 'Apr 2023')] },
  ];
  const sorted = orderSection('experience', stored as never) as unknown as typeof stored;
  assert.deepEqual(sorted.map((c) => c.companyName), ['NEXTGEN oSpace', 'Dan Phuong Highschool', 'Foundry', 'Selling Simplified', 'Naritas', 'Oxfordcaps']);
  assert.deepEqual(sorted[0].roles.map((r) => r.title), ['Specialist, CRM Automation', 'Specialist, Lead Generation']);
  assert.deepEqual(sorted[3].roles.map((r) => r.title), ['Senior Coordinator', 'Coordinator']);
  assert.equal(stored[0].companyName, 'Oxfordcaps'); // the stored list is not touched
});

test('licences go by issue date, not expiry; awards and projects by their date; undated entries last', () => {
  const licences = [
    { name: 'Inbound Sales', startedOn: 'May 23', finishedOn: 'Jun 27' },
    { name: 'Social Media Marketing', startedOn: 'Mar 25', finishedOn: 'Apr 27' },
    { name: 'Undated', startedOn: '', finishedOn: '' },
    { name: 'IBM Data Science', startedOn: 'Jan 21', finishedOn: '' },
  ];
  assert.deepEqual((orderSection('licenses', licences as never) as unknown as typeof licences).map((l) => l.name), ['Social Media Marketing', 'Inbound Sales', 'IBM Data Science', 'Undated']);
  const awards = [{ title: 'A', issuedOn: 'Dec 15' }, { title: 'B', issuedOn: 'Apr 19' }, { title: 'C', issuedOn: 'Nov 17' }];
  assert.deepEqual((orderSection('honorsAwards', awards as never) as unknown as typeof awards).map((a) => a.title), ['B', 'C', 'A']);
});

test('volunteering that has not ended comes first; sections without dates and singletons pass through', () => {
  const v = [{ companyName: 'WASME', startedOn: 'Dec 2018', finishedOn: 'Dec 2018' }, { companyName: 'Red Cross', startedOn: 'Nov 2022', finishedOn: '' }];
  assert.deepEqual((orderSection('volunteering', v as never) as unknown as typeof v).map((x) => x.companyName), ['Red Cross', 'WASME']);
  const languages = [{ name: 'Vietnamese' }, { name: 'English' }];
  assert.deepEqual(orderSection('languages', languages as never), languages);
  assert.equal(orderSection('about', null), null);
});

test('a running role is counted to today, both months included', () => {
  const now = new Date('2026-09-19T10:00:00Z');
  assert.equal(elapsed('Aug 2026', now), '2 mos');
  assert.equal(elapsed('Apr 2022', now), '4 yrs 6 mos');
  assert.equal(elapsed('Oct 2025', now), '1 yr');
  assert.equal(elapsed('Sep 2026', now), '1 mo');
  assert.equal(elapsed('Present', now), null);
  assert.equal(elapsed('', now), null);
  assert.equal(elapsed('Jan 2030', now), null);
});

test('recommendations read newest first by their month/day/year date', () => {
  const recs = [
    { firstName: 'Blake', creationDate: '04/24/23, 05:28 PM' },
    { firstName: 'Jag', creationDate: '05/06/23, 07:44 AM' },
    { firstName: 'Undated', creationDate: '' },
    { firstName: 'Dave', creationDate: '07/08/26' },
  ];
  assert.deepEqual((orderSection('recommendationsReceived', recs as never) as unknown as typeof recs).map((r) => r.firstName), ['Dave', 'Jag', 'Blake', 'Undated']);
});
