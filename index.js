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

async function extract_data_from_page(page, page_url, store) {
  try {
    await page.goto(page_url)    
    await page.waitForSelector(normal_price_selector)

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

    return data
  } catch (e) {
    console.log(`Error on ${page_url} evaluation`)
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
      if (data.discount_new_price) {
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
  const pages = games.split('\r\n')

  await scan_store(browser, store_info, pages)
  await browser.close()
}

run()
