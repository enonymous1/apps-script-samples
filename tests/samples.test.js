const assert = require('node:assert');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const samplesDir = path.join(root, 'samples');
const slugs = fs.readdirSync(samplesDir).filter((name) =>
  fs.statSync(path.join(samplesDir, name)).isDirectory()).sort();

// Loads a sample's Code.gs into a vm context with stubbed Apps Script
// globals. Helpers are tested by calling them; main functions are
// tested by swapping in stub services first (see the stub tests
// below). This is the gap v1.0.0 had: it syntax-checked the code and
// tested pure helpers, but never ran a main function at all.
function loadSample(slug, overrides = {}) {
  const dir = path.join(samplesDir, slug);
  const code = fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8');
  const context = {
    MimeType: {
      GOOGLE_DOCS: 'application/vnd.google-apps.document',
      GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet',
      GOOGLE_SLIDES: 'application/vnd.google-apps.presentation',
      PDF: 'application/pdf',
    },
    Utilities: { formatDate: () => '9:00 AM' },
    Session: { getScriptTimeZone: () => 'America/New_York', getActiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    Logger: { log: () => {} },
    console,
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { dir, code, context };
}

function propsService(values) {
  return { getScriptProperties: () => ({ getProperty: (key) => (key in values ? values[key] : null) }) };
}

function iterator(items) {
  let index = 0;
  return { hasNext: () => index < items.length, next: () => items[index++] };
}

function fakeThread(subject) {
  return {
    subject,
    labels: [],
    archived: false,
    getFirstMessageSubject: () => subject,
    addLabel: function (label) { this.labels.push(label); },
    moveToArchive: function () { this.archived = true; },
  };
}

test('every sample has matching metadata, manifest, README, and syntax-clean code', () => {
  assert.ok(slugs.length >= 4, 'expected at least 4 samples');
  for (const slug of slugs) {
    const dir = path.join(samplesDir, slug);
    const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
    assert.equal(metadata.slug, slug, `${slug}: metadata slug must match directory`);
    assert.ok(metadata.title && metadata.description, `${slug}: title/description required`);
    assert.ok(Array.isArray(metadata.services) && metadata.services.length > 0, `${slug}: services required`);
    assert.ok(['Beginner', 'Intermediate'].includes(metadata.difficulty), `${slug}: difficulty`);
    assert.ok(Array.isArray(metadata.setup) && metadata.setup.length > 0, `${slug}: setup required`);

    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'appsscript.json'), 'utf8'));
    assert.equal(manifest.runtimeVersion, 'V8', `${slug}: must be V8`);
    assert.ok(manifest.timeZone, `${slug}: timezone required`);
    assert.deepEqual([...manifest.oauthScopes].sort(), [...metadata.scopes].sort(),
      `${slug}: manifest scopes must match metadata scopes`);

    const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
    assert.match(readme, /Script Properties/, `${slug}: README must explain Script Properties`);

    // node --check rejects the .gs extension on current Node, so check
    // a .js copy of the exact file contents instead.
    const tmp = path.join(os.tmpdir(), `apps-script-samples-${slug}.js`);
    fs.copyFileSync(path.join(dir, 'Code.gs'), tmp);
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });

    // No hardcoded personal values: no email literals, no Drive/Sheet
    // ID-shaped strings, and no real clasp script ID in the code.
    const code = fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8');
    assert.doesNotMatch(code, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, `${slug}: no email literals`);
    assert.doesNotMatch(code, /\b1[A-Za-z0-9_-]{20,}\b/, `${slug}: no Drive/Sheet ID literals`);
  }
});

test('sheet summary helper counts rows, skips the header, and ignores non-numeric cells', () => {
  const { context } = loadSample('sheet-weekly-report');
  assert.deepEqual(
    context.summarizeRows([['Name', 'Amount'], ['a', 10], ['b', 'x'], ['c', 5]], '2'),
    { rowCount: 3, total: 15 });
  assert.deepEqual(context.summarizeRows([['Header only']], '2'), { rowCount: 0, total: null });
  assert.deepEqual(context.summarizeRows([['Name'], ['a']], null), { rowCount: 1, total: null });
});

test('sheet summary ignores blanks, nulls, booleans, and dates instead of inventing numbers', () => {
  const { context } = loadSample('sheet-weekly-report');
  // v1.0.0 summed these as 0 + 0 + 1 + a millisecond timestamp.
  const values = [['Name', 'Amount'], ['a', ''], ['b', null], ['c', true], ['d', new Date('2026-01-01')], ['e', ' 12.5 '], ['f', 7]];
  assert.deepEqual(context.summarizeRows(values, '2'), { rowCount: 6, total: 19.5 });
});

test('sheet amount column must be a positive integer, not a parseInt() guess', () => {
  const { context } = loadSample('sheet-weekly-report');
  const values = [['Name', 'Amount'], ['a', 10]];
  // An empty value means "no column configured" (total stays null);
  // every other non-positive-integer must fail loudly.
  for (const bad of ['0', 'abc', '2.5', '-1']) {
    assert.throws(() => context.summarizeRows(values, bad), /positive integer/, `column ${JSON.stringify(bad)}`);
  }
});

test('drive category helper maps MIME types, falling back to Other', () => {
  const { context } = loadSample('drive-file-organizer');
  assert.equal(context.categoryForMimeType('application/vnd.google-apps.document'), 'Documents');
  assert.equal(context.categoryForMimeType('application/pdf'), 'PDFs');
  assert.equal(context.categoryForMimeType('image/png'), 'Images');
  assert.equal(context.categoryForMimeType('application/zip'), 'Other');
  assert.equal(context.categoryForMimeType(null), 'Other');
  assert.equal(context.categoryForMimeType(undefined), 'Other');
});

test('drive subfolder lookup is cached within one run', () => {
  const { context } = loadSample('drive-file-organizer');
  let lookups = 0;
  let creates = 0;
  const folder = {
    getFoldersByName: () => { lookups++; return iterator([]); },
    createFolder: (name) => { creates++; return { name }; },
  };
  const cache = {};
  const first = context.getOrCreateSubfolder(folder, 'PDFs', cache);
  const second = context.getOrCreateSubfolder(folder, 'PDFs', cache);
  assert.equal(first, second);
  assert.equal(lookups, 1);
  assert.equal(creates, 1);
});

test('gmail triage dry-run touches no labels and validates its inputs', () => {
  const threads = [fakeThread('Hello'), fakeThread('World')];
  const calls = { labelsCreated: 0 };
  const { context } = loadSample('gmail-inbox-triage', {
    PropertiesService: propsService({ DRY_RUN: 'true' }),
    GmailApp: {
      search: () => threads,
      getUserLabelByName: () => { throw new Error('must not be called in dry-run'); },
      createLabel: () => { calls.labelsCreated++; return {}; },
    },
  });
  context.triageInbox();
  assert.equal(threads[0].labels.length, 0);
  assert.equal(threads[0].archived, false);
  assert.equal(calls.labelsCreated, 0);

  const { context: bad } = loadSample('gmail-inbox-triage', {
    PropertiesService: propsService({ TRIAGE_QUERY: '   ' }),
    GmailApp: { search: () => [] },
  });
  assert.throws(() => bad.triageInbox(), /TRIAGE_QUERY must not be empty/);
});

test('gmail triage live run labels and archives when configured', () => {
  const threads = [fakeThread('Hello')];
  const label = { name: 'To Review' };
  const { context } = loadSample('gmail-inbox-triage', {
    PropertiesService: propsService({ DRY_RUN: 'false', ARCHIVE_AFTER: 'true' }),
    GmailApp: {
      search: () => threads,
      getUserLabelByName: () => null,
      createLabel: () => label,
    },
  });
  context.triageInbox();
  assert.deepEqual(threads[0].labels, [label]);
  assert.equal(threads[0].archived, true);
});

test('calendar agenda throws for a missing calendar and sends for a found one', () => {
  const sent = [];
  const { context: missing } = loadSample('calendar-daily-agenda', {
    PropertiesService: propsService({}),
    CalendarApp: { getCalendarById: () => null },
    GmailApp: { sendEmail: () => { throw new Error('must not send on missing calendar'); } },
  });
  assert.throws(() => missing.sendDailyAgenda(), /Calendar not found: primary/);

  const event = { getTitle: () => 'Standup', isAllDayEvent: () => false, getStartTime: () => new Date() };
  const { context } = loadSample('calendar-daily-agenda', {
    PropertiesService: propsService({}),
    CalendarApp: { getCalendarById: () => ({ getEvents: () => [event] }) },
    GmailApp: { sendEmail: (to, subject, body) => sent.push({ to, subject, body }) },
  });
  context.sendDailyAgenda();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'owner@example.com');
  assert.match(sent[0].body, /Standup/);
});

test('calendar event formatter marks all-day events', () => {
  const { context } = loadSample('calendar-daily-agenda');
  const timed = { getStartTime: () => new Date(), getTitle: () => 'Standup', isAllDayEvent: () => false };
  const allDay = { getStartTime: () => new Date(), getTitle: () => 'Holiday', isAllDayEvent: () => true };
  assert.equal(context.formatEvent(timed), '9:00 AM - Standup');
  assert.equal(context.formatEvent(allDay), 'All day: Holiday');
});

test('site generator validates metadata instead of copying it blindly', () => {
  const { validateSample } = require('../scripts/build-site-data.js');
  const metadata = {
    slug: 'x', title: 'X', description: 'X', services: ['Gmail'],
    difficulty: 'Beginner', setup: ['Do it'], scopes: ['https://www.googleapis.com/auth/gmail.send'],
  };
  const manifest = { runtimeVersion: 'V8', timeZone: 'America/New_York', oauthScopes: [...metadata.scopes] };
  validateSample('x', metadata, manifest);
  assert.throws(() => validateSample('x', { ...metadata, difficulty: 'Expert' }, manifest), /difficulty/);
  assert.throws(() => validateSample('x', { ...metadata, scopes: ['gmail.send'] }, manifest), /invalid scope/);
  assert.throws(() => validateSample('x', metadata, { ...manifest, oauthScopes: [] }), /must match metadata scopes/);
  assert.throws(() => validateSample('y', metadata, manifest), /does not match directory/);
});

test('site generator rejects a missing --out value instead of crashing obscurely', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-site-data.js'), '--out'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage/);
});

test('generated site data matches the committed site/samples.json', () => {
  const tmp = path.join(os.tmpdir(), 'apps-script-samples-site.json');
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-site-data.js'), '--out', tmp], { stdio: 'pipe' });
  assert.equal(fs.readFileSync(tmp, 'utf8'), fs.readFileSync(path.join(root, 'site', 'samples.json'), 'utf8'));
});

test('site files exist and the app loads the generated data', () => {
  const index = fs.readFileSync(path.join(root, 'site', 'index.html'), 'utf8');
  assert.match(index, /samples\.json|app\.js/);
  const app = fs.readFileSync(path.join(root, 'site', 'app.js'), 'utf8');
  assert.match(app, /samples\.json/);
  const data = JSON.parse(fs.readFileSync(path.join(root, 'site', 'samples.json'), 'utf8'));
  assert.deepEqual(data.map((s) => s.slug), slugs);
  for (const sample of data) {
    assert.equal(sample.code, fs.readFileSync(path.join(samplesDir, sample.slug, 'Code.gs'), 'utf8'));
  }
});

test('corrected Gmail guide uses GmailApp names and current doc links', () => {
  const guide = fs.readFileSync(path.join(root, 'docs', 'gmail-service.md'), 'utf8');
  assert.match(guide, /GmailApp\.search/);
  assert.match(guide, /apps-script\/reference\/gmail\/gmail-app/);
  assert.doesNotMatch(guide, /developers\.google\.com\/gmail\)/);
});
