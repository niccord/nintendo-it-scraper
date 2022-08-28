'use strict'

const puppeteer = require('puppeteer')
const fue = require('file-utils-easy')

const title_selector =              '#gamepage-header > div.gamepage-header-info > h1'
const normal_price_selector       = '#price-box-standard-content > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div.row.plo-digital-price-box > div.plm-price.plm-price--white > div:nth-child(1) > div'
const discount_new_price_selector = '#price-box-standard-content > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div.row.plo-digital-price-box > div.plm-price.plm-price--white > div:nth-child(1) > div.plm-price__main'
const discount_old_price_selector = '#price-box-standard-content > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div.row.plo-digital-price-box > div.plm-price.plm-price--white > div:nth-child(1) > div.plm-price__original'
const discount_end_date_selector  = '#price-box-standard-content > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div.row.plo-digital-price-box > div.plm-price.plm-price--white > div:nth-child(1) > div.plm-price__disclaimer'

const cookiesSelector             = 'button#onetrust-accept-btn-handler'

const store_info = {
  region: 'italian',
  discount_message: 'Promozione valida fino al '
}

async function extract_data_from_selector(page, cssSelector) {
  const selector = await page.$(cssSelector);
  if (selector) {
    return await page.$eval(cssSelector, el => el.innerText);
  }
  return null;
}

async function extract_data_from_page(page, page_url, store) {
  try {
    await page.goto(page_url)
    if (await page.$(cookiesSelector)) {
      await page.$eval(cookiesSelector, el => el.click());
    }
    await page.waitForSelector(normal_price_selector)

    const data = {
      title: await extract_data_from_selector(page, title_selector),
      price: await extract_data_from_selector(page, normal_price_selector),
      discount_new_price: await extract_data_from_selector(page, discount_new_price_selector),
      discount_old_price: await extract_data_from_selector(page, discount_old_price_selector),
      discount_end_date: await extract_data_from_selector(page, discount_end_date_selector)
    }
    if (data.discount_end_date) {
      data.discount_end_date = data.discount_end_date.replace(store.discount_message, '')
    }

    return data
  } catch (e) {
    console.log(`Error on ${page_url} evaluation`)
    console.error(e)
  }
}

async function scan_store(browser, store, pages) {
  const allData = []
  const page = await browser.newPage()
  console.time('extract-data')
  for (let index = 0; index < pages.length; index++) {
    const element = pages[index];
    const data = await extract_data_from_page(page, element, store)
    if (data) {
      allData.push(data)
      if (data.discount_old_price) {
        console.log(`🔥🔥🔥 ${data.title} ${data.discount_new_price}`)
      } else {
        console.log(`${data.title} ${data.price}`)
      }
    }
  }
  console.timeEnd('extract-data')
  await page.close()
  allData.sort((a, b) => a.title.localeCompare(b.title))
  console.table(allData)
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true
  })
  const games = await fue.readFile('./games.txt')
  const pages = games.split('\n')

  await scan_store(browser, store_info, pages)
  await browser.close()
}

run()
