const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const _ = require('underscore');
const colors = require('colors');

const moment = require('moment-business-days');
const holidayUtils = require('./holidays.js');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'credentials.json';

module.exports = class Calendar {
  constructor(startDate) {
    let year = moment(startDate).year();
    let thisYearsHolidays = holidayUtils.getHolidays(year);
    let nextYearsHolidays = holidayUtils.getHolidays(year+1);

    moment.locale('us', {
      holidays: thisYearsHolidays.concat(nextYearsHolidays),
      holidayFormat: 'YYYY-MM-DD' 
    });

    this.startDate = moment(startDate);
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   * @return {function} if error in reading credentials.json asks for a new one.
   */
  authorize(credentials) {
    return new Promise((resolve, reject) => {
      const {client_secret, client_id, redirect_uris} = credentials.installed;
      let token = {};
      const oAuth2Client = new google.auth.OAuth2(
          client_id, client_secret, redirect_uris[0]);

      // Check if we have previously stored a token.
      try {
        token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        this.token = oAuth2Client;
        this.calendar = google.calendar({version: 'v3', aith: this.token});
        return resolve();

      } catch (error) {
        getAccessToken(oAuth2Client).then(auth => {
          this.token = auth;
          this.calendar = google.calendar({version: 'v3', aith: this.token});
          return resolve();
        }).catch(err => {
          return reject(err);
        });
      }
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  getAccessToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      console.log('Authorize this app by visiting this url:'.cyan, authUrl);

      rl.question('Enter the code from that page here: '.cyan, (code) => {
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return reject(err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          try {
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('Token stored to', TOKEN_PATH);
          } catch (err) {
            console.error(err);
          }
          return resolve(oAuth2Client);
        });
      });
    });
  }

  createCalendar(title="CCC Training") {
    return new Promise((resolve, reject) => {
      var resource = {
        summary: title,
        timeZone: "America/New_York"
      }

      console.log("Creating Calendar...");

      this.calendar.calendars.insert({
        resource : resource,
        auth : this.token
      }, (err, { data }) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          return reject(err);
        } 

        this.id = data.id;
        this.title = title;

        return resolve(data);
      });
    })
  }

  createEvent({ type, title, location="Large Conference Room", description, day, time, duration=0 }, attendees, retries=0, delay=500) {
    var context = this;

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
}