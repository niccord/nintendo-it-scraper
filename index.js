'use strict'

const puppeteer = require('puppeteer')
const fue = require('file-utils-easy')

const title_selector =              '#gamepage-header > div:nth-child(1) > h1:nth-child(1)'
const normal_price_selector =       '#v-price-box-2 > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div:nth-child(1) > p > span'
const discount_new_price_selector = '#v-price-box-2 > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > p:nth-child(2) > span:nth-child(1)'
const discount_old_price_selector = '#v-price-box-2 > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > p:nth-child(1) > span:nth-child(1) > span:nth-child(1)'
const discount_end_date_selector =  '#v-price-box-2 > div > div > div > div.col-xs-12.col-sm-7.col-md-12.col-lg-12 > div.row.price-box-item.discount > p:nth-child(3)'

const store_info = {
  region: 'italian',
  discount_message: 'Promozione valida fino al '
}

const sleep = time_to_sleep => new Promise(resolve => setTimeout(() => resolve(), time_to_sleep))

async function extract_data_from_page(browser, page_url, store) {
  try {
    const page = await browser.newPage()
    await page.goto(page_url)    
    await sleep(1000)

    const data = await page.evaluate((title_sel, price_sel, discount_new_sel, discount_old_sel, discount_end_date_sel, message) => {
      const title = document.querySelector(title_sel).innerText
      let qs = document.querySelector(price_sel)
      const price = qs && qs.innerText
      qs = document.querySelector(discount_new_sel)
      const discount_new_price = qs && qs.innerText
      qs = document.querySelector(discount_old_sel)
      const discount_old_price = qs && qs.innerText
      qs = document.querySelector(discount_end_date_sel)
      const discount_end_date = qs && qs.innerText.replace(message, '')

      return { title, price, discount_new_price, discount_old_price, discount_end_date }
    }, title_selector, normal_price_selector, discount_new_price_selector, discount_old_price_selector, discount_end_date_selector, store.discount_message)
    
    if (data.discount_new_price) {
      console.log(`🔥🔥 ${data.title} is on sale on ${store.region} store until ${data.discount_end_date}! ${data.discount_new_price} instead of ${data.discount_old_price}`)
    } else {
      console.log(`${data.title} is at its normal price of ${data.price}`)
    }
    return page
  } catch (e) {
    console.log('Error', e)
  }
}

async function scan_store(browser, store, pages) {
  for (let index = 0; index < pages.length; index++) {
    const element = pages[index];
    const page = await extract_data_from_page(browser, element, store)
    if (page && index < pages.length - 1) {
      page.close()
    }
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true
  })
  const games = await fue.readFile('./games.txt')
  const pages = games.split('\r\n')

  await scan_store(browser, store_info, pages)
  browser.close()
}

run();
