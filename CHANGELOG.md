# Changelog

All notable changes to this project are documented here. The format
is based on Keep a Changelog, and the project follows Semantic
Versioning for the repository as a whole (individual samples do not
have separate versions).

## [1.1.0] - 2026-10-31

### Fixed

- Sheet Weekly Report: `Number()` no longer invents totals from
  blank cells (0), nulls (0), booleans (1), or Date cells (a
  millisecond timestamp). Only finite numbers and fully numeric
  strings are summed; everything else is ignored.
- Sheet Weekly Report: `REPORT_AMOUNT_COLUMN` is now validated as a
  positive integer. The old `parseInt()` code silently accepted
  "2.5" as 2 and "abc" as an out-of-range index that summed to a
  misleading 0.
- Drive File Organizer: subfolder lookups are cached for the run.
  The old code called `getFoldersByName()` for every file, one Drive
  query per file even when every file landed in the same category.
- Calendar Daily Agenda: a missing calendar now throws
  "Calendar not found: <id>" instead of a bare TypeError from
  calling `getEvents()` on null.
- Drive category helper: a null or undefined MIME type now falls
  back to "Other" instead of throwing on `indexOf`.
- Preview server: a malformed percent-escape in a URL now returns
  400 instead of crashing the server, and the path check uses
  `path.relative()` instead of a prefix test.

### Added

- JSDoc (`@param`, `@return`, `@throws`) on every sample function,
  with comments explaining why: dry-run defaults, Script Properties
  instead of hardcoded values, the 100-thread batch, and the
  midnight-to-midnight calendar window.
- Stubbed-service tests for the main functions (Gmail dry-run and
  live runs, Calendar missing-calendar and success), which v1.0.0
  never exercised. Test count: 7 to 15.
- Schema validation in `scripts/build-site-data.js` (required fields,
  difficulty enum, scope format, manifest/metadata scope match),
  with the sample slug in every error. The generator is importable
  for tests without regenerating the site as a side effect.
- `docs/assets/architecture.svg`, referenced from the README.
- Meta description and an inline SVG favicon for the static site;
  the detail view now moves keyboard focus to the opened sample and
  the site checks `fetch()` success before parsing JSON.

### Changed

- README rewritten with Description, Prerequisites, Installation,
  Local Development, and Deployment sections, and updated for the
  live site (v1.0.0's "Pages deployment unverified" note is obsolete).
- `package.json`, manifests, and metadata are now pretty-printed
  JSON instead of single-line blobs.
- CI drops the redundant `git diff` sync step: the test suite
  already compares generated site data to the committed file.

## [1.0.0] - 2026-10-30

- Initial fresh build: four samples (Gmail Inbox Triage, Sheet Weekly
  Report, Drive File Organizer, Calendar Daily Agenda), a
  dependency-free static catalogue site, Node tests, CI, and a
  GitHub Pages deploy workflow. Replaces the old
  `ss-google-apps-script` repository, which contained no code.
