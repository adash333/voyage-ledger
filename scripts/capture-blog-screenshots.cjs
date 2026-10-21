const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
 const dir='docs/blog/images';fs.mkdirSync(dir,{recursive:true});
 const base='https://adash333.github.io/voyage-ledger/';
 async function shot(name,locator){await locator.scrollIntoViewIfNeeded();await locator.screenshot({path:dir+'/'+name+'.png',animations:'disabled'});}
 await page.goto(base+'learn/',{waitUntil:'networkidle'});
 await page.locator('#buyBtn').click();
 await shot('screenshot-learn-entry',page.locator('#step1'));
 await page.locator('[data-act="borrow"]').click();
 await page.locator('[data-act="ship"]').click();
 await shot('screenshot-learn-balance',page.locator('#step2'));
 await page.locator('#soldRange').fill('10');
 await shot('screenshot-learn-profit',page.locator('#step3'));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.locator('#reset').click().catch(()=>{});
 page.once('dialog',dialog=>dialog.accept());
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#next').click();
 await shot('screenshot-basic-capital',page.locator('main').first());
 await page.locator('#next').click();
 await shot('screenshot-basic-buy',page.locator('main').first());
 await page.locator('#next').click();
 await shot('screenshot-basic-sell',page.locator('main').first());
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
