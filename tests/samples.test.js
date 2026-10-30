const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const samplesDir = path.join(root, 'samples');
const slugs = fs.readdirSync(samplesDir).filter((name) =>
  fs.statSync(path.join(samplesDir, name)).isDirectory()).sort();

function loadSample(slug) {
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
    Session: { getScriptTimeZone: () => 'America/New_York' },
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { dir, code, context };
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

test('drive category helper maps MIME types, falling back to Other', () => {
  const { context } = loadSample('drive-file-organizer');
  assert.equal(context.categoryForMimeType('application/vnd.google-apps.document'), 'Documents');
  assert.equal(context.categoryForMimeType('application/pdf'), 'PDFs');
  assert.equal(context.categoryForMimeType('image/png'), 'Images');
  assert.equal(context.categoryForMimeType('application/zip'), 'Other');
});

test('calendar event formatter marks all-day events', () => {
  const { context } = loadSample('calendar-daily-agenda');
  const timed = { getStartTime: () => new Date(), getTitle: () => 'Standup', isAllDayEvent: () => false };
  const allDay = { getStartTime: () => new Date(), getTitle: () => 'Holiday', isAllDayEvent: () => true };
  assert.equal(context.formatEvent(timed), '9:00 AM - Standup');
  assert.equal(context.formatEvent(allDay), 'All day: Holiday');
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
