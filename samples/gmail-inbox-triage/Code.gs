/**
 * Gmail Inbox Triage.
 *
 * Labels threads matching a search query, and optionally archives them.
 *
 * Why dry-run is the default: labelling and archiving are not easily
 * undone in bulk, and a wrong search query is the most likely mistake
 * in this script. A first run should only ever prove the query, in the
 * execution log, before DRY_RUN is turned off.
 *
 * Script Properties (Project Settings > Script Properties):
 *   TRIAGE_QUERY  - Gmail search query, e.g. "is:unread older_than:7d"
 *                   (default: "is:unread older_than:7d")
 *   TRIAGE_LABEL  - label to apply, e.g. "To Review" (default: "To Review")
 *   ARCHIVE_AFTER - "true" to archive labelled threads (default: "false")
 *   DRY_RUN       - "true" (default) logs only; "false" applies changes
 */

/**
 * Labels (and optionally archives) the first 100 threads matching the
 * configured search query.
 *
 * The 100-thread cap is a deliberate batch size, not an API limit:
 * it keeps one execution well inside Apps Script quotas and makes
 * re-running the script, or putting it on a time trigger, the safe
 * way to work through a large inbox.
 *
 * @throws {Error} If the search query or label name is empty after trimming.
 */
function triageInbox() {
  var props = PropertiesService.getScriptProperties();
  var query = (props.getProperty('TRIAGE_QUERY') || 'is:unread older_than:7d').trim();
  var labelName = (props.getProperty('TRIAGE_LABEL') || 'To Review').trim();
  if (!query) {
    throw new Error('TRIAGE_QUERY must not be empty. Set a Gmail search query, e.g. "is:unread older_than:7d".');
  }
  if (!labelName) {
    throw new Error('TRIAGE_LABEL must not be empty. Set a label name, e.g. "To Review".');
  }
  var archiveAfter = props.getProperty('ARCHIVE_AFTER') === 'true';
  var dryRun = props.getProperty('DRY_RUN') !== 'false';

  // In dry-run mode the label is never looked up or created, so a
  // first run cannot create a stray label as a side effect.
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
