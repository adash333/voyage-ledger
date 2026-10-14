import {test,expect} from '@playwright/test';
test('SPEC-REPORT-001 mobile: financial statements and interactive ledger',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/大航海商人アカデミー/})).toBeVisible();
 await page.getByRole('button',{name:/商会を設立/}).click();
 await expect(page.locator('#tradeVisual')).toContainText('商品（コショウ）');
 await page.getByRole('button',{name:/仕入れる/}).click();
 await page.getByRole('button',{name:/売る/}).click();
 await expect(page.locator('#profitCard')).toContainText('30金貨');
 await expect(page.locator('#report')).toContainText('130金貨');
 await page.locator('#ledger tr[data-i="1"]').click();
 await expect(page.locator('#entryExplain')).toContainText('コショウ10袋');
 await expect(page.locator('#priceResult')).toContainText('30金貨');
 await page.locator('#salePrice').fill('5');
 await expect(page.locator('#priceResult')).toContainText('-10金貨');
 await expect(page.locator('#profit')).toContainText('30枚');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(overflow).toBe(false);
});
test('SPEC-SAVE-001 mobile: progress survives reload',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/商会を設立/}).click();
 await page.reload();
 await expect(page.locator('#cash')).toContainText('100枚');
 await expect(page.getByRole('button',{name:/仕入れる/})).toBeVisible();
});