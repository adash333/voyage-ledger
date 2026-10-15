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
 await expect(page.locator('#profit')).toContainText('金貨30枚');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(overflow).toBe(false);
});
test('SPEC-SAVE-001 mobile: progress survives reload',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/商会を設立/}).click();
 await page.reload();
 await expect(page.locator('#cash')).toContainText('金貨100枚');
 await expect(page.getByRole('button',{name:/仕入れる/})).toBeVisible();
});
test('SPEC-REPORT-002 mobile: title and stat values stay on one line',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/');
 const singleLine=async(selector)=>page.locator(selector).evaluate(el=>{const rect=el.getBoundingClientRect();const style=getComputedStyle(el);return rect.height<=parseFloat(style.lineHeight)*1.55});
 expect(await singleLine('header h1 .title-name')).toBe(true);
 await page.getByRole('button',{name:/商会を設立/}).click();
 await page.getByRole('button',{name:/仕入れる/}).click();
 expect(await singleLine('#stock')).toBe(true);
 expect(await singleLine('#cash')).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('SPEC-REPORT-003 mobile: currency units and separate inventory lines',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/');
 await page.getByRole('button',{name:/商会を設立/}).click();
 await page.getByRole('button',{name:/仕入れる/}).click();
 await expect(page.locator('#cash')).toHaveText('金貨40枚');
 await expect(page.locator('#stock')).toHaveText('10袋');
 await expect(page.locator('#stockValue')).toHaveText('（金貨60枚分）');
 const separate=await page.evaluate(()=>document.querySelector('#stockValue').getBoundingClientRect().top>=document.querySelector('#stock').getBoundingClientRect().bottom);
 expect(separate).toBe(true);
 await page.getByRole('button',{name:/売る/}).click();
 await expect(page.locator('#cash')).toHaveText('金貨130枚');
 await expect(page.locator('#profit')).toHaveText('金貨30枚');
});

test('SPEC-LEMON-001 mobile lemonade page navigation and accounting',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/レモネード屋さんの複式簿記も遊んでみよう/}).click();
 await expect(page).toHaveURL(/\/lemonade\//);
 await expect(page.locator('#equality')).toContainText('500円');
 await page.getByRole('button',{name:/STEP 4/}).click();
 await expect(page.locator('#equality')).toContainText('1,600円');
 await expect(page.locator('#lesson')).toContainText('600円');
 await page.getByRole('button',{name:/STEP 5/}).click();
 await expect(page.locator('#equality')).toContainText('1,100円');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('SPEC-I18N-001 English merchant and lemonade pages work on mobile',async({page})=>{
 await page.goto('/en/');
 await expect(page.getByRole('heading',{name:/Merchant Academy/})).toBeVisible();
 await page.getByRole('button',{name:/Invest 100 gold coins/}).click();
 await page.getByRole('button',{name:/Buy 10 bags/}).click();
 await page.getByRole('button',{name:/Sell 10 bags/}).click();
 await expect(page.locator('#profit')).toContainText('30 coins');
 await page.getByRole('link',{name:/Lemonade Stand lesson/}).click();
 await expect(page).toHaveURL(/\/lemonade\/en\//);
 await expect(page.locator('#equality')).toContainText('500');
 await page.getByRole('button',{name:/STEP 5/}).click();
 await expect(page.locator('#equality')).toContainText('1,100');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-NAV-001 related game link is below main learning sections',async({page})=>{
 await page.goto('/');
 const link=page.getByRole('link',{name:/レモネード屋さんの複式簿記も遊んでみよう/});
 await expect(link).toBeVisible();
 const positions=await page.evaluate(()=>({link:document.querySelector('.related-games').getBoundingClientRect().top,report:document.querySelector('#report').getBoundingClientRect().top}));
 expect(positions.link).toBeGreaterThan(positions.report);
 await expect(page.getByRole('link',{name:/English version/}).first()).toHaveAttribute('href','./en/');
});

test('SPEC-KIDS-001 both easy Japanese versions work on mobile',async({page})=>{
 await page.goto('/kids/');
 await expect(page.getByRole('heading',{name:/こしょうやさん/})).toBeVisible();
 await page.getByRole('button',{name:/100まいを いれる/}).click();
 await page.getByRole('button',{name:/こしょうを かう/}).click();
 await page.getByRole('button',{name:/こしょうを うる/}).click();
 await expect(page.locator('#profit')).toContainText('30まい');
 await page.goto('/lemonade/kids/');
 await expect(page.getByRole('heading',{name:/れもねーどやさん/})).toBeVisible();
 for(let i=0;i<4;i++)await page.locator('#nextTop').click();
 await expect(page.locator('#cash')).toContainText('1100えん');
 await expect(page.locator('#profit')).toContainText('600えん');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-KIDS-002 top and bottom navigation stay in sync',async({page})=>{
 await page.goto('/lemonade/kids/');
 await expect(page.locator('#counterTop')).toHaveText('1 / 5');
 await expect(page.locator('#prevTop')).toBeDisabled();
 await page.locator('#nextTop').click();
 await expect(page.locator('#counter')).toHaveText('2 / 5');
 await page.locator('#next').click();
 await expect(page.locator('#counterTop')).toHaveText('3 / 5');
 await page.locator('#prevTop').click();
 await expect(page.locator('#counter')).toHaveText('2 / 5');
 for(let n=0;n<3;n++)await page.locator('#nextTop').click();
 await expect(page.locator('#nextTop')).toBeDisabled();
 await expect(page.locator('#next')).toBeDisabled();
});
test('SPEC-QUIZ-001 mobile: ten answers give 100 points and retry resets',async({page})=>{
 await page.goto('/quiz/');
 await expect(page.getByRole('heading',{name:/大航海時代の商人チャレンジ/})).toBeVisible();
 const answers=[1,0,2,1,0,2,1,0,2,1];
 for(let i=0;i<10;i++){
  await expect(page.locator('#next')).toBeDisabled();
  await expect(page.locator('#journalLeft')).not.toBeEmpty();
  expect(await page.locator('#journalLeft, #journalRight').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('（？）')]));
  await page.locator('#answers button').nth(answers[i]).click();
  await page.locator('#next').click();
  await expect(page.locator('#feedback')).toContainText('せいかい');
  await page.locator('#next').click();
 }
 await expect(page.locator('#score')).toHaveText('100 / 100てん');
 await page.locator('#retry').click();
 await expect(page.locator('#progress')).toContainText('だい 1もん');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-HISTORY-001 reading page opens from homepage and has five chapters',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/お金持ちになるために、なぜ簿記を学ぶの/}).click();
 await expect(page).toHaveURL(/\/history\//);
 await expect(page.getByRole('heading',{name:/帳簿の世界史/})).toBeVisible();
 for(let i=1;i<=5;i++)await expect(page.getByText('第'+i+'章', {exact:false})).toBeVisible();
 await expect(page.getByRole('link',{name:/YouTube/})).toHaveAttribute('href','https://youtu.be/T6j6C49bsss');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-HISTORY-002 six chapter illustrations are visible on mobile',async({page})=>{
 await page.goto('/history/');
 const art=page.locator('figure.chapter-art');
 await expect(art).toHaveCount(6);
 for(let i=0;i<6;i++){
  await art.nth(i).scrollIntoViewIfNeeded();
  await expect(art.nth(i).locator('svg')).toBeVisible();
  await expect(art.nth(i)).toHaveAttribute('aria-label',/.+/);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-LEMON-QUIZ-001 full-score mobile quiz',async({page})=>{
 await page.goto('/lemonade/');
 await page.getByRole('link',{name:/クイズにちょうせんする/}).click();
 await expect(page).toHaveURL(/\/lemonade\/quiz\//);
 await expect(page.getByRole('heading',{name:/レモネード屋さんの商人チャレンジ/})).toBeVisible();
 const answers=[1,2,0,2,1,0,1,0,2,1];
 for(const answer of answers){
  await expect(page.locator('#journalLeft')).not.toBeEmpty();
  await page.locator('#answers button').nth(answer).click();
  await page.locator('#next').click();
  await expect(page.locator('#feedback')).toContainText('せいかい');
  await page.locator('#next').click();
 }
 await expect(page.locator('#score')).toHaveText('100 / 100てん');
 await page.locator('#retry').click();
 await expect(page.locator('#progress')).toContainText('だい 1もん');
});
test('SPEC-HISTORY-003 chapter six describes financial statements',async({page})=>{
 await page.goto('/history/');
 await expect(page.getByRole('heading',{name:/会社の健康診断書を読もう/})).toBeVisible();
 await expect(page.getByText(/就職先を調べるとき/)).toBeVisible();
 await expect(page.getByText(/個別株を買ったり売ったりするとき/)).toBeVisible();
});
test('SPEC-HISTORY-EN-001 English history includes six illustrated chapters and language links',async({page})=>{
 await page.goto('/history/');
 await page.locator('a[href="./en/"]').filter({hasText:/English Version/i}).click();
 await expect(page).toHaveURL(/\/history\/en\//);
 await expect(page.getByRole('heading',{name:/The History of Bookkeeping/})).toBeVisible();
 await expect(page.locator('figure.chapter-art')).toHaveCount(6);
 for(let i=1;i<=6;i++)await expect(page.getByText('Chapter '+i+' ·',{exact:false})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Financial Statements: A Health Check/})).toBeVisible();
 await page.locator('a[href="../"]').filter({hasText:'日本語版 / Japanese'}).click();
 await expect(page).toHaveURL(/\/history\//);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-HISTORY-INTRO-001 introductory illustration appears in Japanese and English',async({page})=>{
 for(const route of ['/history/','/history/en/']){
  await page.goto(route);
  const art=page.locator('figure.intro-art');
  await expect(art).toHaveCount(1);
  await expect(art.locator('svg')).toBeVisible();
  await expect(art).toHaveAttribute('aria-label',/.+/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test('SPEC-SAVE-UI-001 JSON file controls are hidden from Japanese merchant page',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#export')).toHaveCount(0);
 await expect(page.locator('#import')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'最初から遊ぶ'})).toBeVisible();
});
test('SPEC-HERO-001 compact mobile nautical header and English link',async({page})=>{
 await page.goto('/');
 const hero=page.locator('header.hero');
 await expect(hero.getByRole('heading',{name:/大航海商人アカデミー/})).toBeVisible();
 await expect(hero.locator('.hero-ship')).toBeVisible();
 await expect(hero.getByRole('link',{name:/English version/i})).toHaveAttribute('href','./en/');
 const size=await hero.boundingBox();
 expect(size.height).toBeLessThan(240);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('SPEC-HISTORY-PEPPER-001 illustrated pepper trade balances on mobile in both languages',async({page})=>{
 for(const route of ['/history/','/history/en/']){
  await page.goto(route);
  await expect(page.locator('.pepper-trade-item')).toHaveCount(2);
  await expect(page.locator('.pepper-entry')).toHaveCount(2);
  await expect(page.locator('.pepper-equal')).toContainText('60');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test('SPEC-HISTORY-DATES-001 historical years appear in both languages',async({page})=>{
 await page.goto('/history/');
 for(const year of ['1429','1464','1494','1557','1575','1596','1781','2001','2008'])await expect(page.locator('body')).toContainText(year);
 await page.goto('/history/en/');
 for(const year of ['1429','1464','1494','1557','1575','1596','1781','2001','2008'])await expect(page.locator('body')).toContainText(year);
});