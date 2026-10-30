# Apps Script Samples

Small, working Google Apps Script samples — built fresh to replace the
old `ss-google-apps-script` repo, which contained only two Markdown
files and no code at all. Each sample is a complete, copyable script
project, and the static site in `site/` is a cleaner way to browse them.

## Samples

| Sample | Services | Level | What it does |
| --- | --- | --- | --- |
| Gmail Inbox Triage | Gmail | Beginner | Labels threads matching a search query, optionally archives them. Dry-run first. |
| Sheet Weekly Report | Sheets, Gmail | Intermediate | Counts data rows, optionally sums a column, emails the summary. |
| Drive File Organizer | Drive | Intermediate | Moves files into subfolders by type. Dry-run first. |
| Calendar Daily Agenda | Calendar, Gmail | Beginner | Emails tomorrow's events. Defaults to your own address. |

## Use a sample

1. Create a script project (or `clasp create`, then copy the sample's
   `.clasp.json.example` to `.clasp.json` and fill in your script ID —
   `.clasp.json` itself is gitignored, so a real ID can never be
   committed by accident).
2. Copy the sample's `Code.gs` and `appsscript.json` into the project.
3. Set its Script Properties (Project Settings > Script Properties).
   Nothing is hardcoded: no spreadsheet/folder IDs, no email addresses.
4. Run its main function once, authorise only the scopes it declares,
   and check the execution log.
5. Only then set `DRY_RUN` to `false` (Gmail, Drive) or add a
   time-driven trigger (Sheets, Calendar).

## Browse the samples on the static site

```sh
npm run build:site   # regenerate site/samples.json from the samples
npm run preview      # serve site/ at http://localhost:8080/
npm test             # Node tests: manifests, scopes, syntax, helpers, site sync
```

The site is dependency-free HTML/CSS/JS. It loads the generated
`site/samples.json`, so search, service, and difficulty filters, the
setup steps, the OAuth scopes, and the full `Code.gs` for each sample
always match the samples on disk — the test suite fails if they drift.

Deploying it is a workflow, not a manual step: `.github/workflows/pages.yml`
publishes `site/` to GitHub Pages on every push to `main`. Enable Pages
(Settings > Pages > Source: GitHub Actions) after the first push.

## Corrected Gmail reference

`docs/gmail-service.md` replaces the old repo's Gmail explainer. The
old one listed Gmail REST API method names and linked twice to the
generic Gmail developer page; the corrected version uses the real
Apps Script `GmailApp` API (`GmailApp.search()`, `thread.addLabel()`,
`GmailApp.sendEmail()`) and links to the actual `GmailApp`,
`GmailThread`, and `GmailMessage` references.

## Safety notes

- Destructive samples (Gmail triage, Drive organizer) dry-run by default.
- Scopes are the narrowest that work: `gmail.send` where a sample only
  sends mail, `gmail.modify` where it labels/archives, read-only Sheets
  and Calendar scopes where nothing is written.
- No credentials, IDs, or personal data are committed. Script Properties
  are the only place configuration lives.

## What is not verified here

A live Google run is still the gate: authorising each sample in the
Apps Script editor, running it against a real Gmail/Sheets/Drive/
Calendar account, and confirming the Pages deployment after push.
What is verified here is everything that can be checked without an
account: syntax, manifest/scope consistency, the pure helper logic,
and that the generated site data matches the samples.
