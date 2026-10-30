/**
 * Gmail Inbox Triage.
 *
 * Labels threads matching a search query, and optionally archives them.
 * Dry-run is ON by default: set the DRY_RUN Script Property to "false"
 * only when you are ready for it to change labels.
 *
 * Script Properties (Project Settings > Script Properties):
 *   TRIAGE_QUERY  - Gmail search query, e.g. "is:unread older_than:7d"
 *                   (default: "is:unread older_than:7d")
 *   TRIAGE_LABEL  - label to apply, e.g. "To Review" (default: "To Review")
 *   ARCHIVE_AFTER - "true" to archive labelled threads (default: "false")
 *   DRY_RUN       - "true" (default) logs only; "false" applies changes
 */

function triageInbox() {
  var props = PropertiesService.getScriptProperties();
  var query = props.getProperty('TRIAGE_QUERY') || 'is:unread older_than:7d';
  var labelName = props.getProperty('TRIAGE_LABEL') || 'To Review';
  var archiveAfter = props.getProperty('ARCHIVE_AFTER') === 'true';
  var dryRun = props.getProperty('DRY_RUN') !== 'false';

  var label = dryRun ? null : GmailApp.getUserLabelByName(labelName) ||
    GmailApp.createLabel(labelName);

  var threads = GmailApp.search(query, 0, 100);
  Logger.log('Found ' + threads.length + ' thread(s) for query: ' + query);

  threads.forEach(function (thread) {
    var subject = thread.getFirstMessageSubject();
    if (dryRun) {
      Logger.log('[DRY RUN] Would label "' + subject + '" with "' + labelName + '"' +
        (archiveAfter ? ' and archive it.' : '.'));
      return;
    }
    thread.addLabel(label);
    if (archiveAfter) {
      thread.moveToArchive();
    }
  });

  Logger.log('Done. Dry run: ' + dryRun);
}
