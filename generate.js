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
        calendar = new Calendar();
        calendar.setStartDate(date);

        calendar.authorize(JSON.parse(content)).then(() => {
          calendar.createCalendar(name).then(() => {
            console.log(calendar.id);
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
    let workbook = XLSX.readFile(path);

    let events = [];

    //Get the trainers:
    let sheetName = workbook.SheetNames[0];
    let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let trainers = getTrainers(sheet);

    for (let i = 1; i < workbook.SheetNames.length; i++) {
      let sheetName = workbook.SheetNames[i];

      let sheetEvents = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      _.each(sheetEvents, event => {
        //Set the unit name for each event to the sheet
        event.unit = sheetName;
        events.push(event);
      })
      events = events.concat();
    }

    loadEvents(events, trainers).then(() => {
      console.log('Events loaded');
      rl.close()
    });
  });
}

function getTrainers(sheet) {
  let trainers = {};
  let unit;

  _.each(sheet, obj => {
    if (obj.Unit) {
      unit = obj.Unit;

      trainers[unit] = {
        lecturers : [],
        tas : []
      };
    }

    if (obj.Lecturers) {
      trainers[unit].lecturers.push({
        name : obj.Lecturers,
        email : obj.__EMPTY
      });
    }

    if (obj.TAs) {
      trainers[unit].tas.push({
        name : obj.TAs,
        email : obj.__EMPTY_1
      });
    }
  });

  return trainers;
}

function loadEvents(events, trainers) {
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
        promises.push(calendar.createEvent(event, emails));
      }      
    });

    Promise.all(promises).then(values => {
      resolve();
    }).catch(err => {
      reject(err);
    });    
  });
}