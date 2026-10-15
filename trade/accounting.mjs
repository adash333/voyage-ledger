// SPEC-TRADE-IMPLEMENTATION-v1: pure, deterministic trading/accounting engine.
// No DOM, browser storage, or changes to existing lessons.
export const PORTS = Object.freeze([
  Object.freeze({id:'venice',name:'ヴェネツィア',prices:Object.freeze({pepper:9,silk:10,glass:5})}),
  Object.freeze({id:'alexandria',name:'アレクサンドリア',prices:Object.freeze({pepper:5,silk:8,glass:8})}),
  Object.freeze({id:'constantinople',name:'コンスタンティノープル',prices:Object.freeze({pepper:8,silk:6,glass:10})}),
  Object.freeze({id:'barcelona',name:'バルセロナ',prices:Object.freeze({pepper:12,silk:11,glass:8})})
]);
export const GOODS=Object.freeze(['pepper','silk','glass']);
export const CAPACITY=10, FARE=5, CAPITAL=100;
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
function requireInt(n,min=0){if(!integer(n,min))throw new RangeError('Invalid nonnegative integer');}
function safe(n){if(!Number.isSafeInteger(n))throw new RangeError('Unsafe amount');return n;}
function clone(s){return structuredClone(s);}
function assertState(s){if(!s||s.version!==1||!Array.isArray(s.events)||!integer(s.voyage,1)||!integer(s.stop)||s.stop>3||!['active','closed','special'].includes(s.status))throw new Error('Invalid state');}
export const route=(voyage)=>{requireInt(voyage,1);return voyage%2?PORTS.map(p=>p.id):PORTS.map(p=>p.id).reverse();};
export const portAt=(s)=>{assertState(s);return PORTS.find(p=>p.id===route(s.voyage)[s.stop]);};
export const initialState=()=>({version:1,voyage:1,stop:0,status:'active',events:[]});
function reduce(s){
  assertState(s);
  let cash=CAPITAL, lots=Object.fromEntries(GOODS.map(g=>[g,[]])), sales=0,cost=0,fares=0;
  const perVoyage={};const journal=[{debit:'現金',credit:'資本金',amount:CAPITAL,voyage:0}];
  for(const e of s.events){
    const v=perVoyage[e.voyage]??(perVoyage[e.voyage]={sales:0,cost:0,fares:0});
    if(e.kind==='buy'){
      const amount=safe(e.qty*e.price);cash=safe(cash-amount);
      lots[e.good].push({qty:e.qty,unitCost:e.price,port:e.port});
      journal.push({debit:'商品',credit:'現金',amount,voyage:e.voyage,good:e.good});
    }else if(e.kind==='sell'){
      const amount=safe(e.qty*e.price);cash=safe(cash+amount);sales=safe(sales+amount);v.sales=safe(v.sales+amount);
      let left=e.qty, c=0;
      for(const lot of lots[e.good]){const q=Math.min(left,lot.qty);lot.qty-=q;left-=q;c=safe(c+q*lot.unitCost);if(!left)break;}
      if(left)throw new Error('Inventory shortage');
      lots[e.good]=lots[e.good].filter(x=>x.qty);
      cost=safe(cost+c);v.cost=safe(v.cost+c);
      journal.push({debit:'現金',credit:'売上',amount,voyage:e.voyage,good:e.good},{debit:'売上原価',credit:'商品',amount:c,voyage:e.voyage,good:e.good});
    }else if(e.kind==='sail'){
      cash=safe(cash-FARE);fares=safe(fares+FARE);v.fares=safe(v.fares+FARE);
      journal.push({debit:'航海費',credit:'現金',amount:FARE,voyage:e.voyage});
    }
    if(cash<0)throw new Error('Negative cash');
  }
  const inventory=Object.fromEntries(GOODS.map(g=>[g,{qty:lots[g].reduce((a,l)=>a+l.qty,0),cost:lots[g].reduce((a,l)=>safe(a+l.qty*l.unitCost),0)}]));
  const load=GOODS.reduce((a,g)=>a+inventory[g].qty,0),inventoryCost=GOODS.reduce((a,g)=>safe(a+inventory[g].cost),0);
  const profit=safe(sales-cost-fares),assets=safe(cash+inventoryCost),current=perVoyage[s.voyage]??{sales:0,cost:0,fares:0};
  const debit=journal.reduce((a,j)=>safe(a+j.amount),0),credit=debit;
  if(load>CAPACITY||assets!==safe(CAPITAL+profit))throw new Error('Unbalanced state');
  return {cash,lots,inventory,load,sales,cost,fares,profit,assets,capital:CAPITAL,perVoyage,current:{...current,profit:current.sales-current.cost-current.fares},journal,debit,credit,balanced:true};
}
export const report=(s)=>clone(reduce(s));
function verifyHistory(s){
  assertState(s);
  let prior=initialState();
  for(const e of s.events){
    if(!e||typeof e.id!=='string'||!e.id||prior.events.some(x=>x.id===e.id))throw new Error('Invalid event id');
    if(e.voyage===prior.voyage+1 && prior.stop===3){
      prior=nextVoyage(closeVoyage(prior));
    }
    if(e.voyage!==prior.voyage)throw new Error('Invalid event voyage');
    const action=e.kind==='sail'?{kind:'sail',id:e.id}:{kind:e.kind,id:e.id,good:e.good,qty:e.qty};
    const next=commit(prior,action);
    if(JSON.stringify(next.events.at(-1))!==JSON.stringify(e))throw new Error('Tampered event');
    prior=next;
  }
  if(s.voyage===prior.voyage+1&&prior.stop===3)prior=nextVoyage(closeVoyage(prior));
  if(prior.voyage!==s.voyage||prior.stop!==s.stop)throw new Error('Invalid progression');
  if(s.status==='closed'&&prior.stop!==3)throw new Error('Invalid close');
  if(s.status==='special'&&!canSpecialClose(prior))throw new Error('Invalid special close');
  return true;
}
export function preview(s,action){
  assertState(s);if(s.status!=='active')throw new Error('Voyage is closed');
  const r=reduce(s),port=portAt(s);
  if(action.kind==='sail'){
    if(s.stop===3)throw new Error('Last port');
    if(r.cash<FARE)throw new Error('Insufficient fare');
    return {kind:'sail',port:port.id,nextPort:route(s.voyage)[s.stop+1],amount:FARE,afterCash:r.cash-FARE,entries:[{debit:'航海費',credit:'現金',amount:FARE}]};
  }
  if(!['buy','sell'].includes(action.kind)||!GOODS.includes(action.good))throw new Error('Invalid trade');
  requireInt(action.qty,1);
  const price=port.prices[action.good],amount=safe(price*action.qty);
  if(action.kind==='buy'){
    if(amount>r.cash)throw new Error('Insufficient cash');
    if(r.load+action.qty>CAPACITY)throw new Error('Ship full');
    return {kind:'buy',port:port.id,good:action.good,qty:action.qty,price,amount,afterCash:r.cash-amount,afterLoad:r.load+action.qty,entries:[{debit:'商品',credit:'現金',amount}]};
  }
  if(action.qty>r.inventory[action.good].qty)throw new Error('Insufficient inventory');
  let left=action.qty,cost=0;
  for(const lot of r.lots[action.good]){const n=Math.min(left,lot.qty);cost=safe(cost+n*lot.unitCost);left-=n;if(!left)break;}
  return {kind:'sell',port:port.id,good:action.good,qty:action.qty,price,amount,cost,profit:amount-cost,afterCash:safe(r.cash+amount),afterLoad:r.load-action.qty,entries:[{debit:'現金',credit:'売上',amount},{debit:'売上原価',credit:'商品',amount:cost}]};
}
export function commit(s,action){
  assertState(s);
  if(typeof action?.id!=='string'||!action.id||action.id.length>128)throw new Error('Invalid id');
  if(s.events.some(e=>e.id===action.id))return clone(s);
  const p=preview(s,action);
  const out=clone(s);
  out.events.push(action.kind==='sail'?{id:action.id,kind:'sail',voyage:s.voyage,port:p.port}:{id:action.id,kind:p.kind,voyage:s.voyage,port:p.port,good:p.good,qty:p.qty,price:p.price});
  if(action.kind==='sail')out.stop++;
  reduce(out);
  return out;
}
export function canSpecialClose(s){
  assertState(s);if(s.status!=='active'||s.stop===3)return false;
  const r=report(s),p=portAt(s);
  return r.cash<FARE&&r.cash+GOODS.reduce((a,g)=>a+r.inventory[g].qty*p.prices[g],0)<FARE;
}
export function closeVoyage(s,{special=false}={}){
  assertState(s);if(s.status!=='active')return clone(s);
  if(special?!canSpecialClose(s):s.stop!==3)throw new Error('Cannot close yet');
  return {...clone(s),status:special?'special':'closed'};
}
export function nextVoyage(s){
  assertState(s);if(s.status!=='closed')throw new Error('Voyage not closed');
  return {...clone(s),voyage:s.voyage+1,stop:0,status:'active'};
}
export function restore(s){verifyHistory(s);return clone(s);}
