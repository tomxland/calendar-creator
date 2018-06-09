const _ = require('underscore');

const moment = require('moment-business-days');
const holidayUtils = require('./holidays.js');

module.exports = class Calendar {
  constructor(gapi) {
    this.gapi = gapi
  }

  setStartDate(startDate) {
    let year = moment(startDate).year();
    let thisYearsHolidays = holidayUtils.getHolidays(year);
    let nextYearsHolidays = holidayUtils.getHolidays(year+1);

    moment.locale('us', {
      holidays: thisYearsHolidays.concat(nextYearsHolidays),
      holidayFormat: 'YYYY-MM-DD' 
    });

    this.startDate = moment(startDate);
  }

  create(title="CCC Training") {
    return new Promise((resolve, reject) => {
      let resource = {
        summary: title,
        timeZone: "America/New_York"
      }

      console.log("Creating Calendar...");

      gapi.client.calendar.calendars.insert({
        resource
      }).then(({result}) => {
        console.log("Created calendar...");

        this.id = result.id;
        this.title = title;

        return resolve(result);
      }, err => {
        console.log('The API returned an error: ' + err);
        return reject(err);
      });
    })
  }

  createEvent({ type, title, location="Large Conference Room", description, day, time, duration=0 }, attendees, retries=0, delay=500) {
    let context = this;

    return new Promise((resolve, reject) => {
      let eventStart = context.startDate.businessAdd(day - 1);
      let eventTime = moment(time, "h:mma")

      eventStart.hour(eventTime.hour());
      eventStart.minute(eventTime.minute());

      let eventFinish = eventStart.clone().add(duration, 'm');

      let emails = attendees.map(email => { return { "email" : email } });

      let resource = {
        'summary': type ? "[" + type + "] " + title : title,
        'location': location,
        'description': description,
        'start': {
          'dateTime': eventStart.toISOString(true)
        },
        'end': {
          'dateTime': eventFinish.toISOString(true)
        },
        'attendees': emails,
        'reminders': {
          'useDefault': true
        },
      };

      context.calendar.events.insert({
        auth : context.token,
        calendarId : context.id,
        resource
      }, function(err, event) {
        if (err) {
          //Implement exponential backoff:
          setTimeout(() => {
            if (retries < 5) {
              return context.createEvent({ type, title, location, description, day, time, duration }, attendees, retries+1, delay*2)
            } else {
              console.log('There was an error contacting the Calendar service: ' + err);
              return reject(err);
            }
          }, delay);
        }

        return resolve(event);
      });
    })
  }

  listEvents() {
    return new Promise((resolve, reject) => {
      this.calendar.events.list({
        calendarId: this.id,
        timeMin: (new Date()).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        auth : this.token
      }, (err, data) => {
        if (err) {
          return reject(err);
        }

        const events = data.data.items;
        return resolve(events);
      });
    });
  }

  updateEvent(event, attendees, retries=0, delay=500) {
    let context = this;

    return new Promise((resolve, reject) => {
      if (retries === 0) {
        _.each(attendees, email => {
          event.attendees.push({ "email" : email });
        })
      }

      context.calendar.events.update({
        auth : context.token,
        calendarId : context.id,
        eventId : event.id,
        resource : event
      }, function(err, event) {
        if (err) {
          //Implement exponential backoff:
          setTimeout(() => {
            if (retries < 5) {
              return context.updateEvent(event, attendees, retries+1, delay*2)
            } else {
              console.log('There was an error contacting the Calendar service: ' + err);
              return reject(err);
            }
          }, delay);
        }

        return resolve(event);
      });
    })
  }
}