import {test,expect} from '@playwright/test';
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
test('LEARN-UI-001: furigana toggle persists, interactions change the numbers, quiz gives feedback',async({page})=>{
 await page.goto('/learn/');
 expect(await page.locator('main rt').count()).toBeGreaterThan(50);
 await expect(page.locator('main rt').first()).toBeVisible();
 await page.locator('#rubyToggle').click();
 await expect(page.locator('#rubyToggle')).toHaveText('ふりがな：なし');
 await expect(page.locator('main rt').first()).toBeHidden();
 await page.reload();
 await expect(page.locator('#rubyToggle')).toHaveText('ふりがな：なし');
 await page.locator('#rubyToggle').click();
 await expect(page.locator('main rt').first()).toBeVisible();
 // step 1
 await page.locator('#buyBtn').click();
 await expect(page.locator('#entryLeft')).toContainText('金貨60枚');await expect(page.locator('#entryCheck')).toContainText('✓');
 await page.locator('#sellBtn').click();
 await expect(page.locator('#entryRight')).toContainText('売上');await expect(page.locator('#entryRight')).toContainText('金貨150枚');
 // step 2
 await page.locator('[data-act="borrow"]').click();await page.locator('[data-act="ship"]').click();
 await expect(page.locator('#panLeft')).toHaveText('200');await expect(page.locator('#panRight')).toHaveText('200');
 await expect(page.locator('#balanceLeft')).toContainText('船');
 // step 3
 await page.locator('#soldRange').fill('4');
 await expect(page.locator('#soldLabel')).toHaveText('4');
 await expect(page.locator('#profitBox')).toContainText('金貨12枚');await expect(page.locator('#chestBox')).toContainText('金貨112枚');
 // step 4
 for(let i=0;i<3;i++)await page.locator('#voyageBtn').click();
 await expect(page.locator('#bookValue')).toHaveText('425');await expect(page.locator('#wearTotal')).toHaveText('75');
 // step 5
 await page.locator('#loanBtn').click();await expect(page.locator('#financeBox')).toContainText('利息');
 await page.locator('#shareBtn').click();await expect(page.locator('#financeBox')).toContainText('配当');
 // glossary and quiz
 expect(await page.locator('[data-card]').count()).toBe(10);
 await page.locator('[data-card="0"]').click();await expect(page.locator('[data-card="0"]')).toHaveClass(/flipped/);
 await page.locator('[data-quiz="0"] [data-choice="1"]').click();await expect(page.locator('[data-quiz="0"] .feedback')).toContainText('おしい');
 await page.locator('[data-quiz="0"] [data-choice="0"]').click();await expect(page.locator('[data-quiz="0"] .feedback')).toContainText('せいかい');
 await expect(page.locator('.next a[href="../trade/company/"]')).toBeVisible();
 expect(await noOverflow(page)).toBe(true);
});
test('LEARN-UI-002: 360px layout and the home page link right after the kids game',async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await page.goto('/learn/');
 expect(await noOverflow(page)).toBe(true);
 await page.locator('#soldRange').fill('10');
 await expect(page.locator('#profitNote')).toContainText('もうけ30');
 expect(await noOverflow(page)).toBe(true);
 await page.goto('/');
 const headings=await page.locator('.related-games h2').allTextContents();
 const kids=headings.findIndex(h=>h.includes('ていがくねん')),learn=headings.findIndex(h=>h.includes('かいけいの きほん'));
 expect(learn).toBe(kids+1);
 await page.locator('a[href="./learn/"]').click();
 await expect(page).toHaveURL(/\/learn\/$/);
});
