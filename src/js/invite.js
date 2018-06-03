const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const _ = require('underscore');
const colors = require('colors');

const Calendar = require('./calendar.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
  const content = fs.readFileSync('client_secret.json');

  rl.question('Calendar ID: '.cyan, id => {
    rl.question('Enter email address to invite to calendar (separated by commas): '.cyan, input => {
      id = "counterpointconsulting.com_1bl37gqqkqch8p9a4didd92qa0@group.calendar.google.com";
      calendar = new Calendar(id);
      let emails = input.split(",");

      calendar.authorize(JSON.parse(content)).then(() => {
        calendar.listEvents().then((events) => {
          sendInvites(events, emails).then(() => {
            console.log('Invitations updated.')
            rl.close();
          });
        });
      });
    });
  });
} catch (err) {
  return console.log('Error loading client secret file:', err);
}

function sendInvites(events, emails) {
  return new Promise((resolve, reject) => {

    let dayCounter = 0;
    let promises = [];

    _.each(events, function(event) {
      promises.push(calendar.updateEvent(event, emails));
    });

    Promise.all(promises).then(values => {
      resolve();
    }).catch(err => {
      reject(err);
    });    
  });
}