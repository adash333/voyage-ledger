import {test,expect} from '@playwright/test';
import {initialState as companyState} from '../../trade/company/accounting.mjs';
import {initialState as tradeState} from '../../trade/accounting.mjs';
import {exportSave as companySave} from '../../trade/company/save.mjs';
import {exportSave as tradeSave} from '../../trade/save.mjs';

for(const language of ['ja','en']){
 for(const company of [true,false]){
  test(`MODE-SAVE: ${language} ${company?'company':'free trading'} explains wrong-mode uploads without replacing progress`,async({page})=>{
   const en=language==='en';
   const route='/trade/'+(company?'company/':'')+(en?'en/':'');
   await page.goto(route);
   if(company)await page.locator('#setupEasy').click();
   else await page.locator('#guideSkip').click();
   if(company){
    for(const tab of ['trade','fleet','journal','report','records']){
     await page.locator('#tab-'+tab).click();
     await expect(page.getByRole('button',{name:en?'Download JSON':'JSONをダウンロード',exact:true})).toBeVisible();
     await expect(page.getByRole('button',{name:en?'Upload JSON to continue':'JSONをアップロードして続きから',exact:true})).toBeVisible();
    }
    await page.locator('#tab-trade').click();
   }
   await page.locator('#good').selectOption('glass');
   await page.locator('#qty').fill('2');
   await page.locator('#checkTrade').click();
   await page.locator('#tradePreview #accept').click();
   const summary=await page.locator('#summary').innerText();
   const saves=await page.evaluate(()=>[localStorage.getItem('voyage-company-v1'),localStorage.getItem('voyage-trade-v1')]);
   const wrongState=company?tradeState():companyState();
   const wrongJson=company?tradeSave(wrongState).json:companySave(wrongState).json;
   let dialogs=0;
   page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
   for(const json of [wrongJson,JSON.stringify(wrongState)]){
    const file={name:'other-mode.json',mimeType:'application/json',buffer:Buffer.from(json)};
    if(company){
     const chooserPromise=page.waitForEvent('filechooser');
     await page.locator('#importBtn').click();
     await (await chooserPromise).setFiles(file);
    }else await page.locator('#importFile').setInputFiles(file);
    const message=company?(en?'this is Free Trading Mode data.':'これは自由経営モード版のデータです。'):(en?'This is Company Mode data.':'これは株式会社版のデータです。');
    await expect(page.locator('#saveMessage')).toBeVisible();
    await expect(page.locator('#saveMessage')).toContainText(message);
    await expect(page.locator('#saveMessage')).toHaveClass(/error/);
    expect(await page.locator('#summary').innerText()).toBe(summary);
    expect(await page.evaluate(()=>[localStorage.getItem('voyage-company-v1'),localStorage.getItem('voyage-trade-v1')])).toEqual(saves);
   }
   expect(dialogs).toBe(0);
  });
 }
}
