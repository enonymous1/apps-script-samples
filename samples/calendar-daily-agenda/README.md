# Calendar Daily Agenda

Emails tomorrow's calendar events to one recipient.

## Setup

1. Create a script project and copy in `Code.gs` and `appsscript.json`.
2. Optionally set these Script Properties (Project Settings > Script Properties):
   - `AGENDA_RECIPIENT` — defaults to the script owner's own email
   - `AGENDA_CALENDAR` — defaults to the primary calendar
3. Run `sendDailyAgenda()` and authorise the read-only Calendar and
   send-mail scopes.
4. Add a morning time-driven trigger for a daily agenda.

## Notes

- All-day events are listed as "All day", timed events with a start time.
- No email address or calendar ID is hardcoded in the code.
- The date window is midnight-to-midnight tomorrow in the script timezone.
