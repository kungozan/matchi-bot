const { Builder, By, until } = require('selenium-webdriver');
const moment = require('moment-timezone');

const driver = new Builder().usingServer(`${process.env.WEBDRIVER_HOST}/wd/hub`).forBrowser('chrome').build();

async function login() {
  console.log('logging in...');

  await driver.get('https://www.matchi.se/login/auth?returnUrl=%2Fprofile%2Fhome');
  await driver.wait(until.titleIs('Login - MATCHi'), 5000);

  await driver.findElement(By.id('username')).sendKeys(process.env.USERNAME);
  await driver.findElement(By.id('password')).sendKeys(process.env.PASSWORD);

  await driver.findElement(By.css('#loginForm button')).click();
  await driver.wait(until.titleIs(`${process.env.NAME} - MATCHi`), 5000);

  console.log('logged in!');
}

async function useCenter(url, title) {
  console.log('finding center...');

  await driver.get(url);
  await driver.wait(until.titleIs(title), 5000);

  console.log('found center!');
}

async function useDate(month, year, day) {
  console.log('finding date...');

  // if no passed date, use next available date (+14 days from current time)
  if (!month || !year || !day) {
    const nextAvailableDate = moment().add(14, 'day').tz('Europe/Stockholm').locale('sv').format('MMMM, YYYY, D');
    [month, year, day] = nextAvailableDate.split(', ');
  }

  await driver.wait(until.elementLocated(By.id('picker_daily'), 15000));
  await driver.findElement(By.id('picker_daily')).click();
  await driver.wait(until.elementLocated(By.css('.datepicker-switch'), 10000));

  // month does not match current view, move to next month
  if (`${month} ${year}` != (await driver.findElement(By.css('.datepicker-switch')).getText()).toLowerCase()) {
    await driver.findElement(By.css('.datepicker .next')).click();
  }

  const days = await driver.findElements(By.css('.datepicker .day:not(.old):not(.new)'));

  for (const dayEl of days) {
    if (await dayEl.getText() == day) {
      await dayEl.click();
      await driver.wait(until.elementTextContains(driver.findElement(By.id('schedule')), `${day} ${month}`), 10000);
      break;
    }
  }

  console.log('found date!');
}

async function findAvailableSlot(wantedTimes) {
  console.log('finding available slot...');

  const free = await driver.findElements(By.css('.schedule .free'));

  for (const freeEl of free) {
    const text = (await freeEl.getAttribute('data-original-title')).toLowerCase();

    if (text.includes('junior')) {
      continue;
    }

    const time = text.split('<br> ').pop();

    // evaluate if available times match wanted times
    if (!wantedTimes.includes(time)) {
      continue;
    }

    await freeEl.click();

    console.log('found available slot!');
  }

  throw new Error('No available slot found');
}

async function finalize() {
  console.log('finalizing payment...');

  await driver.wait(until.elementLocated(By.id('btnSubmit')), 5000);
  await driver.findElement(By.id('btnSubmit')).click();

  console.log('finalized payment!');
}

module.exports = async function book(center, wantedTimes, month, year, day) {
  try {
    console.log('booking');

    await login();
    await useCenter(center.url, center.title);
    await useDate(month, year, day);
    await findAvailableSlot(wantedTimes);
    await finalize();

    console.log('booking successful!');
  } catch (error) {
    console.error(error);
  } finally {
    console.log('closing booking session.');

    await driver.quit();
  }
}
