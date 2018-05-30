# Google Calendar Generator

This project takes in an excel files of sequenced events and adds them to your Google Calendar based off of any given start date. Events can be separated on different sheets and should include event start time, title, and description. For a sample input file, see [Schedule.xlsx](./Schedule.xlsx). This utility was written to help automate creating the Counterpoint Training Calendar of lectures and assignment due dates for new hires.

## Getting Started
Install Node.js and the project's npm packages before running.

### Calendar Generation

To generate a new calendar:
```
node generate.js
```

Follow the prompts to enter the name of the calendar, its start date, and its input file.

### Event Invitation

To invite new attendees to an existing calendar's events:
```
node invite.js
```

Follow the prompts to enter the calendar ID and emails of new invitees.