import {test,expect} from '@playwright/test';
const PAGES=['/','/en/','/kids/','/history/','/history/en/','/quiz/','/quiz/en/','/lemonade/','/lemonade/en/','/lemonade/kids/','/lemonade/quiz/','/trade/','/trade/en/','/trade/company/','/trade/company/en/'];
for(const path of PAGES){
 test('SPEC-FAVICON-001 '+path+' declares icons that load without 404',async({page,request})=>{
  const failed=[];
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  await page.goto(path);
  const hrefs=await page.locator('link[rel="icon"],link[rel="apple-touch-icon"]').evaluateAll(ls=>ls.map(l=>l.href));
  expect(hrefs.length).toBe(3);
  for(const href of hrefs){expect((await request.get(href)).status()).toBe(200);}
  expect(failed).toEqual([]);
 });
}
