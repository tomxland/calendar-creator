const $ = jQuery = require('jquery');
const _ = require('underscore');

const Calendar = require('./calendar');
const Config = require('./config');
const XLSX = require('xlsx');

const Util = {
  createCalendar() {
    Util.showLoading();

    let cal = new Calendar();
    let start = $("#startDate").val();
    let name  = $("#calendarName").val();

    cal.setStartDate(start);

    Util.getSheets().then((sheets) => {
      Util.parseSheet(sheets).then(({events, trainers}) => {
        cal.create(name).then(() => {
          cal.loadEvents(events, trainers).then(() => {
            Util.hideLoading();
            Util.clearInputs();
            Messenger().success(`Calendar ${name}  created`);
          });
        });
      });
    });
  },

  inviteToCalendar() {
    Util.showLoading();

    let id = $("#calendarSelect").val();
    let emails = $("#invitees").tagsinput('items');

    let cal = new Calendar(id);

    cal.listEvents().then(events => {
      cal.sendInvites(events, emails).then(() => {
        Util.hideLoading();
        Util.clearInputs();
        Messenger().success("Invitations to " + $("#invitees").val() + " sent.");
      });
    });
  },

  getSheets() {
    return new Promise((resolve, reject) => {
      var params = {
        spreadsheetId: Config.SHEET_ID,
        ranges: [],
        includeGridData: false
      };

      gapi.client.sheets.spreadsheets.get(params).then(({result}) => {
        var sheets = _.map(result.sheets, sheet => sheet.properties.title);
        return resolve(sheets);
      }, err => {
        console.log('The API returned an error: ' + err);
        return reject(err);
      });
    });
  },

  parseSheet(sheets) {
    return new Promise((resolve, reject) => {
      var params = {
        spreadsheetId: Config.SHEET_ID,
        ranges: sheets
      };

      gapi.client.sheets.spreadsheets.values.batchGet(params).then(({result}) => {
        let sheets = result.valueRanges;
        let trainersSheet = sheets.shift();

        let trainers = Util.getTrainers(trainersSheet.values);
        let events = [];

        _.each(sheets, sheet => {
          events.push(...Util.getEvents(sheet));
        })

        return resolve({events, trainers}); //add events
      }, err => {
        console.log('The API returned an error: ' + err);
        return reject(err);
      });
    });
  },

  getTrainers(values) {
    let trainers = {};
    let unit;

    for (let i = 1; i < values.length; i++) {
      let obj = values[i];

      if (obj[0]) {
        unit = obj[0];

        trainers[unit] = {
          lecturers : [],
          tas : []
        };
      }

      if (obj[1] && obj[2]) { //Has Lecturers
        trainers[unit].lecturers.push({
          name : obj[1],
          email : obj[2]
        });
      }

      if (obj[3] && obj[4]) { //Has Lecturers
        trainers[unit].tas.push({
          name : obj[3],
          email : obj[4]
        });
      }
    }

    console.log(trainers);
    return trainers;
  },

  getEvents(sheet) {
    let events = [];
    let range = sheet.range;
    let unit = range.substring(0, range.indexOf("!")).replace(/'/g,"");

    let headers = sheet.values[0];

    for (let i = 1; i < sheet.values.length; i++) {
      let event = {};
      let row = sheet.values[i];

      if (row.length > 0) {
        for (let j = 0; j < row.length; j++) {
          event[headers[j]] = row[j];
        }

        event.Unit = unit;
        events.push(event);
      }
    }

    return events;
  },

  reloadCalendarDropdown() {
    $('#calendarSelect').empty();
    Util.getCalendars().then(list => {
      _.each(list, cal => {
        $('#calendarSelect').append(`<option value="${cal.id}">${cal.summary}</option>`)
      });
    });
  },

  getCalendars() {
    return new Promise((resolve, reject) => {
      gapi.client.calendar.calendarList.list({
        minAccessRole: "owner"
      }).then(({result}) => {
        return resolve(result.items);
      }, err => {
        return reject(err);
      });
    });
  },

  showLoading() {
    $('.loader').fadeIn(1000);
  },

  hideLoading() {
    $('.loader').fadeOut(1000);
  },

  clearInputs() {
    $('input').val("");
    $("#invitees").tagsinput('removeAll');
    $('#invitees').tagsinput('refresh');
  }
};

module.exports = Util;