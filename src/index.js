import _ from 'lodash';
import $ from 'jquery';
import './css/style.css';
import $script from 'scriptjs';

import Calendar from './js/calendar.js';

import XLSX from 'xlsx';
import Config from './js/config.js';

$('.btn-toggle').click(function() {
  let $el = $(this);

  $el.toggleClass('toggled');

  if ($el.hasClass('toggled')) {
    $("#create-container").hide();
    $("#invite-container").show();
  } else {
    $("#create-container").show();
    $("#invite-container").hide();
  }
});

$script("https://apis.google.com/js/api.js", function() {
  gapi.load('client:auth2', initClient);
});

$("#createBtn").click(function () {
  var cal = new Calendar(gapi);
  cal.setStartDate("2018-07-02");

  var input = $('#template');

  let file    = document.querySelector('#template').files[0];
  let reader = new FileReader();
  reader.onload = function(e) {
    let data = e.target.result;
    let workbook = XLSX.read(data, {type: 'binary'});

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

    console.log(events);
  };
  
  reader.readAsBinaryString(file);
});

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

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners
 */
function initClient() {
  gapi.client.init({
    apiKey: Config.API_KEY,
    client_id: Config.CLIENT_ID,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    scope: "https://www.googleapis.com/auth/calendar"
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

    $('#authorize-button').click(handleAuthClick);
    $('#signout-button').click(handleSignoutClick);
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    $('#authorize-button').hide();
    $('#signout-button').show();
    $('.form').show();
  } else {
    $('#authorize-button').show();
    $('#signout-button').hide();
    $('.form').hide();
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}