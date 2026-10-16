import {test,expect} from '@playwright/test';

test('TRADE-QUANTITY-001: oversized Alexandria order explains capacity next to input without changing saved data',async({page})=>{
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 await page.locator('#checkSail').click();await page.locator('#sailPreview #accept').click();
 const saved=await page.evaluate(()=>localStorage.getItem('voyage-trade-v1'));
 await page.getByLabel('数量',{exact:true}).fill('20');
 await page.locator('#checkTrade').click();
 await expect(page.locator('#qtyError')).toBeVisible();
 await expect(page.locator('#qtyError')).toContainText('全商品合計で10個');
 await expect(page.locator('#qtyHint')).toContainText('最大10個');
 await expect(page.locator('#qty')).toBeFocused();
 await expect(page.locator('#qty')).toHaveValue('20');
 await expect(page.locator('#tradePreview')).toBeHidden();
 await expect(page.locator('#message')).not.toContainText('Ship full');
 expect(await page.evaluate(()=>localStorage.getItem('voyage-trade-v1'))).toBe(saved);
 await page.locator('#qty').fill('10');await page.locator('#checkTrade').click();
 await expect(page.locator('#qtyError')).toBeHidden();
 await expect(page.locator('#tradePreview')).toContainText('金貨50枚');
 await page.locator('#tradePreview #accept').click();
 await expect(page.locator('#summary')).toContainText('金貨45枚');
 await expect(page.locator('#summary')).toContainText('積載 10 / 10');
 await page.reload();await expect(page.locator('#holding')).toContainText('コショウ 10');
});

test('TRADE-QUANTITY-002: small step buttons respect limits and discard a stale confirmation',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 const less=page.getByRole('button',{name:'数量を1減らす'}),more=page.getByRole('button',{name:'数量を1増やす'});
 await expect(less).toBeDisabled();
 await more.click();await expect(page.locator('#qty')).toHaveValue('2');
 await page.locator('#checkTrade').click();await expect(page.locator('#tradePreview')).toBeVisible();
 await more.click();await expect(page.locator('#qty')).toHaveValue('3');
 await expect(page.locator('#tradePreview')).toBeHidden();
 await less.click();await expect(page.locator('#qty')).toHaveValue('2');
 await page.locator('#qty').fill('10');await expect(more).toBeDisabled();
 await less.click();await expect(page.locator('#qty')).toHaveValue('9');
 await page.locator('#checkTrade').click();
 await page.locator('#qty').fill('8');await expect(page.locator('#tradePreview')).toBeHidden();
 for(const button of [less,more]){
  const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('TRADE-QUANTITY-003: limits update with cash, combined cargo and selected sell inventory',async({page})=>{
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 async function buy(good,qty){await page.locator('#good').selectOption(good);await page.locator('#qty').fill(String(qty));await page.locator('#checkTrade').click();await page.locator('#tradePreview #accept').click();}
 await buy('silk',9);
 await page.locator('#good').selectOption('glass');
 await expect(page.locator('#qtyHint')).toContainText('最大1個（積載の空き 1個');
 await page.locator('#qty').fill('1');await buy('glass',1);
 await expect(page.locator('#qtyHint')).toContainText('最大0個');
 await expect(page.locator('#qtyIncrease')).toBeDisabled();
 await page.locator('#kind').selectOption('sell');
 await expect(page.locator('#qtyHint')).toContainText('最大1個');
 await page.locator('#qty').fill('2');await page.locator('#checkTrade').click();
 await expect(page.locator('#qtyError')).toContainText('在庫は1個');
 await page.locator('#qty').fill('1');await page.locator('#checkTrade').click();await page.locator('#tradePreview #accept').click();
 await page.locator('#good').selectOption('silk');await expect(page.locator('#qtyHint')).toContainText('最大9個');
 await page.locator('#kind').selectOption('buy');
 await page.locator('#checkSail').click();await page.locator('#sailPreview #accept').click();
 await expect(page.locator('#qtyHint')).toContainText('最大0個（積載の空き 1個');
 await page.locator('#checkTrade').click();await expect(page.locator('#qtyError')).toContainText('現金が足りません');
 await expect(page.locator('#tradePreview')).toBeHidden();
});

test('TRADE-QUANTITY-004: empty, zero and fractional quantities have a nearby Japanese error',async({page})=>{
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 for(const value of ['', '0', '-1', '1.5']){
  await page.locator('#qty').fill(value);await page.locator('#checkTrade').click();
  await expect(page.locator('#qtyError')).toHaveText('数量は1以上の整数で入力してください。');
  await expect(page.locator('#qty')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#tradePreview')).toBeHidden();
 }
 await page.locator('#qtyIncrease').click();await expect(page.locator('#qty')).toHaveValue('1');
 await expect(page.locator('#qtyError')).toBeHidden();
});
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
 await expect(page.locator('#mapIllustration')).toHaveAttribute('href','./assets/trade-atlas.webp');
 const illustration=await page.request.get('/trade/assets/trade-atlas.webp');
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
  await expect(page.locator('#mapCurrentText')).toHaveText('現在地：'+name);
  await expect(page.locator('#shipFlag')).toHaveText('現在地');
  await expect(page.locator('#mapPortName')).toHaveText(name);
  const prices={venice:[9,10,5],alexandria:[5,8,8],constantinople:[8,6,10],barcelona:[12,11,8]};
  expect((await page.locator('#mapPortPrices dd').allTextContents()).map(text=>Number(text.replace(' 金貨','')))).toEqual(prices[id]);
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
  const mapText=await page.locator('#mapCurrentText').evaluate(el=>{const box=el.getBBox();return {x:box.x,y:box.y,right:box.x+box.width,bottom:box.y+box.height};});
  expect(mapText.x).toBeGreaterThanOrEqual(675);
  expect(mapText.right).toBeLessThanOrEqual(936);
  expect(mapText.y).toBeGreaterThanOrEqual(947);
  expect(mapText.bottom).toBeLessThanOrEqual(1002);
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

test('TRADE-UI-006: atlas zoom keeps the moving ship visible and restores overview',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto('/trade/');
 await page.getByRole('button',{name:'スキップ'}).click();
 await page.locator('#mapZoom').click();
 await expect(page.locator('#mapZoom')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#mapZoom')).toHaveText('全体を見る');
 expect(await page.locator('#mapViewport').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
 async function shipInsideScrollFrame(){
  const within=await page.evaluate(()=>{const f=document.querySelector('#mapViewport').getBoundingClientRect(),s=document.querySelector('#shipSprite').getBoundingClientRect();return s.left>=f.left&&s.right<=f.right&&s.top>=f.top&&s.bottom<=f.bottom;});
  expect(within).toBe(true);
 }
 await shipInsideScrollFrame();
 await page.locator('#checkSail').click();
 await page.locator('#sailPreview #accept').click();
 await expect(page.locator('#mapCurrentText')).toHaveText('現在地：アレクサンドリア');
 await shipInsideScrollFrame();
 await page.locator('#mapZoom').click();
 await expect(page.locator('#mapZoom')).toHaveAttribute('aria-pressed','false');
 expect(await page.locator('#mapViewport').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
