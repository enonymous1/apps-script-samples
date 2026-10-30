# Sheet Weekly Report

Reads a spreadsheet and emails a short summary: data-row count, plus
the sum of a numeric column when one is configured.

## Setup

1. Create a script project and copy in `Code.gs` and `appsscript.json`.
2. Set these Script Properties (Project Settings > Script Properties):
   - `REPORT_SPREADSHEET_ID` — required, from the spreadsheet URL
   - `REPORT_RECIPIENT` — required
   - `REPORT_SHEET_NAME` — optional, defaults to the first sheet
   - `REPORT_AMOUNT_COLUMN` — optional, 1-based column number to sum
3. Run `sendWeeklyReport()` and authorise the read-only Sheets and
   send-mail scopes.
4. Add a weekly time-driven trigger once the emailed report looks right.

## Notes

- The first row is treated as a header and is not counted or summed.
- Non-numeric cells in the amount column are ignored, not treated as zero.
- The script only reads the spreadsheet; it never writes to it.
- No spreadsheet ID or email address is hardcoded in the code.
