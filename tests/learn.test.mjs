import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rubyHTML,plainText,bareKanji,purchaseEntries,entriesBalanced,balanceAfter,profitFor,shipWear,financingCompare,GLOSSARY,QUIZ,SHIP_LIFE} from '../learn/content.mjs';
test('LEARN-1: every kanji in the page and the content data carries a reading',()=>{
 const html=readFileSync(new URL('../learn/index.html',import.meta.url),'utf8');
 const body=html.slice(html.indexOf('<main>'),html.indexOf('</main>')).replace(/<[^>]+>/g,' ');
 assert.deepEqual(bareKanji(body),[],'page text has kanji without furigana');
 const strings=[...GLOSSARY.flatMap(g=>[g.term,g.kid]),...QUIZ.flatMap(q=>[q.q,q.why,...q.choices]),...purchaseEntries().flatMap(e=>[e.label,e.left.account,e.right.account,e.note])];
 for(const s of strings)assert.deepEqual(bareKanji(s),[],s);
 assert.equal(rubyHTML('金貨{きんか}60枚{まい}'),'<ruby>金貨<rt>きんか</rt></ruby>60<ruby>枚<rt>まい</rt></ruby>');
 assert.equal(plainText('船{ふね}を買{か}う'),'船を買う');
});
test('LEARN-2: the purchase and sale entries balance; the chest always balances',()=>{
 const e=purchaseEntries();
 assert.equal(e.length,2);assert.equal(entriesBalanced(e),true);
 assert.equal(e[0].left.amount,60);assert.equal(e[1].right.amount,90);
 const start=balanceAfter([]);
 assert.deepEqual([start.cash,start.own,start.left,start.right],[100,100,100,100]);
 const b=balanceAfter(['borrow','ship','goods']);
 assert.deepEqual([b.cash,b.ship,b.goods,b.loan,b.own],[50,100,50,100,100]);assert.equal(b.left,b.right);
 const poor=balanceAfter(['ship','ship']);
 assert.equal(poor.ship,100,'a second ship is skipped when cash is short');assert.equal(poor.left,poor.right);
 assert.throws(()=>balanceAfter(['steal']),/Unknown action/);
});
test('LEARN-3: profit follows bags sold, cash and profit differ, assets never drop',()=>{
 const none=profitFor(0);
 assert.deepEqual([none.sales,none.cogs,none.profit,none.cash,none.goodsValue,none.assets],[0,0,0,40,60,100]);
 const some=profitFor(4);
 assert.deepEqual([some.sales,some.cogs,some.profit,some.cash,some.goodsLeft,some.assets],[36,24,12,76,6,112]);
 assert.equal(some.cashChange,-24,'cash is below the start even though there is a profit');
 const all=profitFor(10);
 assert.deepEqual([all.profit,all.cash,all.goodsLeft,all.assets],[30,130,0,130]);
 for(let n=0;n<=10;n++)assert.equal(profitFor(n).assets,100+profitFor(n).profit);
 assert.throws(()=>profitFor(11),/0\.\.10/);assert.throws(()=>profitFor(-1),RangeError);
});
test('LEARN-4: depreciation 25 per voyage, 20 voyages to zero, never negative',()=>{
 assert.deepEqual(shipWear(0),{voyages:0,bookValue:500,totalExpense:0,expenseThisVoyage:0});
 assert.deepEqual(shipWear(3),{voyages:3,bookValue:425,totalExpense:75,expenseThisVoyage:25});
 assert.equal(shipWear(SHIP_LIFE).bookValue,0);assert.equal(shipWear(SHIP_LIFE).totalExpense,500);
 assert.throws(()=>shipWear(21),RangeError);
 const f=financingCompare();
 assert.equal(f.loan.interest,5);assert.equal(f.loan.total,105);assert.equal(f.shares.repay,0);assert.equal(f.shares.mine+f.shares.partner,50);
});
test('LEARN-5: ten glossary cards and three quizzes with valid answers',()=>{
 assert.equal(GLOSSARY.length,10);
 for(const g of GLOSSARY){assert.ok(g.term&&g.kid);}
 assert.equal(QUIZ.length,3);
 for(const q of QUIZ){assert.equal(q.choices.length,2);assert.ok(q.answer>=0&&q.answer<q.choices.length);assert.ok(q.why.length>5);}
});
