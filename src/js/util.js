const $ = jQuery = require('jquery');
const _ = require('underscore');

const Calendar = require('./calendar');
const XLSX = require('xlsx');

const Util = {
  createCalendar() {
    Util.showLoading();

    let cal = new Calendar();
    let start = $("#startDate").val();
    let name  = $("#calendarName").val();

    cal.setStartDate(start);

    Util.parseEvents().then(({events, trainers}) => {
      cal.create(name).then(() => {
        cal.loadEvents(events, trainers).then(() => {
          Util.hideLoading();
          Messenger().success(`Calendar ${name} created`);
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
        Messenger().success("Invitations to " + $("#invitees").val() + " sent.");
      });
    });
  },

  parseEvents() {
    return new Promise((resolve, reject) => {
      let file   = document.querySelector('#template').files[0];
      let reader = new FileReader();
      reader.onload = function(e) {
        let data = e.target.result;
        let workbook = XLSX.read(data, {type: 'binary'});

        let events = [];

        //Get the trainers:
        let sheetName = workbook.SheetNames[0];
        let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let trainers = Util.getTrainers(sheet);

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

        resolve({events, trainers});
      };
      
      reader.readAsBinaryString(file);
    });
  },

  getTrainers(sheet) {
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
  }
};

module.exports = Util;