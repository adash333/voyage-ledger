import {test,expect} from '@playwright/test';
test('TRADE-EN-001: English trade preview, commit, journal and statements on mobile',async({page})=>{
 await page.goto('/trade/en/');
 await expect(page.getByRole('heading',{name:/Free Trading Mode/})).toBeVisible();
 await page.getByRole('button',{name:'Skip'}).click();
 await expect(page.locator('#prices tbody tr')).toHaveCount(4);
 await expect(page.locator('#prices tbody tr.current')).toContainText('Venice');
 await expect(page.locator('#mapLocation')).toContainText('Current port: Venice');
 await expect(page.locator('#mapIllustration')).toHaveAttribute('href','../assets/trade-atlas-en.webp?v=20261018-localized2');
 expect(await page.evaluate(async()=>{const image=new Image();image.src=document.querySelector('#mapIllustration').href.baseVal;await image.decode();return [image.naturalWidth,image.naturalHeight];})).toEqual([1536,1024]);
 await expect(page.locator('#portDots .port-dot')).toHaveCount(4);
 await expect(page.locator('#portDots .map-city')).toHaveText(['Venice','Alexandria','Constantinople','Barcelona']);
 await expect(page.locator('#routeSteps')).toContainText('Constantinople');
 await expect(page.locator('#mapCurrentText')).toHaveText('Now at: Venice');
 await expect(page.locator('#shipTitle')).toHaveText('Your ship at Venice');
 await expect(page.locator('#mapPortName')).toHaveText('Venice');
 await expect(page.locator('#mapPortPrices')).toContainText('Pepper');
 await expect(page.locator('#mapPortPrices .map-good-icon')).toHaveText(['🧺','🧵','🏺']);
 await expect(page.locator('#routeSteps [aria-current="location"]')).toContainText('Venice');
 await page.locator('#qty').fill('20');
 await page.locator('#checkTrade').click();
 await expect(page.locator('#qtyError')).toContainText('up to 10 units');
 await expect(page.locator('#tradePreview')).toBeHidden();
 await expect(page.locator('#qtyIncrease')).toBeDisabled();
 await expect(page.locator('#qtyHint')).toContainText('You can buy up to 10 now');
 await page.locator('#good').selectOption('glass');
 await page.locator('#qty').fill('3');
 await page.locator('#checkTrade').click();
 await expect(page.locator('#tradePreview')).toContainText('15 gold coins');
 await expect(page.locator('#tradePreview')).toContainText('Merchandise');
 await expect(page.locator('#tradePreview')).toContainText('Cash');
 await page.locator('#tradePreview #accept').click();
 await expect(page.locator('#summary')).toContainText('85 gold coins');
 await page.locator('#tab-journal').click();
 await expect(page.locator('#journal')).toContainText('Founding the company');
 await expect(page.locator('#journal')).toContainText('Capital');
 await expect(page.locator('#journal')).not.toContainText('現金');
 await page.locator('#tab-report').click();
 await expect(page.getByRole('heading',{name:/Income statement \(P\/L\)/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Balance sheet \(B\/S\)/})).toBeVisible();
 await expect(page.locator('.asset-side')).toContainText('Glassware (3 pieces)');
 await expect(page.locator('.asset-side')).toContainText('Total assets');
 await expect(page.locator('.equity-side')).toContainText('Capital (initial funds)');
 await expect(page.locator('.balance-check')).toContainText('Both sides match');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('TRADE-EN-004: English atlas tracks all ports in both directions and zooms around its own anchors',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/trade/en/');
 await page.getByRole('button',{name:'Skip'}).click();
 const ports=[['venice','Venice'],['alexandria','Alexandria'],['constantinople','Constantinople'],['barcelona','Barcelona']];
 for(let voyage=0;voyage<2;voyage++){
  const stops=voyage?[...ports].reverse():ports;
  for(let stop=0;stop<stops.length;stop++){
   const [id,name]=stops[stop];
   await expect(page.locator('#shipMarker')).toHaveAttribute('data-port',id);
   await expect(page.locator('#mapCurrentText')).toHaveText('Now at: '+name);
   await expect(page.locator('#routeSteps [aria-current="location"]')).toContainText(name);
   const dot=page.locator('[data-port="'+id+'"] .port-dot');
   const x=await dot.getAttribute('cx'),y=await dot.getAttribute('cy');
   await expect(page.locator('#shipMarker')).toHaveAttribute('transform','translate('+x+' '+y+')');
   const lines=await page.locator('#routeLine polyline').evaluateAll(lines=>lines.map(line=>[line.points[0].x,line.points[0].y,line.points[line.points.length-1].x,line.points[line.points.length-1].y]));
   const anchors=await page.locator('#portDots g').evaluateAll(ports=>Object.fromEntries(ports.map(port=>[port.dataset.port,[+port.querySelector('circle').getAttribute('cx'),+port.querySelector('circle').getAttribute('cy')]])));
   expect(anchors).toEqual({venice:[794,315],alexandria:[1038,744],constantinople:[1086,472],barcelona:[482,429]});
   expect(lines).toEqual(stops.slice(0,-1).map(([id],index)=>[...anchors[id],...anchors[stops[index+1][0]]]));
   await page.locator('#mapZoom').click();
   expect(await page.evaluate(()=>{const f=document.querySelector('#mapViewport').getBoundingClientRect(),s=document.querySelector('#shipSprite').getBoundingClientRect();return s.left>=f.left&&s.right<=f.right&&s.top>=f.top&&s.bottom<=f.bottom;})).toBe(true);
   await page.locator('#mapZoom').click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(stop<3){
    await page.locator('#checkSail').click();
    await page.locator('#sailPreview #cancel').click();
    await expect(page.locator('#shipMarker')).toHaveAttribute('data-port',id);
    await page.locator('#checkSail').click();
    await page.locator('#sailPreview #accept').click();
    await page.reload();
   }
  }
  if(voyage===0){page.once('dialog',dialog=>dialog.accept());await page.locator('#closeBtn').click();await page.locator('#continueBtn').click();}
 }
 expect(errors).toEqual([]);
});
test('TRADE-EN-002: English departure, fare, reload persistence and voyage closing',async({page})=>{
 await page.goto('/trade/en/');await page.getByRole('button',{name:'Skip'}).click();
 await page.locator('#checkSail').click();
 await expect(page.locator('#sailPreview')).toContainText('Voyage expenses');
 await page.locator('#sailPreview #accept').click();
 await expect(page.locator('#summary')).toContainText('Alexandria');
 await expect(page.locator('#summary')).toContainText('95 gold coins');
 await expect(page.locator('#mapCurrentText')).toHaveText('Now at: Alexandria');
 await expect(page.locator('#shipMarker')).toHaveAttribute('data-port','alexandria');
 await page.locator('#mapZoom').click();
 await expect(page.locator('#mapZoom')).toHaveText('Show whole map');
 await page.locator('#mapZoom').click();
 await expect(page.locator('#mapZoom')).toHaveText('Enlarge map text');
 await page.reload();
 await expect(page.locator('#summary')).toContainText('Alexandria');
 await expect(page.locator('#summary')).toContainText('95 gold coins');
 for(const port of ['Constantinople','Barcelona']){await page.locator('#checkSail').click();await page.locator('#sailPreview #accept').click();await expect(page.locator('#summary')).toContainText(port);}
 await expect(page.locator('#nextPort')).toContainText('final stop');
 page.once('dialog',d=>d.accept());
 await page.locator('#closeBtn').click();
 await expect(page.locator('#result')).toContainText('Profit this voyage');
 await expect(page.locator('#result')).toContainText('-15 gold coins');
 await page.locator('#continueBtn').click();
 await expect(page.locator('#summary')).toContainText('Voyage 2 · return');
 await expect(page.locator('#summary')).toContainText('Barcelona');
});
test('TRADE-EN-003: language links and shared save between Japanese and English pages',async({page})=>{
 await page.goto('/en/');
 await page.getByRole('link',{name:/Play Free Trading Mode/}).click();
 await expect(page).toHaveURL(/\/trade\/en\/$/);
 await page.getByRole('button',{name:'Skip'}).click();
 await page.locator('#good').selectOption('pepper');
 await page.locator('#qty').fill('2');
 await page.locator('#checkTrade').click();
 await page.locator('#tradePreview #accept').click();
 await expect(page.locator('#summary')).toContainText('82 gold coins');
 await page.getByRole('link',{name:/日本語版/}).click();
 await expect(page).toHaveURL(/\/trade\/$/);
 await expect(page.locator('#summary')).toContainText('金貨82枚');
 await expect(page.locator('#holding')).toContainText('コショウ 2');
 await page.getByRole('link',{name:'English version'}).click();
 await expect(page).toHaveURL(/\/trade\/en\/$/);
 await expect(page.locator('#holding')).toContainText('Pepper 2');
});
