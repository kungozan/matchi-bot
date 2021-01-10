const { Browser, Builder, By, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const moment = require('moment-timezone');

const options = new Options();
const builder = new Builder().forBrowser(Browser.CHROME);

switch (process.env.ENV) {
  case 'production':
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    break;
  default:
    builder.usingServer('http://localhost:4444/wd/hub');
    break;
}

async function login(driver) {
  console.log('logging in...');

  await driver.get('https://www.matchi.se/login/auth?returnUrl=%2Fprofile%2Fhome');
  await driver.wait(until.titleIs('Login - MATCHi'), 5000);

  await driver.findElement(By.id('username')).sendKeys(process.env.MATCHI_USERNAME);
  await driver.findElement(By.id('password')).sendKeys(process.env.MATCHI_PASSWORD);

  await driver.findElement(By.css('#loginForm button')).click();
  await driver.wait(until.titleIs(`${process.env.MATCHI_NAME} - MATCHi`), 5000);

  console.log('logged in!');
}

async function useCenter(driver, url, title) {
  console.log('finding center...');

  await driver.get(url);
  await driver.wait(until.titleIs(title), 5000);

  console.log('found center!');
}

async function useDate(driver, month, year, day) {
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

async function findAvailableSlot(driver, wantedTimes) {
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

async function finalize(driver) {
  console.log('finalizing payment...');

  await driver.wait(until.elementLocated(By.id('btnSubmit')), 5000);
  await driver.findElement(By.id('btnSubmit')).click();

  console.log('finalized payment!');
}

module.exports = async function book(center, wantedTimes, month, year, day) {
  const driver = builder
    .setChromeOptions(options)
    .build();

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
