/**
 * Sheet Weekly Report.
 *
 * Reads rows from a spreadsheet and emails a short summary:
 * row count, and the sum of a numeric column when one is configured.
 *
 * Script Properties (Project Settings > Script Properties):
 *   REPORT_SPREADSHEET_ID - spreadsheet ID (required, never hardcoded)
 *   REPORT_SHEET_NAME     - sheet/tab name (default: first sheet)
 *   REPORT_AMOUNT_COLUMN  - 1-based column to sum, e.g. "3" (optional)
 *   REPORT_RECIPIENT      - email address for the report (required)
 *
 * The first row is treated as a header and is not counted or summed.
 */

/**
 * Emails the weekly summary for the configured spreadsheet.
 *
 * @throws {Error} If a required Script Property is missing, or the
 *   named sheet does not exist. Failures throw before any email is
 *   sent, so a misconfiguration never produces a misleading report.
 */
function sendWeeklyReport() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('REPORT_SPREADSHEET_ID');
  var recipient = props.getProperty('REPORT_RECIPIENT');
  if (!spreadsheetId) {
    throw new Error('Set the REPORT_SPREADSHEET_ID Script Property first.');
  }
  if (!recipient) {
    throw new Error('Set the REPORT_RECIPIENT Script Property first.');
  }

  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheetName = props.getProperty('REPORT_SHEET_NAME');
  var sheet = sheetName ? spreadsheet.getSheetByName(sheetName) :
    spreadsheet.getSheets()[0];
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  var values = sheet.getDataRange().getValues();
  var summary = summarizeRows(values, props.getProperty('REPORT_AMOUNT_COLUMN'));

  var subject = 'Weekly report: ' + spreadsheet.getName();
  var body = 'Rows (excluding header): ' + summary.rowCount + '\n' +
    (summary.total !== null ? 'Total: ' + summary.total + '\n' : '') +
    'Sheet: ' + sheet.getName() + '\n';
  GmailApp.sendEmail(recipient, subject, body);
  Logger.log(body);
}

/**
 * Summarizes spreadsheet rows. Pure: no Apps Script services are
 * touched, which is why this is the one function the Node test suite
 * can exercise directly.
 *
 * @param {Array<Array<*>>} values All values from the sheet, header row first.
 * @param {string|null} amountColumn 1-based column number as a string,
 *   or a falsy value when no column should be summed.
 * @return {{rowCount: number, total: number|null}} Row count (header
 *   excluded) and the column total, or null when no column is configured.
 * @throws {Error} If amountColumn is present but is not a positive integer.
 */
function summarizeRows(values, amountColumn) {
  if (!values || values.length < 2) {
    return { rowCount: 0, total: null };
  }
  var rows = values.slice(1);
  var total = null;
  if (amountColumn) {
    var columnIndex = parseAmountColumn(amountColumn);
    total = 0;
    rows.forEach(function (row) {
      var value = numericCellValue(row[columnIndex]);
      if (value !== null) {
        total += value;
      }
    });
  }
  return { rowCount: rows.length, total: total };
}

/**
 * Validates a 1-based column number from a Script Property.
 *
 * The old code used parseInt() directly, which silently accepted
 * "2.5" as 2 and "abc" as NaN (an out-of-range index that summed to a
 * misleading 0). A misconfigured column must fail loudly instead.
 *
 * @param {string} amountColumn The raw property value.
 * @return {number} The 0-based column index.
 * @throws {Error} If the value is not a positive integer.
 */
function parseAmountColumn(amountColumn) {
  if (!/^[1-9][0-9]*$/.test(String(amountColumn).trim())) {
    throw new Error('REPORT_AMOUNT_COLUMN must be a positive integer (1-based), got: ' + amountColumn);
  }
  return parseInt(amountColumn, 10) - 1;
}

/**
 * Extracts a summable number from one spreadsheet cell, or null.
 *
 * Why this is strict: Number() alone is a trap for this job.
 * Number('') and Number(null) are both 0, Number(true) is 1, and
 * Number(a Date cell) is a millisecond timestamp, so a naive sum
 * silently invents money from blanks, checkboxes, and dates. Only a
 * finite number, or a string that is entirely numeric after trimming,
 * counts; everything else is ignored.
 *
 * @param {*} cell The raw cell value from getValues().
 * @return {number|null} The numeric value, or null when the cell is not summable.
 */
function numericCellValue(cell) {
  if (typeof cell === 'number' && isFinite(cell)) {
    return cell;
  }
  if (typeof cell === 'string') {
    var trimmed = cell.trim();
    if (/^-?[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return null;
}
