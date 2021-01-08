require('dotenv').config()

const express = require('express');
const schedule = require('node-schedule');
const book = require('./actions/book');

const app = express()

// defaults
const center = { url: 'https://www.matchi.se/facilities/pdlcenter', title: 'PDL Center Frihamnen' };
const wantedTimes = ['18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'];

app.post('/book', (req, res) => {
  book(req.body.center, req.body.wantedTimes, req.body.month, req.body.year, req.body.day);

  res.end();
})

app.listen(process.env.PORT, () => {
  console.log(`MATCHi Bot Actions available at ${process.env.HOST}:${process.env.PORT}`)

  // trigger at midnight 00:00:01 every day
  schedule.scheduleJob({ hour: 0, minute: 0, second: 1 }, () => {
    book(center, wantedTimes);
  });

  console.log('Activated automatic booking every day at midnight');
});
