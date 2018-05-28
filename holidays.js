const moment = require('moment-business-days');

module.exports = {
  SUNDAY : 0,
  MONDAY : 1,
  TUESDAY : 2,
  WEDNESDAY : 3,
  THURSDAY : 4,
  FRIDAY : 5,
  SATURDAY : 6,

  getHolidays(year) {

    let holidays = [];

    //New Years
    holidays.push(this.getObservedHoliday(year, 1, 1));

    //Presidents Day
    holidays.push(this.getNthWeekday(year, 2, this.MONDAY, 3));

    //Memorial Day
    holidays.push(this.getLastWeekday(year, 5, this.MONDAY));

    //July 4th
    holidays.push(this.getObservedHoliday(year, 7, 4));

    //Labor Day
    holidays.push(this.getNthWeekday(year, 9, this.MONDAY, 1));

    //Thanksgiving
    let thanksgiving = this.getNthWeekday(year, 11, this.THURSDAY, 4);
    holidays.push(thanksgiving);

    //Black Friday
    holidays.push(moment(thanksgiving).add(1, 'days').format('YYYY-MM-DD'));

    //Christmas
    holidays.push(this.getObservedHoliday(year, 12, 25));

    return holidays;
  },

  getLastWeekday(year, month, dayOfWeek) {
    let date = moment(`${year}-${month}-01`, "YYYY-M-DD");

    date = date.endOf('month');

    let dayOfLast = date.weekday();

    if (dayOfWeek != dayOfLast) {
      let offset = 0;

      if (dayOfLast > dayOfWeek) {
        offset = dayOfLast - dayOfWeek;
      } else {
        offset = dayOfLast + 7 - dayOfWeek;
      } 

      date = date.subtract(offset, 'day');
    }

    return date.format("YYYY-MM-DD");
  },

  //Gets the nth dayOfWeek in the given month
  getNthWeekday(year, month, dayOfWeek, n) {
    let date = moment(`${year}-${month}-01`, "YYYY-M-DD");

    let counter = 1;

    let dayOfFirst = date.weekday();

    if (dayOfFirst != dayOfWeek) { 
      let offset = 0;

      if (dayOfFirst > dayOfWeek) {
        offset = dayOfWeek + 7 - dayOfFirst;
      } else {
        offset = dayOfWeek - dayOfFirst;
      } 

      date = date.add(offset, 'day');
    }

    while (counter < n) {
      date = date.add(1, 'week');
      counter++;
    }

    return date.format("YYYY-MM-DD");
  },

  getObservedHoliday(year, month, day) {
    let date = moment(`${year}-${month}-${day}`, "YYYY-M-D");

    if (date.weekday() == 6) { //If Saturday, get previous day
      date = date.subtract(1, 'day');
    } else if (date.weekday() == 0) { //If Sunday, get next day
      date = date.add(1, 'day');
    }

    return date.format("YYYY-MM-DD");
  }
}