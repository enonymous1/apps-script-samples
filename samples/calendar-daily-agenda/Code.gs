/**
 * Calendar Daily Agenda.
 *
 * Emails tomorrow's calendar events to one recipient.
 * Defaults to the script owner's own email address, so nothing
 * personal is hardcoded.
 *
 * Script Properties (Project Settings > Script Properties):
 *   AGENDA_RECIPIENT - email address (default: active user's email)
 *   AGENDA_CALENDAR  - calendar ID (default: primary calendar)
 */

function sendDailyAgenda() {
  var props = PropertiesService.getScriptProperties();
  var recipient = props.getProperty('AGENDA_RECIPIENT') ||
    Session.getActiveUser().getEmail();
  var calendarId = props.getProperty('AGENDA_CALENDAR') || 'primary';

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  var end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

  var calendar = CalendarApp.getCalendarById(calendarId);
  var events = calendar.getEvents(start, end);
  var lines = events.map(function (event) {
    return formatEvent(event);
  });

  var dateLabel = Utilities.formatDate(start, Session.getScriptTimeZone(), 'EEEE, MMMM d');
  var subject = 'Agenda for ' + dateLabel;
  var body = lines.length === 0 ?
    'No events tomorrow (' + dateLabel + ').' :
    'Agenda for ' + dateLabel + ':\n\n' + lines.join('\n');
  GmailApp.sendEmail(recipient, subject, body);
  Logger.log(body);
}

function formatEvent(event) {
  var start = Utilities.formatDate(event.getStartTime(), Session.getScriptTimeZone(), 'h:mm a');
  var title = event.getTitle();
  if (event.isAllDayEvent()) {
    return 'All day: ' + title;
  }
  return start + ' - ' + title;
}
