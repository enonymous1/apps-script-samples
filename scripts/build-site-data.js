// Builds site/samples.json from samples/*/metadata.json + Code.gs.
// Usage: node scripts/build-site-data.js [--out <path>]
// Default output is site/samples.json, relative to the repo root.
// The output is deterministic: samples are sorted by slug, keys are
// written in a fixed order, and the file ends with a newline.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const samplesDir = path.join(root, 'samples');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? path.resolve(args[outIndex + 1]) :
  path.join(root, 'site', 'samples.json');

const slugs = fs.readdirSync(samplesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const samples = slugs.map((slug) => {
  const dir = path.join(samplesDir, slug);
  const metadata = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
  if (metadata.slug !== slug) {
    throw new Error(`metadata slug ${metadata.slug} does not match directory ${slug}`);
  }
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
