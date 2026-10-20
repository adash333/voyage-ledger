import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
async function trade(page,kind,good,qty){
 await page.locator('#kind').selectOption(kind);await page.locator('#good').selectOption(good);await page.locator('#qty').fill(String(qty));
 await page.locator('#checkTrade').click();await page.locator('#tradePreview #accept').click();
}
async function sail(page){await page.locator('#checkSail').click();await page.locator('#sailPreview #accept').click();}
async function bestVoyage(page){ // SPEC-017 worked example: 824 coins of net profit on easy
 await trade(page,'buy','glass',98);await sail(page);await trade(page,'sell','glass',2);await sail(page);
 await trade(page,'sell','glass',96);await trade(page,'buy','pepper',100);await sail(page);await trade(page,'sell','pepper',100);
}
test('COMPANY-UI-001: found on easy, trade, close, repay, ranking and statements',async({page})=>{
 await page.goto('/trade/company/');
 await expect(page.locator('#setup')).toBeVisible();await page.locator('#setupEasy').click();
 await expect(page.locator('#summary')).toContainText('金貨500枚');await expect(page.locator('#summary')).toContainText('借入 金貨700枚');
 await bestVoyage(page);
 await expect(page.locator('#summary')).toContainText('金貨1,356枚');
 await page.locator('#tab-report').click();
 await expect(page.locator('#report')).toContainText('支払利息 金貨7枚 と減価償却費 金貨25枚');
 await expect(page.locator('#report')).toContainText('✓ 左右の合計は一致しています。');
 await page.locator('#tab-trade').click();
 await page.locator('#closeBtn').click();
 await expect(page.locator('#closePreview')).toContainText('今回の純利益は金貨824枚');
 await page.locator('#closePreview #accept').click();
 await expect(page.locator('#result')).toContainText('今回の純利益：金貨824枚');
 await expect(page.locator('#result')).toContainText('純資産 金貨1,124枚');
 await page.locator('#bankLink').click();
 await page.locator('#repayAmount').selectOption('700');await page.locator('#repayBtn').click();
 await expect(page.locator('#bankPreview')).toContainText('借入残高は金貨0枚');
 await page.locator('#bankPreview #accept').click();
 await expect(page.locator('#celebrate')).toContainText('全額返しました');
 await expect(page.locator('#summary')).toContainText('借入 金貨0枚');
 await page.locator('#tab-journal').click();
 await expect(page.locator('#journal')).toContainText('減価償却費');await expect(page.locator('#journal')).toContainText('支払利息');
 await page.locator('#tab-records').click();
 await expect(page.locator('#ranking')).toContainText('金貨824枚');await expect(page.locator('#ranking')).toContainText('🏅');
 await page.locator('[data-detail="1"]').click();
 await expect(page.locator('#rankingDetail')).toContainText('第1航海の決算');
 await page.locator('#continueBtn').click();
 await expect(page.locator('#summary')).toContainText('第2航海');
 await expect(page.locator('#summary')).toContainText('バルセロナ');
 expect(await noOverflow(page)).toBe(true);
});
test('COMPANY-UI-002: export, restart, import and continue; broken and free-mode files are refused',async({page})=>{
 await page.goto('/trade/company/');await page.locator('#setupEasy').click();
 await trade(page,'buy','silk',3);await sail(page);
 await expect(page.locator('#summary')).toContainText('金貨460枚');
 await page.locator('#tab-records').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSONをダウンロード'}).click()]);
 expect(download.suggestedFilename()).toMatch(/^company-ledger-\d{8}-\d{4}\.json$/);
 const path=await download.path();
 const data=JSON.parse(readFileSync(path,'utf8'));
 expect(data.app).toBe('voyage-ledger-company');expect(data.state.mode).toBe('company');expect(data.state.events).toHaveLength(2);
 const saved=await page.evaluate(()=>localStorage.getItem('voyage-company-v1'));
 const file=(name,body)=>({name,mimeType:'application/json',buffer:Buffer.from(body)});
 await page.locator('#importFile').setInputFiles(file('broken.json','{oops'));
 await expect(page.locator('#saveMessage')).toContainText('JSONファイルとして読み込めませんでした');
 await page.locator('#importFile').setInputFiles(file('trade.json',JSON.stringify({app:'voyage-ledger-trade',format:1,state:{version:1,voyage:1,stop:0,status:'active',events:[]}})));
 await expect(page.locator('#saveMessage')).toContainText('これは自由経営モード版のデータです');
 const forged=JSON.parse(saved);forged.events[0].price=1;
 await page.locator('#importFile').setInputFiles(file('forged.json',JSON.stringify({app:'voyage-ledger-company',format:1,state:forged})));
 await expect(page.locator('#saveMessage')).toContainText('形式が正しくありません');
 expect(await page.evaluate(()=>localStorage.getItem('voyage-company-v1'))).toBe(saved);
 page.once('dialog',d=>d.accept());await page.locator('#restartAnytime').click();
 await page.locator('#setupEasy').click();
 await expect(page.locator('#summary')).toContainText('金貨500枚');
 page.once('dialog',d=>{expect(d.message()).toContain('第1航海');d.accept();});
 await page.locator('#tab-records').click();
 await page.locator('#importFile').setInputFiles(path);
 await expect(page.locator('#saveMessage')).toContainText('読み込みました');
 await expect(page.locator('#summary')).toContainText('金貨460枚');await expect(page.locator('#summary')).toContainText('アレクサンドリア');
 await page.reload();
 await expect(page.locator('#summary')).toContainText('金貨460枚');
 await expect(page.locator('#holding')).toContainText('絹織物 3');
});
test('COMPANY-UI-003: 360px layout, hard mode switch, interest income and the free trading mode refuses the file',async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.goto('/trade/company/');await page.locator('#setupHard').click();
 await expect(page.locator('#summary')).toContainText('本気の社長');
 for(const t of ['fleet','journal','report','records','trade']){await page.locator('#tab-'+t).click();expect(await noOverflow(page),t).toBe(true);}
 await page.locator('#tab-fleet').click();
 await expect(page.locator('#loanFacts')).toContainText('金利は1航海 5%');await expect(page.locator('#loanFacts')).toContainText('受取利息');
 await page.locator('#tab-trade').click();
 for(let i=0;i<3;i++)await sail(page);
 await expect(page.locator('#summary')).toContainText('金貨410枚');
 await page.locator('#closeBtn').click();
 await expect(page.locator('#closePreview')).toContainText('受取利息金貨5枚');
 await page.locator('#closePreview #accept').click();
 await expect(page.locator('#result')).toContainText('＋ 受取利息金貨5枚');
 await page.locator('#tab-records').click();
 await expect(page.locator('#ranking')).toContainText('🔥');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSONをダウンロード'}).click()]);
 const path=await download.path();
 await page.goto('/trade/');await page.getByRole('button',{name:'スキップ'}).click();
 await page.locator('#importFile').setInputFiles(path);
 await expect(page.locator('#saveMessage')).toContainText('これは株式会社版のデータです');
 await expect(page.locator('#summary')).toContainText('金貨100枚');
});
test('COMPANY-UI-004: English page shares the engine and reads a Japanese save',async({page})=>{
 await page.goto('/trade/company/');await page.locator('#setupEasy').click();
 await trade(page,'buy','glass',10);
 await page.locator('#tab-records').click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSONをダウンロード'}).click()]);
 const path=await download.path();
 await page.goto('/trade/company/en/');
 await expect(page.locator('#summary')).toContainText('450 coins');
 await page.evaluate(()=>{localStorage.removeItem('voyage-company-v1');localStorage.removeItem('voyage-company-setup-v1');});await page.reload();
 await page.locator('#setupEasy').click();
 await expect(page.locator('#summary')).toContainText('500 coins');
 page.once('dialog',d=>d.accept());
 await page.locator('#tab-records').click();
 await page.locator('#importFile').setInputFiles(path);
 await expect(page.locator('#saveMessage')).toContainText('Loaded: continuing from voyage 1');
 await expect(page.locator('#summary')).toContainText('450 coins');
 await expect(page.locator('#holding')).toContainText('Glassware 10');
 await expect(page.getByRole('button',{name:'Download JSON',exact:true})).toBeVisible();
 const [englishDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download JSON',exact:true}).click()]);
 expect(englishDownload.suggestedFilename()).toMatch(/^company-ledger-.*\.json$/);
 expect(JSON.parse(readFileSync(await englishDownload.path(),'utf8')).app).toBe('voyage-ledger-company');
 await page.locator('#tab-fleet').click();
 await expect(page.locator('#shipBtn')).toBeDisabled();
 await expect(page.locator('#loanFacts')).toContainText('Loan balance 700 coins');
 await page.locator('#tab-report').click();
 await expect(page.locator('#report')).toContainText('Both sides match');
 expect(await noOverflow(page)).toBe(true);
});

test('COMPANY-MAP-EN: translated atlas keeps the Japanese port anchors and moves the ship after sailing and reload',async({page})=>{
 await page.goto('/trade/company/en/');await page.locator('#setupEasy').click();
 await expect(page.locator('#mapIllustration')).toHaveAttribute('href','../../assets/trade-atlas-en.webp?v=20261018-localized2');
 expect(await page.evaluate(async()=>{const image=new Image();image.src=document.querySelector('#mapIllustration').href.baseVal;await image.decode();return [image.naturalWidth,image.naturalHeight];})).toEqual([1536,1024]);
 const ports=[['venice','Venice',794,315],['alexandria','Alexandria',1038,744],['constantinople','Constantinople',1086,472],['barcelona','Barcelona',482,429]];
 for(let i=0;i<ports.length;i++){
  const [id,name,x,y]=ports[i];
  await expect(page.locator('#shipMarker')).toHaveAttribute('data-port',id);
  await expect(page.locator('#shipMarker')).toHaveAttribute('transform',`translate(${x} ${y})`);
  await expect(page.locator('#mapCurrentText')).toHaveText('Now at: '+name);
  await page.locator('#mapZoom').click();
  expect(await page.evaluate(()=>{const f=document.querySelector('#mapViewport').getBoundingClientRect(),s=document.querySelector('#shipSprite').getBoundingClientRect();return s.left>=f.left&&s.right<=f.right&&s.top>=f.top&&s.bottom<=f.bottom;})).toBe(true);
  await page.locator('#mapZoom').click();
  if(i<3){await sail(page);await page.reload();}
 }
 expect(await noOverflow(page)).toBe(true);
});
