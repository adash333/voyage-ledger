import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTS,GOODS,route,initialState,preview,commit,report,closeVoyage,nextVoyage,restore,canSpecialClose} from '../trade/accounting.mjs';
const buy=(s,id,good,qty)=>commit(s,{id,kind:'buy',good,qty});
const sell=(s,id,good,qty)=>commit(s,{id,kind:'sell',good,qty});
const sail=(s,id)=>commit(s,{id,kind:'sail'});
test('TRADE-PRICE: 4 ports, three goods, alternating route, Barcelona',()=>{
 assert.equal(PORTS.length,4);assert.deepEqual(GOODS,['pepper','silk','glass']);
 assert.deepEqual(PORTS.map(x=>x.prices.pepper),[9,5,8,12]);
 assert.deepEqual(PORTS.map(x=>x.prices.silk),[10,8,6,11]);
 assert.deepEqual(PORTS.map(x=>x.prices.glass),[5,8,10,8]);
 assert.deepEqual(route(2),route(1).toReversed());
});
test('TRADE-ENTRY: 100 initial capital, buy 10 glass, sail, sell and balance',()=>{
 let s=initialState();
 assert.equal(report(s).cash,100);
 s=buy(s,'b1','glass',10);assert.equal(report(s).cash,50);
 s=sail(s,'s1');assert.equal(report(s).cash,45);
 s=sell(s,'x1','glass',10);
 const r=report(s);
 assert.equal(r.cash,125);assert.equal(r.assets,125);assert.equal(r.profit,25);
 assert.equal(r.current.sales,80);assert.equal(r.current.cost,50);assert.equal(r.current.fares,5);
 assert.equal(r.balanced,true);
 assert.equal(r.journal.filter(x=>x.debit==='売上原価').length,1);
});
test('TRADE-CAPACITY: 10 combined, reject 11, selling frees slots',()=>{
 let s=buy(initialState(),'a','glass',8);
 s=buy(s,'b','silk',2);
 assert.throws(()=>buy(s,'c','pepper',1),/Ship full/);
 s=sell(s,'d','glass',3);s=buy(s,'e','pepper',3);
 assert.equal(report(s).load,10);
 assert.throws(()=>buy(s,'f','pepper',1),/Ship full/);
});
test('TRADE-FIFO: multiple lots across ports and inventory valuation',()=>{
 let s=initialState();
 s=buy(s,'a','pepper',2);s=sail(s,'s1');
 s=buy(s,'b','pepper',2);s=sell(s,'c','pepper',3);
 const r=report(s);
 assert.equal(r.current.sales,15);assert.equal(r.current.cost,23);
 assert.equal(r.inventory.pepper.qty,1);assert.equal(r.inventory.pepper.cost,5);
 assert.equal(r.profit,-13);assert.equal(r.assets,87);
});
test('TRADE-PREVIEW: no mutation, idempotent trade and sailing',()=>{
 let s=initialState();const before=JSON.stringify(s);
 preview(s,{kind:'buy',good:'glass',qty:2});
 preview(s,{kind:'sail'});
 assert.equal(JSON.stringify(s),before);
 s=buy(s,'same','glass',2);
 assert.deepEqual(buy(s,'same','glass',2),s);
 s=sail(s,'leg1');assert.deepEqual(sail(s,'leg1'),s);
 assert.equal(report(s).fares,5);
});
test('TRADE-ROUTE: three legs, close, carry over and reverse',()=>{
 let s=initialState();
 for(let i=0;i<3;i++)s=sail(s,'out'+i);
 assert.equal(s.stop,3);assert.equal(report(s).fares,15);
 assert.throws(()=>sail(s,'extra'),/Last port/);
 s=closeVoyage(s);s=nextVoyage(s);
 assert.equal(s.voyage,2);assert.equal(s.stop,0);
 assert.equal(report(s).cash,85);assert.equal(report(s).capital,100);
 for(let i=0;i<3;i++)s=sail(s,'back'+i);
 assert.equal(report(s).fares,30);
 assert.equal(report(s).current.fares,15);
 assert.equal(report(s).assets,70);
});
test('TRADE-CLOSE: last-port inventory stays an asset',()=>{
 let s=buy(initialState(),'buy','glass',2);
 for(let i=0;i<3;i++)s=sail(s,'s'+i);
 s=closeVoyage(s);
 assert.equal(report(s).inventory.glass.cost,10);
 assert.equal(report(s).assets,85);
 assert.equal(report(s).profit,-15);
 assert.equal(s.status,'closed');
});
test('TRADE-VALIDATE: negative, decimal, missing funds, missing stock',()=>{
 let s=initialState();
 for(const q of [0,-1,1.5,NaN,Infinity])assert.throws(()=>buy(s,'x','glass',q));
 assert.throws(()=>sell(s,'y','glass',1),/Insufficient inventory/);
 assert.throws(()=>buy(s,'z','silk',11));
 assert.equal(canSpecialClose(s),false);
});
test('TRADE-SAVE: restore validates event history and rejects tampering',()=>{
 let s=buy(initialState(),'a','glass',2);
 assert.deepEqual(restore(s),s);
 const tampered=structuredClone(s);tampered.events[0].price=1;
 assert.throws(()=>restore(tampered));
});

test('TRADE-CARRYOVER: FIFO lots survive the next voyage and restore',()=>{
 let s=buy(initialState(),'glass','glass',2);
 for(let i=0;i<3;i++)s=sail(s,'o'+i);
 s=nextVoyage(closeVoyage(s));
 assert.deepEqual(restore(s),s);
 assert.equal(s.voyage,2);
 assert.equal(report(s).inventory.glass.cost,10);
 s=sell(s,'sold','glass',1);
 assert.equal(report(s).current.sales,8);
 assert.equal(report(s).current.cost,5);
 assert.equal(report(s).current.profit,3);
 assert.equal(report(s).inventory.glass.cost,5);
 assert.deepEqual(restore(s),s);
});
test('TRADE-ENTRY: sale preview includes two balanced journal entries',()=>{
 let s=buy(initialState(),'buy','glass',2);
 const p=preview(s,{kind:'sell',good:'glass',qty:1});
 assert.deepEqual(p.entries,[{debit:'現金',credit:'売上',amount:5},{debit:'売上原価',credit:'商品',amount:5}]);
 assert.equal(report(s).sales,0);
});

import {exportSave,parseSave,SAVE_APP} from '../trade/save.mjs';
test('TRADE-SAVE-JSON: export wraps a verified state and import restores it',()=>{
 let s=initialState();s=buy(s,'e1','glass',3);s=sail(s,'e2');
 const {filename,json}=exportSave(s,new Date(2026,9,17,9,5));
 assert.equal(filename,'voyage-trade-20261017-0905.json');
 const data=JSON.parse(json);
 assert.equal(data.app,SAVE_APP);assert.equal(data.format,1);
 assert.deepEqual(data.state,s);
 assert.deepEqual(parseSave(json),s);
 assert.deepEqual(parseSave(JSON.stringify(s)),s); // a raw state object is accepted too
 assert.equal(report(parseSave(json)).cash,80);
});
test('TRADE-SAVE-JSON: invalid, foreign and tampered files are rejected',()=>{
 assert.throws(()=>parseSave('{not json'),/Not JSON/);
 assert.throws(()=>parseSave('"text"'),/Not a save file/);
 assert.throws(()=>parseSave(JSON.stringify({app:'other',state:initialState()})),/Not a save file/);
 assert.throws(()=>parseSave(JSON.stringify({app:SAVE_APP,format:1})),/Not a save file/);
 let s=initialState();s=buy(s,'e1','glass',3);
 const forged={...s,events:[{...s.events[0],price:1}]};
 assert.throws(()=>parseSave(JSON.stringify({app:SAVE_APP,format:1,state:forged})),/Tampered/);
 assert.throws(()=>exportSave(forged),/Tampered/);
});
