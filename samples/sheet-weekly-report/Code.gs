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
 * Pure summary helper, kept separate so its logic is easy to reason
 * about: header row excluded, non-numeric cells ignored in the total.
 */
function summarizeRows(values, amountColumn) {
  if (!values || values.length < 2) {
    return { rowCount: 0, total: null };
  }
  var rows = values.slice(1);
  var total = null;
  if (amountColumn) {
    var columnIndex = parseInt(amountColumn, 10) - 1;
    total = 0;
    rows.forEach(function (row) {
      var value = Number(row[columnIndex]);
      if (!isNaN(value)) {
        total += value;
      }
    });
  }
  return { rowCount: rows.length, total: total };
}
