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
 await expect(page.locator('#report')).toContainText('総資産');
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
