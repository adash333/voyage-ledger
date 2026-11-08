import {test,expect} from '@playwright/test';
const PAGES=['/','/en/','/kids/','/history/','/history/en/','/quiz/','/quiz/en/','/lemonade/','/lemonade/en/','/lemonade/kids/','/lemonade/quiz/','/trade/','/trade/en/','/trade/company/','/trade/company/en/','/learn/'];
for(const path of PAGES){
 test('SPEC-SITEINFO-001 '+path+' links to the about and privacy pages',async({page})=>{
  await page.goto(path);
  const links=page.locator('.site-links a');
  await expect(links).toHaveCount(2);
  const hrefs=await links.evaluateAll(as=>as.map(a=>new URL(a.href).pathname));
  expect(hrefs).toEqual(['/about/','/privacy/']);
 });
}
for(const path of ['/about/','/privacy/']){
 test('SPEC-SITEINFO-002 '+path+' fits the phone width and links back',async({page})=>{
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('.site-links a').first().click();
  await expect(page).toHaveURL(/\/$/);
 });
}
