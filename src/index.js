const $ = jQuery = require('jquery');
const $script = require('scriptjs');

require('bootstrap-datepicker');
require('bootstrap-tagsinput');
require('./css/style.css');
require('../lib/messenger/js/messenger');
Messenger.options = {
 extraClasses : 'messenger-fixed messenger-on-bottom messenger-on-right',
 theme : 'air'
};

const Config = require('./js/config');
const Util = require('./js/util');
const Calendar = require('./js/calendar');

$('.btn-toggle .track').click(function() {
  let $el = $(this).parent();

  $el.toggleClass('toggled');

  if ($el.hasClass('toggled')) {
    $("#create-container").hide();
    $("#invite-container").show();
    Util.reloadCalendarDropdown();
  } else {
    $("#create-container").show();
    $("#invite-container").hide();
  }
});

$script("https://apis.google.com/js/api.js", function() {
  gapi.load('client:auth2', initClient);
});

$("#createBtn").click(Util.createCalendar);
$("#inviteBtn").click(Util.inviteToCalendar);

$('#startDate').datepicker({
  format: 'yyyy-mm-dd'
});

$('#invitees').tagsinput({
  tagClass: 'label label-info big',
  confirmKeys: [9, 13, 32, 188, 186]
});

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners
 */
function initClient() {
  gapi.client.init({
    apiKey: Config.API_KEY,
    client_id: Config.CLIENT_ID,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest","https://sheets.googleapis.com/$discovery/rest?version=v4"],
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets"
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