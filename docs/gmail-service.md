# Gmail service in Google Apps Script, corrected

This replaces the old `Gmail Service/explanation.md` from
`ss-google-apps-script`, which listed Gmail REST API method names and
linked twice to the generic Gmail developer page. The notes below use
the actual Apps Script built-in service.

## The built-in service is `GmailApp`, not the REST API

In Apps Script you do not call `search`, `getMessage`, or `sendMessage`.
Those are Gmail REST API method names. The built-in service looks like
this:

```javascript
var threads = GmailApp.search('is:unread older_than:7d');
var messages = threads[0].getMessages();
var first = messages[0];
Logger.log(first.getFrom());
Logger.log(first.getSubject());
Logger.log(first.getBody());
Logger.log(first.getAttachments().length);

GmailApp.sendEmail('someone@example.com', 'Subject', 'Body');
threads[0].addLabel(GmailApp.getUserLabelByName('To Review'));
threads[0].moveToArchive();
```

Useful reference, in order:

- `GmailApp` — https://developers.google.com/apps-script/reference/gmail/gmail-app
- `GmailThread` — https://developers.google.com/apps-script/reference/gmail/gmail-thread
- `GmailMessage` — https://developers.google.com/apps-script/reference/gmail/gmail-message
- Scopes — declare only what the script uses in `appsscript.json`
  under `oauthScopes`, for example `gmail.modify` for labelling and
  archiving, or `gmail.send` when a script only sends mail.

## Patterns used by the samples in this repo

- **Search, then act on threads, not single messages.** Search returns
  threads; `thread.getMessages()` gives you the messages inside one.
- **Dry-run first for anything destructive.** The Gmail and Drive
  samples log what they would do while `DRY_RUN` is `true`, and only
  mutate when it is explicitly set to `false`.
- **Configuration in Script Properties, never in code.** Search queries,
  label names, IDs, and recipients are properties, so a sample can be
  copied without editing (or leaking) personal values.
- **Least scope that still works.** Sending only needs `gmail.send`;
  labelling and archiving need `gmail.modify`. Do not ask for full
  `gmail` access when a narrower scope covers the job.

## When to use the REST API instead

Use the Gmail REST API (via `UrlFetchApp` with an OAuth token, or the
Advanced Gmail service) only when you need something `GmailApp` does
not offer, such as message-level batch operations or raw message
format. For the everyday search, read, label, archive, and send flows
in this repo, `GmailApp` is the right tool, and it is also the one
whose authorisation prompt a reader will actually recognise.
