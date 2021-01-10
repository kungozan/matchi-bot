require('dotenv').config()

const express = require('express');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const schedule = require('node-schedule');
const book = require('./actions/book');

const app = express()

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/book', basicAuth({ users: { [process.env.AUTH_USERNAME]: process.env.AUTH_PASSWORD } }), (req, res) => {
  book(req.body.center, req.body.wantedTimes, req.body.date);

  res.end();
});

app.get('/', (req, res) => {
  res.send(`
    <img src="/bot.png" />
    <style>
      * {
        background: black;
      }

      img {
        box-sizing: border-box;
        position: fixed;
        top: 50%;
        left: 50%;
        max-width: 90%;
        max-height: 100%;
        margin: 0 auto;
        animation: play 5s linear infinite;
      }

      @keyframes play {
        0% {
          transform: translate(calc(-100vw - 50%), -50%);
        }

        24% {
          transform: translate(calc(100vw - 50%), -50%);
        }

        25% {
          transform: translate(calc(100vw - 50%), calc(-100vh - 50%));
        }

        26% {
          transform: translate(-50%, calc(-100vh - 50%));
        }

        49% {
          transform: translate(-50%, calc(100vh - 50%));
        }

        50% {
          transform: translate(calc(100vw - 50%), calc(100vh - 50%));
        }

        51% {
          transform: translate(calc(100vw - 50%), -50%);
        }

        74% {
          transform: translate(calc(-100vw - 50%), -50%);
        }

        75% {
          transform: translate(calc(-100vw - 50%), calc(100vh - 50%));
        }

        76% {
          transform: translate(-50%, calc(100vh - 50%));
        }

        100% {
          transform: translate(-50%, calc(-100vh - 50%));
        }
      }
    </style>
  `);
});

app.listen(process.env.PORT, () => {
  console.log(`MATCHi Bot Actions available at ${process.env.HOST}:${process.env.PORT}`)

  // trigger at midnight 00:00:01 every monday, tuesday, wednesday and thursday
  schedule.scheduleJob({ dayOfWeek: [1, 2, 3, 4], hour: 0, minute: 0, second: 1 }, () => {
    book(
      process.env.MATCHI_SCHEDULED_CENTER,
      ['18:00 - 19:30', '18:00 - 19:00', '19:00 - 20:00', '19:30 - 21:00'],
      moment().tz('Europe/Stockholm').add(14, 'day').format('YYYY-MM-DD') // use next available date (+14 days from current time)
    );
  });

  console.log('Activated automatic booking every day at midnight');
});
