require('dotenv').config()

const express = require('express');
const schedule = require('node-schedule');
const book = require('./actions/book');

const app = express()
const wantedTimes = ['18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'];

app.listen(process.env.PORT, () => {
  console.log(`MATCHi Bot Actions available at ${process.env.HOST}:${process.env.PORT}`)

  // trigger at midnight 00:00:01 every day
  schedule.scheduleJob({ hour: 0, minute: 0, second: 1 }, () => {
    // book(wantedTimes);
  });

  console.log('Activated automatic booking every day at midnight');
});

book(wantedTimes);
