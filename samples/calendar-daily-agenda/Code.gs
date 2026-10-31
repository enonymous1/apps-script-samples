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

/**
 * Emails tomorrow's events to the configured recipient.
 *
 * @throws {Error} If no recipient can be determined, or the configured
 *   calendar does not exist. The old code let getCalendarById() return
 *   null and then fail with a bare TypeError on getEvents(), which
 *   told the reader nothing about which property was wrong.
 */
function sendDailyAgenda() {
  var props = PropertiesService.getScriptProperties();
  var recipient = (props.getProperty('AGENDA_RECIPIENT') ||
    Session.getActiveUser().getEmail() || '').trim();
  if (!recipient) {
    throw new Error('Set the AGENDA_RECIPIENT Script Property, or run as a user with an email address.');
  }
  var calendarId = props.getProperty('AGENDA_CALENDAR') || 'primary';

  var window = getTomorrowWindow();
  var calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error('Calendar not found: ' + calendarId + '. Check the AGENDA_CALENDAR Script Property.');
  }
  var events = calendar.getEvents(window.start, window.end);
  var lines = events.map(function (event) {
    return formatEvent(event);
  });

  var timezone = Session.getScriptTimeZone();
  var dateLabel = Utilities.formatDate(window.start, timezone, 'EEEE, MMMM d');
  var subject = 'Agenda for ' + dateLabel;
  var body = lines.length === 0 ?
    'No events tomorrow (' + dateLabel + ').' :
    'Agenda for ' + dateLabel + ':\n\n' + lines.join('\n');
  GmailApp.sendEmail(recipient, subject, body);
  Logger.log(body);
}

/**
 * Returns tomorrow as a midnight-to-midnight window in the script
 * timezone. Built from date parts (not by adding 24 hours) so a
 * daylight-saving transition does not shift the window off the day.
 *
 * @return {{start: Date, end: Date}} Tomorrow's start (inclusive) and
 *   the following midnight (exclusive, as getEvents() expects).
 */
function getTomorrowWindow() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  var end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);
  return { start: start, end: end };
}

/**
 * Formats one calendar event for the email body.
 *
 * @param {Object} event A Calendar event.
 * @return {string} "All day: <title>" for all-day events, otherwise
 *   "<start time> - <title>".
 */
function formatEvent(event) {
  var title = event.getTitle();
  if (event.isAllDayEvent()) {
    return 'All day: ' + title;
  }
  var start = Utilities.formatDate(event.getStartTime(), Session.getScriptTimeZone(), 'h:mm a');
  return start + ' - ' + title;
}
