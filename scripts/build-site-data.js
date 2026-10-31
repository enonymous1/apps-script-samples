// Builds site/samples.json from samples/*/metadata.json + Code.gs.
// Usage: node scripts/build-site-data.js [--out <path>]
// Default output is site/samples.json, relative to the repo root.
// The output is deterministic: samples are sorted by slug, keys are
// written in a fixed order, and the file ends with a newline.
//
// Why this script validates instead of just copying fields: metadata
// is the contract between the samples and the site. A typo in one
// sample's metadata (a wrong difficulty, a missing setup step, scopes
// that don't match the manifest) would otherwise ship silently as a
// broken catalogue entry. Failing here, with the sample slug in the
// message, is cheaper than debugging the deployed site.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const samplesDir = path.join(root, 'samples');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
if (outIndex >= 0 && !args[outIndex + 1]) {
  throw new Error('Usage: node scripts/build-site-data.js [--out <path>]');
}
const outPath = outIndex >= 0 ? path.resolve(args[outIndex + 1]) :
  path.join(root, 'site', 'samples.json');

const DIFFICULTIES = ['Beginner', 'Intermediate'];
const SCOPE_PATTERN = /^https:\/\/www\.googleapis\.com\/auth\/[a-z0-9._-]+$/;

/**
 * Validates one sample's metadata and manifest against the contract
 * the site and the test suite rely on.
 * @param {string} slug Directory name, which must match metadata.slug.
 * @param {object} metadata Parsed metadata.json.
 * @param {object} manifest Parsed appsscript.json.
 * @throws {Error} With the slug and the offending field.
 */
function validateSample(slug, metadata, manifest) {
  const fail = (message) => { throw new Error(`${slug}: ${message}`); };
  if (metadata.slug !== slug) fail(`metadata slug ${metadata.slug} does not match directory`);
  if (typeof metadata.title !== 'string' || !metadata.title.trim()) fail('title is required');
  if (typeof metadata.description !== 'string' || !metadata.description.trim()) fail('description is required');
  if (!Array.isArray(metadata.services) || metadata.services.length === 0) fail('services must be a non-empty array');
  if (!DIFFICULTIES.includes(metadata.difficulty)) fail(`difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  if (!Array.isArray(metadata.setup) || metadata.setup.length === 0) fail('setup must be a non-empty array');
  if (!Array.isArray(metadata.scopes) || metadata.scopes.length === 0) fail('scopes must be a non-empty array');
  for (const scope of metadata.scopes) {
    if (!SCOPE_PATTERN.test(scope)) fail(`invalid scope: ${scope}`);
  }
  if (manifest.runtimeVersion !== 'V8') fail('appsscript.json runtimeVersion must be V8');
  if (!manifest.timeZone) fail('appsscript.json timeZone is required');
  const manifestScopes = [...(manifest.oauthScopes || [])].sort();
  const metadataScopes = [...metadata.scopes].sort();
  if (JSON.stringify(manifestScopes) !== JSON.stringify(metadataScopes)) {
    fail('appsscript.json oauthScopes must match metadata scopes');
  }
}

function readJson(file, slug) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${slug}: cannot parse ${path.basename(file)}: ${error.message}`);
  }
}

// Kept importable for tests: requiring this file must not regenerate
// the site as a side effect, so generation lives in main().
function main() {
  const slugs = fs.readdirSync(samplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const samples = slugs.map((slug) => {
    const dir = path.join(samplesDir, slug);
    const metadata = readJson(path.join(dir, 'metadata.json'), slug);
    const manifest = readJson(path.join(dir, 'appsscript.json'), slug);
    validateSample(slug, metadata, manifest);
    const code = fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8');
    return {
      slug: metadata.slug,
      title: metadata.title,
      description: metadata.description,
      services: metadata.services,
      difficulty: metadata.difficulty,
      scopes: metadata.scopes,
      setup: metadata.setup,
      code,
    };
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(samples, null, 2) + '\n');
  console.log(`Wrote ${samples.length} sample(s) to ${path.relative(root, outPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = { validateSample };
