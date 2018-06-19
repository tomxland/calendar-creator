const _ = require('underscore');

const moment = require('moment-business-days');
const holidayUtils = require('./holidays.js');
const promiseRetry = require('promise-retry');

module.exports = class Calendar {
  constructor(id) {
    if (id) {
      this.id = id;
    }
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

  loadEvents(events, trainers) {
    let context = this;
    return new Promise((resolve, reject) => {

      let dayCounter = 0;
      let promises = [];

      _.each(events, function(obj) {
        if (obj.Day) {
          dayCounter++;
        }

        let unit = obj.unit

        let event = {
          day: dayCounter,
          time: obj.Time,
          title: obj.Event,
          description: obj.Description
        }

        // Only add event if it has a title and time
        if (event.title && event.time) {
          let emails;

          if (event.title.startsWith("[Assignment]")) { //Send to TAs
            emails = _.pluck(trainers[unit].tas, "email");
          } else { //Send to Lecturers
            emails = _.pluck(trainers[unit].lecturers, "email");
            event.type = "Lecture";
            event.duration = 90;
          }

          //Don't pass any emails for right now
          promises.push(context.createEvent(event, emails));
        }      
      });

      Promise.all(promises).then(values => {
        resolve();
      }).catch(err => {
        reject(err);
      });    
    });
  }

  createEvent({ type, title, location="Large Conference Room", description, day, time, duration=0 }, attendees) {
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

      let retries = 0, delay = 250;


      function run() {
        gapi.client.calendar.events.insert({
          calendarId : context.id,
          resource
        }).then(event => {
          resolve(event);
        }).catch(err => {
          console.log('retry');
          retries++;
          delay *= 2;

          if (retries > 5) {
            reject(err);
          } else {
            //Implement exponential backoff:
            setTimeout(run, delay);
          }
        });
      }
      run();
    })
  }

  listEvents() {
    return new Promise((resolve, reject) => {
      gapi.client.calendar.events.list({
        calendarId: this.id,
        timeMin: (new Date()).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      }).then(({result}) => {
        return resolve(result.items);
      }, err => {
        return reject(err);
      });
    });
  }

  sendInvites(events, emails) {
    let context = this;

    return new Promise((resolve, reject) => {
      let promises = [];

      _.each(events, function(event) {
        promises.push(context.updateEvent(event, emails));
      });

      Promise.all(promises).then(values => {
        return resolve();
      }).catch(err => {
        console.log('rejected',err)
        return reject(err);
      });    
    });
  }

  updateEvent(event, attendees) {
    let context = this;

    return new Promise((resolve, reject) => {

      let retries = 0, delay = 250;

      _.each(attendees, email => {
          event.attendees.push({ "email" : email });
      })

      function run() {
        gapi.client.calendar.events.update({
          calendarId : context.id,
          eventId : event.id,
          resource : event
        }).then(event => {
          resolve(event);
        }).catch(err => {
          console.log('retry');
          retries++;
          delay *= 2;

          if (retries > 5) {
            reject(err);
          } else {
            //Implement exponential backoff:
            setTimeout(run, delay);
          }
        });
      }
      run();
    })
  }
}