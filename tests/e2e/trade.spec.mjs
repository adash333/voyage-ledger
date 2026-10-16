import {test,expect} from '@playwright/test';
test('TRADE-UI-001: mobile trade preview, commit, journal and report',async({page})=>{
 await page.goto('/trade/');
 await expect(page.getByRole('heading',{name:/自由経営モード/})).toBeVisible();
 await page.getByRole('button',{name:'スキップ'}).click();
 await expect(page.locator('#prices tbody tr')).toHaveCount(4);
 await page.locator('#good').selectOption('glass');
 await page.locator('#qty').fill('3');
 await page.locator('#checkTrade').click();
 await expect(page.locator('#tradePreview')).toContainText('金貨15枚');
 await expect(page.locator('#summary')).toContainText('金貨100枚');
 await page.locator('#tradePreview #accept').click();
 await expect(page.locator('#summary')).toContainText('金貨85枚');
 await page.locator('#tab-journal').click();
 await expect(page.locator('#journal')).toContainText('商品');
 await page.locator('#tab-report').click();
 await expect(page.locator('#report')).toContainText('資産合計');
 await expect(page.locator('.asset-side')).toContainText('ガラス製品（3個）');
 await expect(page.locator('.asset-side')).toContainText('金貨15枚');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('TRADE-UI-002: sail preview, departure and reload persistence',async({page})=>{
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 await page.locator('#checkSail').click();
 await expect(page.locator('#sailPreview')).toContainText('航海費');
 await expect(page.locator('#summary')).toContainText('ヴェネツィア');
 await page.locator('#sailPreview #accept').click();
 await expect(page.locator('#summary')).toContainText('アレクサンドリア');
 await expect(page.locator('#summary')).toContainText('金貨95枚');
 await page.reload();
 await expect(page.locator('#summary')).toContainText('アレクサンドリア');
 await expect(page.locator('#summary')).toContainText('金貨95枚');
});

test('TRADE-UI-003: P/L and B/S separated and balance on mobile',async({page})=>{
 await page.goto('/trade/');
 const skip=page.getByRole('button',{name:'スキップ'});
 if(await skip.isVisible())await skip.click();
 await page.locator('#tab-report').click();
 await expect(page.getByRole('heading',{name:/損益計算書（P\/L）/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/貸借対照表（B\/S）/})).toBeVisible();
 await expect(page.locator('.asset-side')).toContainText('現金');
 await expect(page.locator('.equity-side')).toContainText('資本金');
 await expect(page.locator('.balance-check')).toContainText('一致しています');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('TRADE-UI-004: illustrated map tracks every outward and return port, reload and restart',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/trade/');
 await page.getByRole('button',{name:'スキップ'}).click();
 await expect(page.locator('#mapIllustration')).toHaveAttribute('href','./assets/mediterranean-map.webp');
 const illustration=await page.request.get('/trade/assets/mediterranean-map.webp');
 expect(illustration.ok()).toBe(true);
 const imageSize=await page.evaluate(async()=>{const image=new Image();image.src=document.querySelector('#mapIllustration').href.baseVal;await image.decode();return [image.naturalWidth,image.naturalHeight];});
 expect(imageSize[0]).toBeGreaterThan(1000);
 expect(imageSize[1]).toBeGreaterThan(600);
 await expect(page.locator('#portDots .map-city')).toHaveCount(4);
 await expect(page.locator('#routeLine .route-leg')).toHaveCount(3);
 async function checkPort(id,name){
  await expect(page.locator('#shipMarker')).toHaveCount(1);
  await expect(page.locator('#shipMarker')).toHaveAttribute('data-port',id);
  await expect(page.locator('#shipTitle')).toHaveText('現在地の船：'+name);
  await expect(page.locator('#voyageMap')).toHaveAttribute('aria-label',new RegExp('現在地：'+name));
  await expect(page.locator('#mapLocation')).toContainText('現在地：'+name);
  await expect(page.locator('#routeSteps [aria-current="location"]')).toHaveCount(1);
  await expect(page.locator('#routeSteps [aria-current="location"]')).toContainText(name);
  const dot=page.locator('[data-port="'+id+'"] .port-dot');
  const x=await dot.getAttribute('cx'),y=await dot.getAttribute('cy');
  await expect(page.locator('#shipMarker')).toHaveAttribute('transform','translate('+x+' '+y+')');
  // Read both rectangles together: closing a voyage can smoothly scroll the page.
  const {frame,ship}=await page.evaluate(()=>{const f=document.querySelector('#voyageMap').getBoundingClientRect(),s=document.querySelector('#shipMarker').getBoundingClientRect();return {frame:{x:f.x,y:f.y,width:f.width,height:f.height},ship:{x:s.x,y:s.y,width:s.width,height:s.height}};});
  expect(ship.x).toBeGreaterThanOrEqual(frame.x);
  expect(ship.y).toBeGreaterThanOrEqual(frame.y);
  expect(ship.x+ship.width).toBeLessThanOrEqual(frame.x+frame.width);
  expect(ship.y+ship.height).toBeLessThanOrEqual(frame.y+frame.height);
 }
 const outward=[['venice','ヴェネツィア'],['alexandria','アレクサンドリア'],['constantinople','コンスタンティノープル'],['barcelona','バルセロナ']];
 await checkPort(...outward[0]);
 // A preview and a cancelled departure must leave the ship at its original port.
 await page.locator('#checkSail').click();
 await checkPort(...outward[0]);
 await page.locator('#sailPreview #cancel').click();
 await checkPort(...outward[0]);
 for(let voyage=0;voyage<2;voyage++){
  const stops=voyage?[...outward].reverse():outward;
  await expect(page.locator('#routeSteps .map-step')).toHaveText(stops.map(([,name])=>new RegExp(name)));
  for(let stop=1;stop<stops.length;stop++){
   await page.locator('#checkSail').click();
   await page.locator('#sailPreview #accept').click();
   await checkPort(...stops[stop]);
   await page.reload();
   await checkPort(...stops[stop]);
  }
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#closeBtn').click();
  await checkPort(...stops[3]);
  if(voyage===0)await page.locator('#continueBtn').click();
 }
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#restartBtn').click();
 await page.reload();
 await checkPort(...outward[0]);
 expect(errors).toEqual([]);
});

for(const width of [320,390,1024]){
 test('TRADE-UI-005: map labels and ship stay within the frame at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/trade/');
  await page.getByRole('button',{name:'スキップ'}).click();
  const frame=await page.locator('#voyageMap').boundingBox();
  for(const label of await page.locator('#portDots .map-city').all()){
   const box=await label.boundingBox();
   expect(box.x).toBeGreaterThanOrEqual(frame.x);
   expect(box.x+box.width).toBeLessThanOrEqual(frame.x+frame.width);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
