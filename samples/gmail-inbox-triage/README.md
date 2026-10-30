# Gmail Inbox Triage

Labels threads matching a Gmail search query and optionally archives them.

## Why this sample exists

It shows the core Apps Script Gmail pattern — `GmailApp.search()`,
`thread.addLabel()`, `thread.moveToArchive()` — behind a dry-run guard,
so a first run can never surprise you.

## Setup

1. Create a script project and copy in `Code.gs` and `appsscript.json`.
2. Set these Script Properties (Project Settings > Script Properties):
   - `TRIAGE_QUERY` — e.g. `is:unread older_than:7d`
   - `TRIAGE_LABEL` — e.g. `To Review`
   - `ARCHIVE_AFTER` — `true` or `false`
   - `DRY_RUN` — `true` by default; set to `false` to apply changes
3. Run `triageInbox()`, authorise the `gmail.modify` scope, and check
   the execution log.
4. Only set `DRY_RUN` to `false` when the dry-run log looks right.

## Notes

- No IDs or email addresses are hardcoded; everything is a Script Property.
- At most 100 threads are processed per run; run it again, or add a
  time-driven trigger, for larger inboxes.
- See `docs/gmail-service.md` for the corrected Gmail service reference.
