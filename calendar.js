const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const moment = require('moment-business-days');
const _ = require('underscore');
const colors = require('colors');
const XLSX = require('xlsx');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'credentials.json';

var startDate, offset = -1;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

init()

function init() {
  setHolidays();
  inputData();
}

//For now, hardcode holiday
function setHolidays() {
  var july4th = '2018-07-04';
   
  moment.locale('us', {
    holidays: [july4th],
    holidayFormat: 'YYYY-MM-DD' 
  });
}

function inputData() {
  // Load client secrets from a local file.
  try {
    const content = fs.readFileSync('client_secret.json');

    authorize(JSON.parse(content)).then(auth => {
      rl.question('Name of calendar: '.cyan, name => {
        rl.question('What date are the new hires starting? (YYYY-MM-DD) '.cyan, date => {
          startDate = moment(date);

          createCalendar(auth, name).then(data => {
            enterExcel(auth, data.id);
          });
        });
      });
    });
  } catch (err) {
    return console.log('Error loading client secret file:', err);
  }
}

function enterExcel(auth, calendarId) {
  rl.question('Enter .xlsx file to import: '.cyan, path => {
    var workbook = XLSX.readFile(path);

    var events = [];

    for (let i = 1; i < workbook.SheetNames.length; i++) {
      let sheet = workbook.SheetNames[i];

      var sheetEvents = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

      _.each(sheetEvents, function (e) {
        //Set the unit name for each event to the sheet
        e.unit = sheet;
        events.push(e);
      })
      events = events.concat();
    }

    loadEvents(auth, calendarId, events).then(() => {
      console.log('Events loaded');
      rl.close()
    });
  });
}

function loadEvents(auth, calendarId, events) {
  return new Promise((resolve, reject) => {

    let dayCounter = 0;
    let promises = [];

    _.each(events, function(obj) {
      if (obj.Day) {
        dayCounter++;
      }

      var event = {
        day: dayCounter,
        time: obj.Time,
        title: obj.Event,
        description: obj.Description
      }

      // Only add event if it has a title and time
      if (event.title && event.time) {
        if (event.title.startsWith("[Assignment]")) {
          
          ///
        } else {
          event.type = "Lecture";
          event.duration = 90;
        }

        //Don't pass any emails for right now
        promises.push(createEvent(auth, calendarId, event, []));
      }      
    });


    Promise.all(promises).then(values => {
      resolve();
    }).catch(err => {
      reject(err);
    });

    
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @return {function} if error in reading credentials.json asks for a new one.
 */
function authorize(credentials) {
  return new Promise((resolve, reject) => {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    let token = {};
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    try {
      token = fs.readFileSync(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      return resolve(oAuth2Client);

    } catch (error) {
      getAccessToken(oAuth2Client).then(auth => {
        return resolve(auth);
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
function getAccessToken(oAuth2Client) {
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

function createCalendar(auth, title="CCC Training") {
  return new Promise((resolve, reject) => {
    var resource = {
      summary: title,
      timeZone: "America/New_York"
    }

    const calendar = google.calendar({version: 'v3', auth});

    console.log("Creating Calendar...");

    calendar.calendars.insert({
      resource,
      auth
    }, (err, { data }) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        return reject(err);
      } 

      return resolve(data);
    });
  })
}

function createEvent(auth, calendarId, { type, title, location="Large Conference Room", description, day, time, duration=0 }, attendees, retries=0, delay=500) {
  return new Promise((resolve, reject) => {
    let eventStart = startDate.businessAdd(offset + day);
    let eventTime = moment(time, "h:mma")

    eventStart.hour(eventTime.hour());
    eventStart.minute(eventTime.minute());

    let eventFinish = eventStart.clone().add(duration, 'm');

    const calendar = google.calendar({version: 'v3', auth});

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

    calendar.events.insert({
      auth,
      calendarId,
      resource
    }, function(err, event) {
      if (err) {
        //Implement exponential backoff:
        setTimeout(() => {
          if (retries < 5) {
            return createEvent(auth, calendarId, { type, title, location, description, day, time, duration }, attendees, retries+1, delay*2)
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