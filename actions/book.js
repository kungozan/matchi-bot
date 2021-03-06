const { Browser, Builder, By, until } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const moment = require('moment-timezone');

const options = new Options();
const builder = new Builder().forBrowser(Browser.CHROME);
const THIRTY_SECONDS = 30000;

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
  await driver.wait(until.titleIs('Login - MATCHi'), THIRTY_SECONDS);

  await driver.findElement(By.id('username')).sendKeys(process.env.MATCHI_USERNAME);
  await driver.findElement(By.id('password')).sendKeys(process.env.MATCHI_PASSWORD);

  await driver.findElement(By.css('#loginForm button')).click();
  await driver.wait(until.titleIs(`${process.env.MATCHI_NAME} - MATCHi`), THIRTY_SECONDS);

  console.log('logged in!');
}

async function findSchedule(driver, url, date) {
  const dateString = moment(date).tz('Europe/Stockholm').locale('sv').format('dddd D MMMM');
  console.log(`finding schedule for ${date} at ${url}...`);

  await driver.get(`${url}?date=${date}`);
  await driver.wait(until.elementLocated(By.id('schedule')), THIRTY_SECONDS);
  await driver.wait(until.elementTextContains(driver.findElement(By.id('schedule')), dateString), THIRTY_SECONDS);

  console.log('found schedule!');
}

async function findAvailableSlot(driver, wantedTimes) {
  console.log(`finding available slot matching "${wantedTimes.join(' | ')}"...`);

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

    return;
  }

  throw new Error('no available slot found');
}

async function finalize(driver) {
  console.log('finalizing payment...');

  await driver.wait(until.elementLocated(By.id('btnSubmit')), THIRTY_SECONDS);
  await driver.sleep(5000);
  await driver.findElement(By.id('btnSubmit')).click();

  console.log('finalized payment!');
}

module.exports = async function book(center, wantedTimes, date, attempt = 1) {
  const driver = builder
    .setChromeOptions(options)
    .build();

  let successful;

  try {
    console.log('booking...');

    await login(driver);
    await findSchedule(driver, center, date);
    await findAvailableSlot(driver, wantedTimes);
    await finalize(driver);

    successful = true;
    console.log('booking successful!');
  } catch (error) {
    successful = false;
    console.log(`attempt #${attempt} failed.`);
    console.error(error);
  } finally {
    await driver.quit();

    // retry once
    if (!successful && attempt < 2) {
      book(center, wantedTimes, date, attempt + 1);
    }
  }
}
