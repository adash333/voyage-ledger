import {test, expect} from '@playwright/test';
import {questions} from '../../quiz/en/questions.mjs';

async function fitsScreen(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function complete(page, answerFor) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await expect(page.locator('#progress')).toHaveText(`Question ${i + 1} of 10`);
    await expect(page.locator('#next')).toBeDisabled();
    await expect(page.locator('#feedback')).toBeHidden();
    await expect(page.locator('#journalLeft')).toHaveText(q.left);
    await expect(page.locator('#journalRight')).toHaveText(q.right);
    const buttons = page.locator('#answers button');
    await expect(buttons).toHaveCount(3);
    for (const button of await buttons.all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(48);
    }
    await fitsScreen(page);
    const answer = answerFor(q, i);
    await buttons.nth(answer).click();
    await expect(buttons.nth(answer)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', {name: 'Check answer →', exact: true}).click();
    await expect(page.locator('#feedback')).toContainText(answer === q.answer ? 'Correct!' : 'Not quite.');
    await expect(page.locator('#feedback')).toContainText(q.why);
    for (const button of await buttons.all()) await expect(button).toBeDisabled();
    await fitsScreen(page);
    await page.locator('#next').click();
  }
  await expect(page.locator('#questionPanel')).toBeHidden();
  await expect(page.locator('#result')).toBeVisible();
  await fitsScreen(page);
}

test('SPEC-QUIZ-EN-002 English history and homepage lead to English quiz', async ({page}) => {
  await page.goto('/history/en/');
  const historyLink = page.getByRole('link', {name: '🏆 Merchant Challenge', exact: true});
  await expect(historyLink).toHaveAttribute('href', '../../quiz/en/');
  await expect(page.getByRole('link', {name: /Merchant Challenge \(Japanese\)/})).toHaveCount(0);
  await historyLink.click();
  await expect(page).toHaveURL(/\/quiz\/en\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {name: /Age of Discovery Merchant Challenge/})).toBeVisible();
  await page.getByRole('link', {name: '← Back to Merchant Academy'}).click();
  await expect(page).toHaveURL(/\/en\/$/);
  const homeLink = page.getByRole('link', {name: /Try the Merchant Challenge/});
  expect(await homeLink.evaluate(el => el.getBoundingClientRect().top > document.querySelector('#report').getBoundingClientRect().top)).toBe(true);
  await homeLink.click();
  await expect(page).toHaveURL(/\/quiz\/en\/$/);
  await page.getByRole('link', {name: /Read The History of Bookkeeping/}).click();
  await expect(page).toHaveURL(/\/history\/en\/$/);
  await historyLink.click();
  await page.getByRole('link', {name: '日本語版 / Japanese'}).click();
  await expect(page).toHaveURL(/\/quiz\/$/);
  await expect(page.getByRole('heading', {name: /大航海時代の商人チャレンジ/})).toBeVisible();
});

for (const width of [320, 360, 390]) {
  test(`SPEC-QUIZ-EN-003 all ten questions, explanations and results fit ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 780});
    await page.goto('/quiz/en/');
    await complete(page, q => q.answer);
    await expect(page.locator('#score')).toHaveText('100 / 100 points');
    await expect(page.locator('#review')).toContainText('10 of 10 correct');
    await page.getByRole('button', {name: /Try again/}).click();
    await expect(page.locator('#progress')).toHaveText('Question 1 of 10');
    await expect(page.locator('#result')).toBeHidden();
    await expect(page.locator('#feedback')).toBeHidden();
    await expect(page.locator('#next')).toBeDisabled();
    await expect(page.locator('#answers [aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('#question')).toBeFocused();
  });
}

test('SPEC-QUIZ-EN-001 wrong answers and retry do not retain the previous score', async ({page}) => {
  await page.goto('/quiz/en/');
  await complete(page, (q, i) => i < 5 ? q.answer : (q.answer + 1) % 3);
  await expect(page.locator('#score')).toHaveText('50 / 100 points');
  await expect(page.locator('#review')).toContainText('5 of 10 correct');
  await page.getByRole('button', {name: /Try again/}).click();
  await complete(page, q => (q.answer + 1) % 3);
  await expect(page.locator('#score')).toHaveText('0 / 100 points');
  await expect(page.locator('#review')).toContainText('0 of 10 correct');
});

test('SPEC-QUIZ-EN-003 keyboard selection can change before checking, then locks', async ({page}) => {
  await page.goto('/quiz/en/');
  const buttons = page.locator('#answers button');
  await buttons.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(buttons.nth(0)).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toContainText('Correct!');
  await expect(buttons.nth(1)).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(page.locator('#progress')).toHaveText('Question 2 of 10');
  await expect(page.locator('#question')).toBeFocused();
});
