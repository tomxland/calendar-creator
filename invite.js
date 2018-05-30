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
      calendar = new Calendar(id);

      calendar.authorize(JSON.parse(content)).then(() => {
        calendar.listEvents().then(() => {
          rl.close();
        });
      });
    });
  });
} catch (err) {
  return console.log('Error loading client secret file:', err);
}