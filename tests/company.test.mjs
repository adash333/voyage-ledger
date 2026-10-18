import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../trade/company/accounting.mjs';
import {exportSave,parseSave,SAVE_APP} from '../trade/company/save.mjs';
import {parseSave as parseTradeSave} from '../trade/save.mjs';
const {initialState,commit,preview,report,nextVoyage,restore,canSpecialClose,canDefault,route,PORTS,GOODS}=C;
let n=0;
const act=(s,a)=>commit(s,{...a,id:'t'+(++n)});
const buy=(s,good,qty)=>act(s,{kind:'buy',good,qty});
const sell=(s,good,qty)=>act(s,{kind:'sell',good,qty});
const sail=s=>act(s,{kind:'sail'});
const close=(s,at)=>act(s,at?{kind:'close',at}:{kind:'close'});
const priceAt=(id,good)=>PORTS.find(p=>p.id===id).prices[good];
function sellAll(s){const r=report(s);for(const g of GOODS)if(r.inventory[g].qty)s=sell(s,g,r.inventory[g].qty);return s;}
function buyBest(s){
 const r=report(s),here=C.portAt(s).id,next=route(s.voyage)[s.stop+1];
 const best=GOODS.map(g=>({g,gain:priceAt(next,g)-priceAt(here,g)})).sort((a,b)=>b.gain-a.gain)[0];
 if(best.gain<=0)return s;
 const price=priceAt(here,best.g),qty=Math.min(r.capacity-r.load,Math.floor((r.cash-r.fare)/price));
 return qty>0?buy(s,best.g,qty):s;
}
function autoVoyage(s){while(s.stop<3){s=sellAll(s);s=buyBest(s);s=sail(s);}return close(sellAll(s));}
function buyWorst(s){
 const r=report(s),here=C.portAt(s).id,next=route(s.voyage)[s.stop+1];
 const worst=GOODS.map(g=>({g,gain:priceAt(next,g)-priceAt(here,g)})).sort((a,b)=>a.gain-b.gain)[0];
 const price=priceAt(here,worst.g),qty=Math.min(r.capacity-r.load,Math.floor((r.cash-r.fare)/price));
 return qty>0?buy(s,worst.g,qty):s;
}
function autoLose(s){ // trade badly until the fare can no longer be paid
 for(let guard=0;guard<60;guard++){
  if(s.stop===3){s=close(sellAll(s));s=nextVoyage(s);continue;}
  s=sellAll(s);if(canSpecialClose(s))return s;
  s=buyWorst(s);s=sail(s);
 }
 throw new Error('never ran out of money');
}
function spec1Voyage(){ // the voyage described in SPEC-017 §4 of the review: 824 profit on easy
 let s=initialState();
 s=buy(s,'glass',98);s=sail(s);s=sell(s,'glass',2);s=sail(s);s=sell(s,'glass',96);s=buy(s,'pepper',100);s=sail(s);s=sell(s,'pepper',100);
 return s;
}
const cumProfit=r=>r.totals.profit;

test('COMPANY-1: opening balance sheet, difficulty stored, one-way switch only at voyage start',()=>{
 const s=initialState(),r=report(s);
 assert.equal(r.cash,500);assert.equal(r.shipsCost,500);assert.equal(r.loan,700);assert.equal(r.capital,300);
 assert.equal(r.assets,1000);assert.equal(r.liabilities+r.equity,1000);assert.equal(r.equity,300);
 assert.equal(r.capacity,100);assert.equal(r.fare,10);assert.equal(r.difficulty,'easy');assert.equal(r.founderRatio,100);
 assert.equal(r.journal.length,3);assert.deepEqual(r.journal.map(j=>j.voyage),[0,0,0]);
 assert.equal(report(initialState('hard')).fare,30);
 assert.throws(()=>initialState('insane'),/Invalid difficulty/);
 // switch at voyage start only, and never back
 let h=act(s,{kind:'difficulty',value:'hard'});
 assert.equal(h.difficulty,'hard');assert.equal(report(h).fare,30);assert.equal(report(h).founding,'easy');
 assert.throws(()=>act(h,{kind:'difficulty',value:'easy'}),/Cannot switch|Switch only/);
 assert.throws(()=>act(h,{kind:'difficulty',value:'hard'}),/Cannot switch|Switch only/);
 assert.throws(()=>act(nextVoyage(autoVoyage(h)),{kind:'difficulty',value:'easy'}),/Cannot switch/);
 const mid=buy(s,'glass',1);
 assert.throws(()=>act(mid,{kind:'difficulty',value:'hard'}),/Switch only at voyage start/);
 let v2=nextVoyage(autoVoyage(s));
 v2=act(v2,{kind:'difficulty',value:'hard'});
 assert.equal(report(v2).perVoyage[1].difficulty,'easy');assert.equal(report(v2).perVoyage[2].difficulty,'hard');
 assert.throws(()=>restore({...h,difficulty:'easy'}),/Invalid progression|Invalid difficulty/);
});
test('COMPANY-2: capacity 100 per ship, selling frees space, extra ship raises capacity and fare at once',()=>{
 let s=nextVoyage(close(spec1Voyage())); // 1,349 coins at Barcelona
 s=buy(s,'pepper',100);
 assert.throws(()=>buy(s,'pepper',1),/Ship full/);
 s=sell(s,'pepper',10);s=buy(s,'silk',10);assert.equal(report(s).load,100);
 assert.throws(()=>buy(s,'glass',1),/Ship full/);
 let t=initialState();
 assert.equal(preview(t,{kind:'ship'}).afterCapacity,200);
 t=act(t,{kind:'ship'});
 const r=report(t);
 assert.equal(r.cash,0);assert.equal(r.capacity,200);assert.equal(r.ships.length,2);assert.equal(r.fare,20);assert.equal(r.shipsCost,1000);
 assert.equal(r.journal.at(-1).debit,'ships');assert.equal(r.currentFlow.inv,-500);
 assert.throws(()=>act(t,{kind:'ship'}),/Insufficient cash/);
 assert.throws(()=>sail(t),/Insufficient fare/);
});
test('COMPANY-3: interest 7 on easy, 35 + deposit 5 on hard, repayment is not an expense, interest recalculated',()=>{
 let s=spec1Voyage();
 assert.equal(report(s).cash,1356);
 const p=preview(s,{kind:'close'});
 assert.equal(p.interestDue,7);assert.equal(p.depreciation,25);assert.equal(p.deposit,0);assert.equal(p.profit,824);
 s=close(s,'2026-10-18T09:00:00Z');
 let r=report(s);
 assert.equal(r.current.sales,2176);assert.equal(r.current.cost,1290);assert.equal(r.current.fares,30);
 assert.equal(r.current.profit,824);assert.equal(r.equity,1124);assert.equal(r.cash,1349);assert.equal(r.accDep,25);
 assert.throws(()=>act(s,{kind:'repay',amount:30}),/units of 50|Invalid nonnegative/);
 assert.throws(()=>act(s,{kind:'repay',amount:750}),/Exceeds loan/);
 s=act(s,{kind:'repay',amount:50});
 r=report(s);
 assert.equal(r.loan,650);assert.equal(r.cash,1299);assert.equal(r.equity,1124,'repayment leaves equity unchanged');
 assert.equal(r.journal.at(-1).debit,'loan');
 s=nextVoyage(s);
 assert.equal(report(s).closing.interestDue,7,'650 x 1% rounds up to 7');
 // hard mode numbers
 let h=initialState('hard');
 assert.equal(report(h).closing.interestDue,35);assert.equal(report(h).closing.deposit,5);assert.equal(report(h).fare,30);
 for(let i=0;i<3;i++)h=sail(h);
 assert.equal(report(h).cash,410);
 const hp=preview(h,{kind:'close'});
 assert.equal(hp.deposit,5);assert.equal(hp.interestDue,35);assert.equal(hp.profit,-90-35+5-25);
 h=close(h);
 const hr=report(h);
 assert.equal(hr.cash,380);assert.equal(hr.current.deposit,5);assert.equal(hr.journal.some(j=>j.credit==='depositInterest'),true);
 assert.equal(hr.cumulativeFlow.op,-90-35+5);
});
test('COMPANY-4: unpaid interest is accrued, settled first next voyage, blocks issuing and dividends',()=>{
 let s=initialState();
 s=buy(s,'glass',98);s=sail(s);s=sell(s,'glass',2);s=sail(s);s=sell(s,'glass',1);s=sail(s);
 assert.equal(report(s).cash,6);
 const p=preview(s,{kind:'close'});
 assert.equal(p.interestPaid,false);assert.equal(p.accruedAfter,7);
 s=close(s);
 let r=report(s);
 assert.equal(r.accrued,7);assert.equal(r.liabilities,707);assert.equal(r.journal.at(-1).credit,'accrued');assert.equal(r.unlocked,false);
 assert.equal(r.assets,r.liabilities+r.equity);
 s=nextVoyage(s);s=sell(s,'glass',95);
 assert.equal(report(s).cash,6+760);
 s=autoVoyage(s);
 r=report(s);
 assert.equal(r.accrued,0);
 const kinds=r.journal.filter(j=>j.voyage===2).map(j=>j.kind);
 assert.ok(kinds.indexOf('accruedPaid')<kinds.indexOf('interest'),'accrued interest settled before current interest');
 assert.equal(r.perVoyage[2].interest,7);
});
test('COMPANY-5: depreciation starts next voyage for new ships, stops at book value 0, fare scales with ships',()=>{
 let s=spec1Voyage();s=close(s);s=nextVoyage(s);
 s=act(s,{kind:'ship'});
 let r=report(s);
 assert.equal(r.closing.depreciation,25,'ship bought this voyage is not depreciated yet');
 assert.equal(r.fare,20);
 s=sail(s);assert.equal(report(s).current.fares,20);
 s=autoVoyage(s);
 r=report(s);assert.equal(r.current.depreciation,25);assert.equal(r.accDep,50);
 s=nextVoyage(s);
 assert.equal(report(s).closing.depreciation,50);
 assert.equal(report(s).ships[1].bookValue,500);assert.equal(report(s).ships[0].bookValue,450);
 // 20 voyages of depreciation exhaust the first ship
 let t=initialState();
 for(let v=1;v<=21;v++){t=autoVoyage(t);if(v===1)t=act(t,{kind:'repay',amount:700});if(v<21)t=nextVoyage(t);}
 const tr=report(t);
 assert.equal(tr.ships[0].bookValue,0);assert.equal(tr.accDep,500);assert.equal(tr.perVoyage[21].depreciation,0);
 assert.equal(tr.closedCount,21);
});
test('COMPANY-6: share unlock, issue price, surplus, founder cap, dividends and founder payout',()=>{
 let s=initialState();
 s=autoVoyage(s);
 assert.equal(report(s).unlocked,false);
 assert.throws(()=>act(s,{kind:'issue',shares:50}),/Shares locked/);
 for(let v=2;v<=3;v++){s=nextVoyage(s);s=autoVoyage(s);}
 let r=report(s);
 assert.equal(r.closedCount,3);assert.ok(r.equity>=600);assert.equal(r.unlocked,true);
 const price=Math.ceil(r.equity/300),p=preview(s,{kind:'issue',shares:100});
 assert.equal(p.price,price);assert.equal(p.capital,100);assert.equal(p.surplus,(price-1)*100);assert.equal(p.founderRatio,75);
 assert.throws(()=>act(s,{kind:'issue',shares:70}),/50 or 100/);
 const before=r;
 s=act(s,{kind:'issue',shares:100});
 r=report(s);
 assert.equal(r.capital,400);assert.equal(r.surplus,(price-1)*100);assert.equal(r.cash,before.cash+price*100);
 assert.equal(r.totalShares,400);assert.equal(r.founderRatio,75);assert.equal(r.retained,before.retained,'issuing is not income');
 assert.equal(r.currentFlow.fin,price*100-0);
 s=act(s,{kind:'issue',shares:100});s=act(s,{kind:'issue',shares:100});
 assert.equal(report(s).outside,300);assert.equal(report(s).founderRatio,50);
 assert.throws(()=>act(s,{kind:'issue',shares:50}),/keep 50%/);
 // dividends: per share, capped by retained earnings and cash
 r=report(s);
 const d=preview(s,{kind:'dividend',perShare:2});
 assert.equal(d.total,1200);assert.equal(d.founder,600);assert.equal(d.outside,600);
 assert.throws(()=>act(s,{kind:'dividend',perShare:Math.floor(r.retained/600)+1}),/Exceeds retained earnings|Insufficient cash/);
 s=act(s,{kind:'dividend',perShare:2});
 const after=report(s);
 assert.equal(after.retained,r.retained-1200);assert.equal(after.cash,r.cash-1200);assert.equal(after.founderDividends,600);assert.equal(after.dividends,1200);
 assert.equal(after.equity,r.equity-1200);assert.equal(after.assets,after.liabilities+after.equity);
 assert.equal(after.journal.at(-1).debit,'retained');
});
test('COMPANY-7: closing order, mid-voyage statements show no interest, issue price follows step-4 equity',()=>{
 let s=spec1Voyage();
 let r=report(s);
 assert.equal(r.current.interest,0);assert.equal(r.current.depreciation,0);assert.equal(r.closing.interestDue,7);
 assert.throws(()=>act(s,{kind:'repay',amount:50}),/not closed/);
 assert.throws(()=>act(s,{kind:'issue',shares:50}),/not closed/);
 assert.throws(()=>act(s,{kind:'exit'}),/Exit not available/);
 s=close(s);
 assert.throws(()=>buy(s,'glass',1),/closed/);
 assert.throws(()=>close(s),/Cannot close yet|closed/);
 for(let v=2;v<=3;v++){s=nextVoyage(s);s=autoVoyage(s);}
 const p1=preview(s,{kind:'issue',shares:50}).price;
 s=act(s,{kind:'dividend',perShare:3});
 const p2=preview(s,{kind:'issue',shares:50}).price;
 assert.ok(p2<=p1,'dividend lowers equity and therefore the issue price');
 assert.equal(report(s).ranking[0].bs.equity,report(s).equity+900,'ranking snapshot is taken at closing, before step 4');
});
test('COMPANY-8: statements, FIFO across lots, balance and cash-flow identities hold after every event',()=>{
 let s=initialState();
 s=buy(s,'pepper',20);s=sail(s);s=buy(s,'pepper',20);s=sell(s,'pepper',30);
 let r=report(s);
 assert.equal(r.current.cost,20*9+10*5);assert.equal(r.inventory.pepper.cost,50);assert.equal(r.inventory.pepper.qty,10);
 assert.equal(r.assets,r.liabilities+r.equity);
 s=sail(s);s=sell(s,'pepper',10);s=sail(s);s=close(s);
 r=report(s);
 assert.equal(r.assets,r.liabilities+r.equity);
 assert.equal(r.cumulativeFlow.op+r.cumulativeFlow.inv+r.cumulativeFlow.fin,r.cash);
 assert.equal(r.flows[0].fin,1000);assert.equal(r.flows[0].inv,-500);
 assert.equal(r.journal.every(j=>C.ACCOUNTS.includes(j.debit)&&C.ACCOUNTS.includes(j.credit)&&j.amount>0),true);
 assert.deepEqual(Object.keys(r.perVoyage),['1']);
});
test('COMPANY-9: ranking by profit then margin, ties share a rank, special closings are recorded',()=>{
 let s=initialState();
 s=autoVoyage(s);s=nextVoyage(s);
 for(let i=0;i<3;i++)s=sail(s);s=close(s); // a voyage with fares and interest only: loss
 s=nextVoyage(s);for(let i=0;i<3;i++)s=sail(s);s=close(s);
 const r=report(s);
 assert.equal(r.ranking[0].voyage,1);assert.equal(r.ranking[0].rank,1);
 assert.equal(r.ranking[1].rank,2);assert.equal(r.ranking[2].rank,2,'identical losses share rank 2');
 assert.ok(r.ranking[1].profit<0);assert.equal(r.ranking[1].margin,null);
 assert.equal(r.ranking.length,3);
 // special closing when the fare cannot be paid even after selling everything
 let t=initialState();t=buy(t,'glass',100);
 assert.equal(canSpecialClose(t),false,'inventory could still cover the fare');
 assert.throws(()=>act(t,{kind:'special'}),/Cannot close yet/);
 let w=autoLose(initialState());
 const wr=report(w);
 assert.ok(wr.cash<wr.fare&&wr.cash+wr.liquidation<wr.fare);assert.ok(w.stop<3);
 const sp=preview(w,{kind:'special'});
 assert.equal(sp.special,true);assert.equal(sp.interestPaid,false,'no cash left for interest');
 w=act(w,{kind:'special'});
 const after=report(w);
 assert.equal(w.status,'special');assert.equal(after.specialReason,'fare');assert.equal(after.accrued,7);
 assert.equal(after.ranking.some(x=>x.special&&x.voyage===w.voyage),true);
 assert.ok(after.ranking.find(x=>x.voyage===w.voyage).profit<0);
 assert.throws(()=>nextVoyage(w),/not closed/);
 assert.throws(()=>act(w,{kind:'repay',amount:50}),/not closed/);
 assert.deepEqual(restore(w),w);
});
test('COMPANY-10: loan deadline at voyage 10 — sell first, repay, default when hopeless',()=>{
 let s=initialState();
 for(let v=1;v<=9;v++){s=autoVoyage(s);if(v===1)s=act(s,{kind:'repay',amount:650});if(v===9){const r=report(s);s=act(s,{kind:'dividend',perShare:Math.floor((r.cash-100)/300)});}s=nextVoyage(s);}
 let r=report(s);
 assert.equal(s.voyage,10);assert.equal(r.loan,50);assert.ok(r.cash>=100&&r.cash<400);
 for(let i=0;i<3;i++)s=sail(s);
 r=report(s);
 const last=C.portAt(s);
 const qty=Math.min(100,Math.floor(r.cash/last.prices.glass)-2);
 s=buy(s,'glass',qty);
 r=report(s);
 assert.ok(r.cash<50+1&&r.cash+r.liquidation>=51);
 assert.throws(()=>close(s),/Sell inventory first/);
 s=sell(s,'glass',qty);
 s=close(s);
 r=report(s);assert.equal(canDefault(s),false);
 assert.throws(()=>nextVoyage(s),/Loan due/);
 s=act(s,{kind:'repay',amount:50});
 s=nextVoyage(s);assert.equal(s.voyage,11);assert.equal(report(s).loan,0);assert.equal(report(s).closing.interestDue,0);
 // hopeless: sail through ten voyages without trading, then default
 let d=initialState();
 for(let v=1;v<=10;v++){for(let i=0;i<3;i++)d=sail(d);d=close(d);if(v<10)d=nextVoyage(d);}
 const dr=report(d);
 assert.equal(dr.cash,500-10*37);assert.equal(canDefault(d),true);
 assert.throws(()=>nextVoyage(d),/Loan due/);
 assert.throws(()=>restore({...d,voyage:11,stop:0,status:'active'}),/Loan due/);
 d=act(d,{kind:'default'});
 assert.equal(d.status,'special');assert.equal(report(d).specialReason,'deadline');assert.equal(report(d).ranking.find(x=>x.voyage===10).defaulted,true);
 assert.throws(()=>act(d,{kind:'repay',amount:50}),/not closed/);
});
test('COMPANY-11: exit only on hard after 3 hard and 5 total voyages with no debt; no journal entry',()=>{
 let e=initialState();
 for(let v=1;v<=5;v++){e=autoVoyage(e);if(v===1)e=act(e,{kind:'repay',amount:700});if(v<5)e=nextVoyage(e);}
 assert.equal(report(e).canExit,false,'easy mode never exits');assert.equal(report(e).exitQuote,null);
 let s=initialState('hard');
 for(let v=1;v<=4;v++){s=autoVoyage(s);if(v===1)s=act(s,{kind:'repay',amount:700});s=nextVoyage(s);}
 s=autoVoyage(s);
 let r=report(s);
 assert.equal(r.closedCount,5);assert.equal(r.hardClosed,5);assert.equal(r.loan,0);assert.equal(r.canExit,true);
 const last3=r.closed.slice(-3),avg=Math.floor(last3.reduce((a,c)=>a+c.profit,0)/3);
 assert.equal(r.exitQuote.avgProfit,avg);assert.equal(r.exitQuote.value,r.equity+avg*5);
 assert.equal(r.exitQuote.price,Math.floor(r.exitQuote.value/300));assert.equal(r.exitQuote.proceeds,r.exitQuote.price*300);
 // dilution: outside shares lower the founder's take
 const undiluted=r.exitQuote.proceeds;
 s=act(s,{kind:'issue',shares:100});
 r=report(s);
 assert.ok(r.exitQuote.proceeds<undiluted+r.exitQuote.price*0+1);
 assert.equal(r.exitQuote.undiluted>=r.exitQuote.proceeds,true);
 const journalLength=r.journal.length,cash=r.cash;
 s=act(s,{kind:'exit'});
 r=report(s);
 assert.equal(s.status,'exited');assert.equal(r.journal.length,journalLength,'exit is not a company transaction');assert.equal(r.cash,cash);
 assert.equal(r.exit.proceeds,r.exit.price*300);assert.equal(r.exit.voyage,5);
 assert.throws(()=>nextVoyage(s),/not closed/);
 assert.throws(()=>act(s,{kind:'repay',amount:50}),/not closed/);
 // a late switch to hard needs 3 hard voyages
 let m=initialState();
 for(let v=1;v<=4;v++){m=autoVoyage(m);if(v===1)m=act(m,{kind:'repay',amount:700});m=nextVoyage(m);}
 m=act(m,{kind:'difficulty',value:'hard'});m=autoVoyage(m);
 assert.equal(report(m).closedCount,5);assert.equal(report(m).hardClosed,1);assert.equal(report(m).canExit,false);
 assert.throws(()=>act(m,{kind:'exit'}),/Exit not available/);
});
test('COMPANY-12: idempotent commits, previews do not mutate, tampering and foreign files are rejected',()=>{
 let s=initialState();
 const before=JSON.stringify(s);
 preview(s,{kind:'buy',good:'glass',qty:3});preview(s,{kind:'ship'});preview(s,{kind:'sail'});
 assert.equal(JSON.stringify(s),before);
 s=commit(s,{id:'same',kind:'buy',good:'glass',qty:3});
 assert.deepEqual(commit(s,{id:'same',kind:'buy',good:'glass',qty:3}),s);
 assert.throws(()=>commit(s,{kind:'sail'}),/Invalid id/);
 const forged=structuredClone(s);forged.events[0].price=1;
 assert.throws(()=>restore(forged),/Tampered event/);
 const skipped=structuredClone(s);skipped.voyage=2;
 assert.throws(()=>restore(skipped),/Invalid progression|not closed/);
 assert.throws(()=>restore({...s,mode:'trade'}),/Invalid state/);
 // save file round trip
 const {filename,json}=exportSave(s,new Date(2026,9,18,9,5));
 assert.equal(filename,'company-ledger-20261018-0905.json');
 const data=JSON.parse(json);
 assert.equal(data.app,SAVE_APP);assert.equal(data.format,1);assert.equal(data.state.mode,'company');
 assert.deepEqual(parseSave(json),s);
 assert.deepEqual(parseSave(JSON.stringify(s)),s,'bare state is accepted');
 assert.throws(()=>parseSave('{oops'),/Not JSON/);
 assert.throws(()=>parseSave(JSON.stringify({app:'voyage-ledger-trade',format:1,state:{version:1,voyage:1,stop:0,status:'active',events:[]}})),/Not a save file/);
 assert.throws(()=>parseSave(JSON.stringify({version:1,voyage:1,stop:0,status:'active',events:[]})),/Not a save file/);
 assert.throws(()=>parseSave(JSON.stringify({app:SAVE_APP,format:2,state:s})),/Unsupported format/);
 assert.throws(()=>parseSave(JSON.stringify({app:SAVE_APP,format:1,state:forged})),/Tampered event/);
 // and the free trading mode refuses the company file
 assert.throws(()=>parseTradeSave(json),/Not a save file/);
 assert.throws(()=>parseTradeSave(JSON.stringify(s)));
 // a save taken in the middle of the decision screen restores too
 let d=spec1Voyage();d=close(d,'2026-10-18T10:00:00Z');d=act(d,{kind:'repay',amount:100});
 assert.deepEqual(parseSave(exportSave(d).json),d);
 assert.equal(report(parseSave(exportSave(d).json)).ranking[0].at,'2026-10-18T10:00:00Z');
});
