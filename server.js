require('dotenv').config()

const express = require('express');
const basicAuth = require('express-basic-auth');
const schedule = require('node-schedule');
const book = require('./actions/book');

const app = express()

// defaults
const center = { url: 'https://www.matchi.se/facilities/pdlcenter', title: 'PDL Center Frihamnen' };
const wantedTimes = ['18:00 - 19:30', '18:00 - 19:00', '19:00 - 20:00', '19:30 - 21:00'];

app.use(express.static('public'));

app.post('/book', basicAuth({ users: { [process.env.AUTH_USERNAME]: process.env.AUTH_PASSWORD } }), (req, res) => {
  book(req.body.center, req.body.wantedTimes, req.body.month, req.body.year, req.body.day);

  res.end();
});

app.get('/', (req, res) => {
  res.send(`
    <img src="/bot.png" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 90%; max-height: 100%; margin: 0 auto; box-sizing: border-box;" />
    <style>* { background: black; }</style>
  `);
});

app.listen(process.env.PORT, () => {
  console.log(`MATCHi Bot Actions available at ${process.env.HOST}:${process.env.PORT}`)

  // trigger at midnight 00:00:01 every monday, tuesday, wednesday and thursday
  schedule.scheduleJob({ dayOfWeek: [1, 2, 3, 4], hour: 0, minute: 0, second: 1 }, () => {
    book(center, wantedTimes);
  });

  console.log('Activated automatic booking every day at midnight');
});
