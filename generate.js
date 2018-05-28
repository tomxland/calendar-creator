const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var moment = require('moment-business-days');
const _ = require('underscore');
const colors = require('colors');
const XLSX = require('xlsx');

const Calendar = require('./calendar.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var calendar;

inputData();

function inputData() {
  // Load client secrets from a local file.
  try {
    const content = fs.readFileSync('client_secret.json');

    rl.question('Name of calendar: '.cyan, name => {
      rl.question('What date are the new hires starting? (YYYY-MM-DD): '.cyan, date => {
        calendar = new Calendar(date);

        calendar.authorize(JSON.parse(content)).then(() => {
          calendar.createCalendar(name).then(() => {
            enterExcel();
          });
        });
      });
    });
  } catch (err) {
    return console.log('Error loading client secret file:', err);
  }
}

function enterExcel() {
  rl.question('Enter .xlsx file to import: '.cyan, path => {
    var workbook = XLSX.readFile(path);

    var events = [];

    for (let i = 1; i < workbook.SheetNames.length; i++) {
      let sheet = workbook.SheetNames[i];

      var sheetEvents = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

      _.each(sheetEvents, event => {
        //Set the unit name for each event to the sheet
        event.unit = sheet;
        events.push(event);
      })
      events = events.concat();
    }

    loadEvents(events).then(() => {
      console.log('Events loaded');
      rl.close()
    });
  });
}

function loadEvents(events) {
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
        if (!event.title.startsWith("[Assignment]")) {
          event.type = "Lecture";
          event.duration = 90;
        }

        //Don't pass any emails for right now
        promises.push(calendar.createEvent(event, []));
      }      
    });

    Promise.all(promises).then(values => {
      resolve();
    }).catch(err => {
      reject(err);
    });    
  });
}