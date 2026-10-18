// SPEC-017 v1.2: pure, deterministic engine for the company mode (株式会社版).
// Event-sourced like trade/accounting.mjs: balances, statements, ranking and
// the exit quote are all recomputed from the event list. No DOM, no storage.
import {PORTS,GOODS,route} from '../accounting.mjs';
export {PORTS,GOODS,route};
export const SHIP_PRICE=500, SHIP_CAPACITY=100, DEPRECIATION=25, DEPRECIATION_VOYAGES=20;
export const CAPITAL=300, FOUNDER_SHARES=300, LOAN=700, REPAY_UNIT=50, LOAN_DEADLINE=10;
export const ISSUE_UNITS=Object.freeze([50,100]), MAX_OUTSIDE_SHARES=300, UNLOCK_VOYAGES=3, UNLOCK_EQUITY=600;
export const EXIT_MULTIPLE=5, EXIT_MIN_VOYAGES=5, EXIT_MIN_HARD_VOYAGES=3, EXIT_AVERAGE_VOYAGES=3;
export const DIFFICULTIES=Object.freeze({
 easy:Object.freeze({rate:1,fare:10,deposit:0,exit:false}),
 hard:Object.freeze({rate:5,fare:30,deposit:1,exit:true})
});
// Account keys used in journal lines; pages translate them for display.
export const ACCOUNTS=Object.freeze(['cash','goods','ships','accDep','loan','accrued','capital','surplus','retained','sales','cogs','fares','interest','depositInterest','depreciation']);
const STATUSES=['active','closed','special','exited'];
const KINDS=['buy','sell','sail','ship','close','special','default','repay','issue','dividend','exit','difficulty'];
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
function requireInt(n,min=0){if(!integer(n,min))throw new RangeError('Invalid nonnegative integer');}
function safe(n){if(!Number.isSafeInteger(n))throw new RangeError('Unsafe amount');return n;}
const clone=s=>structuredClone(s);
function assertState(s){
 if(!s||s.version!==1||s.mode!=='company'||!DIFFICULTIES[s.difficulty]||!Array.isArray(s.events)||!integer(s.voyage,1)||!integer(s.stop)||s.stop>3||!STATUSES.includes(s.status))throw new Error('Invalid state');
}
const validAt=at=>at===undefined||(typeof at==='string'&&at.length<=40);
export const portAt=s=>{assertState(s);return PORTS.find(p=>p.id===route(s.voyage)[s.stop]);};
export function initialState(difficulty='easy'){
 if(!DIFFICULTIES[difficulty])throw new Error('Invalid difficulty');
 return {version:1,mode:'company',difficulty,voyage:1,stop:0,status:'active',events:[]};
}
const foundingDifficulty=s=>s.events.some(e=>e.kind==='difficulty')?'easy':s.difficulty;

function reduce(s){
 assertState(s);
 let diff=foundingDifficulty(s);
 let cash=0,loan=0,accrued=0,capital=0,surplus=0,accDep=0,outside=0,dividends=0,founderDividends=0;
 const lots=Object.fromEntries(GOODS.map(g=>[g,[]])),ships=[],journal=[],flows={},perVoyage={},closed=[];
 let exit=null,specialReason=null,repaidVoyage=null,curVoyage=1,curStop=0,status='active',eventsThisVoyage=0,start={cash:0,loan:0};
 const flow=(v,cat,amount)=>{const f=flows[v]??(flows[v]={op:0,inv:0,fin:0});f[cat]=safe(f[cat]+amount);};
 const post=(v,debit,credit,amount,kind,good)=>{if(amount<=0)return;const line={debit,credit,amount:safe(amount),voyage:v,kind};if(good)line.good=good;journal.push(line);};
 const rec=v=>perVoyage[v]??(perVoyage[v]={voyage:v,sales:0,cost:0,fares:0,interest:0,deposit:0,depreciation:0,profit:0,difficulty:diff,closed:false,special:false});
 // Founding (voyage 0): 300 capital, 700 loan, first ship.
 cash=CAPITAL;capital=CAPITAL;post(0,'cash','capital',CAPITAL,'found');flow(0,'fin',CAPITAL);
 cash+=LOAN;loan=LOAN;post(0,'cash','loan',LOAN,'loan');flow(0,'fin',LOAN);
 cash-=SHIP_PRICE;ships.push({bought:0,depreciated:0});post(0,'ships','cash',SHIP_PRICE,'ship');flow(0,'inv',-SHIP_PRICE);
 start={cash,loan};rec(1);
 const inventoryOf=()=>Object.fromEntries(GOODS.map(g=>[g,{qty:lots[g].reduce((a,l)=>a+l.qty,0),cost:lots[g].reduce((a,l)=>safe(a+l.qty*l.unitCost),0)}]));
 const sum=(f)=>Object.values(perVoyage).reduce((a,v)=>safe(a+f(v)),0);
 const cumProfit=()=>sum(v=>v.sales-v.cost-v.fares-v.interest+v.deposit-v.depreciation);
 const balance=()=>{
  const inventory=inventoryOf(),inventoryCost=GOODS.reduce((a,g)=>safe(a+inventory[g].cost),0);
  const shipsCost=ships.length*SHIP_PRICE,retained=safe(cumProfit()-dividends),equity=safe(capital+surplus+retained);
  const assets=safe(cash+inventoryCost+shipsCost-accDep),liabilities=safe(loan+accrued);
  if(assets!==safe(liabilities+equity))throw new Error('Unbalanced state');
  return {cash,inventory,inventoryCost,shipsCost,accDep,bookValue:shipsCost-accDep,loan,accrued,capital,surplus,retained,equity,assets,liabilities};
 };
 const startVoyage=()=>{
  if(status!=='closed')throw new Error('Voyage not closed');
  if(curVoyage>=LOAN_DEADLINE&&(loan>0||accrued>0))throw new Error('Loan due');
  curVoyage++;curStop=0;status='active';eventsThisVoyage=0;start={cash,loan};rec(curVoyage);
 };
 const closing=(v,special,at)=>{
  let dep=0;for(const sh of ships){if(sh.bought<curVoyage&&sh.depreciated<DEPRECIATION_VOYAGES){dep+=DEPRECIATION;sh.depreciated++;}}
  accDep+=dep;v.depreciation=dep;post(curVoyage,'depreciation','accDep',dep,'depreciation');
  const d=DIFFICULTIES[diff],deposit=Math.floor(start.cash*d.deposit/100);
  if(deposit){cash+=deposit;v.deposit=deposit;post(curVoyage,'cash','depositInterest',deposit,'deposit');flow(curVoyage,'op',deposit);}
  if(accrued&&cash>=accrued){cash-=accrued;post(curVoyage,'accrued','cash',accrued,'accruedPaid');flow(curVoyage,'op',-accrued);accrued=0;}
  const due=Math.ceil(start.loan*d.rate/100);
  if(due){v.interest=due;if(cash>=due){cash-=due;post(curVoyage,'interest','cash',due,'interest');flow(curVoyage,'op',-due);}else{accrued+=due;post(curVoyage,'interest','accrued',due,'interestAccrued');}}
  v.profit=safe(v.sales-v.cost-v.fares-v.interest+v.deposit-v.depreciation);v.closed=true;v.special=special;v.difficulty=diff;if(at!==undefined)v.at=at;
  status=special?'special':'closed';if(special)specialReason='fare';
  const b=balance();
  closed.push({voyage:curVoyage,difficulty:diff,at,special,defaulted:false,profit:v.profit,sales:v.sales,cost:v.cost,fares:v.fares,interest:v.interest,deposit:v.deposit,depreciation:v.depreciation,margin:v.sales?v.profit/v.sales:null,equity:b.equity,cash:b.cash,loan:b.loan,ships:ships.length,pl:{sales:v.sales,cost:v.cost,fares:v.fares,interest:v.interest,deposit:v.deposit,depreciation:v.depreciation,profit:v.profit},bs:b});
 };
 for(const e of s.events){
  if(!e||!KINDS.includes(e.kind))throw new Error('Invalid event');
  if(e.voyage===curVoyage+1)startVoyage();else if(e.voyage!==curVoyage)throw new Error('Invalid event voyage');
  const v=rec(curVoyage);
  if(['buy','sell','sail','ship','difficulty'].includes(e.kind)&&status!=='active')throw new Error('Voyage is closed');
  if(e.kind==='difficulty'){
   if(curStop!==0||eventsThisVoyage||diff!=='easy'||e.value!=='hard')throw new Error('Cannot switch difficulty');
   diff='hard';v.difficulty='hard';
  }else if(e.kind==='buy'){
   requireInt(e.qty,1);const amount=safe(e.qty*e.price);cash=safe(cash-amount);
   lots[e.good].push({qty:e.qty,unitCost:e.price,port:e.port});post(curVoyage,'goods','cash',amount,'buy',e.good);flow(curVoyage,'op',-amount);
  }else if(e.kind==='sell'){
   requireInt(e.qty,1);const amount=safe(e.qty*e.price);cash=safe(cash+amount);v.sales=safe(v.sales+amount);
   let left=e.qty,c=0;
   for(const lot of lots[e.good]){const q=Math.min(left,lot.qty);lot.qty-=q;left-=q;c=safe(c+q*lot.unitCost);if(!left)break;}
   if(left)throw new Error('Inventory shortage');
   lots[e.good]=lots[e.good].filter(x=>x.qty);v.cost=safe(v.cost+c);
   post(curVoyage,'cash','sales',amount,'sell',e.good);post(curVoyage,'cogs','goods',c,'cogs',e.good);flow(curVoyage,'op',amount);
  }else if(e.kind==='sail'){
   if(curStop>=3)throw new Error('Last port');
   const fare=DIFFICULTIES[diff].fare*ships.length;cash=safe(cash-fare);v.fares=safe(v.fares+fare);curStop++;
   post(curVoyage,'fares','cash',fare,'sail');flow(curVoyage,'op',-fare);
  }else if(e.kind==='ship'){
   cash=safe(cash-SHIP_PRICE);ships.push({bought:curVoyage,depreciated:0});post(curVoyage,'ships','cash',SHIP_PRICE,'ship');flow(curVoyage,'inv',-SHIP_PRICE);
  }else if(e.kind==='close'||e.kind==='special'){
   if(status!=='active'||(e.kind==='close'&&curStop!==3))throw new Error('Cannot close yet');
   if(!validAt(e.at))throw new Error('Invalid timestamp');
   closing(v,e.kind==='special',e.at);
  }else if(e.kind==='default'){
   if(status!=='closed')throw new Error('Cannot default');
   status='special';specialReason='deadline';v.special=true;closed.at(-1).defaulted=true;
  }else if(e.kind==='repay'){
   if(status!=='closed')throw new Error('Voyage not closed');
   requireInt(e.amount,REPAY_UNIT);cash=safe(cash-e.amount);loan=safe(loan-e.amount);if(loan<0)throw new Error('Overpaid');
   post(curVoyage,'loan','cash',e.amount,'repay');flow(curVoyage,'fin',-e.amount);if(loan===0)repaidVoyage=curVoyage;
  }else if(e.kind==='issue'){
   if(status!=='closed')throw new Error('Voyage not closed');
   requireInt(e.shares,1);requireInt(e.price,1);const amount=safe(e.shares*e.price);
   cash=safe(cash+amount);capital=safe(capital+e.shares);surplus=safe(surplus+(e.price-1)*e.shares);outside+=e.shares;
   post(curVoyage,'cash','capital',e.shares,'issue');post(curVoyage,'cash','surplus',(e.price-1)*e.shares,'issue');flow(curVoyage,'fin',amount);
  }else if(e.kind==='dividend'){
   if(status!=='closed')throw new Error('Voyage not closed');
   requireInt(e.perShare,1);const total=safe(e.perShare*(FOUNDER_SHARES+outside));
   cash=safe(cash-total);dividends=safe(dividends+total);founderDividends=safe(founderDividends+e.perShare*FOUNDER_SHARES);
   post(curVoyage,'retained','cash',total,'dividend');flow(curVoyage,'fin',-total);
  }else if(e.kind==='exit'){
   if(status!=='closed')throw new Error('Voyage not closed');
   status='exited';exit={voyage:curVoyage,value:e.value,price:e.price,proceeds:e.proceeds,avgProfit:e.avgProfit,equity:e.equity,shares:e.shares};
  }
  eventsThisVoyage++;
  if(cash<0)throw new Error('Negative cash');
  const load=GOODS.reduce((a,g)=>a+lots[g].reduce((x,l)=>x+l.qty,0),0);
  if(load>ships.length*SHIP_CAPACITY)throw new Error('Ship full');
  balance();
 }
 if(s.voyage===curVoyage+1)startVoyage();
 if(curVoyage!==s.voyage||curStop!==s.stop||status!==s.status)throw new Error('Invalid progression');
 if(diff!==s.difficulty)throw new Error('Invalid difficulty');
 const b=balance(),d=DIFFICULTIES[diff],current=rec(s.voyage);
 const load=GOODS.reduce((a,g)=>a+b.inventory[g].qty,0),capacity=ships.length*SHIP_CAPACITY;
 const port=PORTS.find(p=>p.id===route(s.voyage)[s.stop]);
 const liquidation=GOODS.reduce((a,g)=>safe(a+b.inventory[g].qty*port.prices[g]),0);
 const totalShares=FOUNDER_SHARES+outside;
 const closingPreview=status==='active'?{
  depreciation:ships.filter(sh=>sh.bought<s.voyage&&sh.depreciated<DEPRECIATION_VOYAGES).length*DEPRECIATION,
  deposit:Math.floor(start.cash*d.deposit/100),interestDue:Math.ceil(start.loan*d.rate/100),accrued
 }:null;
 const unlocked=closed.length>=UNLOCK_VOYAGES&&b.equity>=UNLOCK_EQUITY&&accrued===0;
 const hardClosed=closed.filter(c=>c.difficulty==='hard').length;
 const canExit=status==='closed'&&d.exit&&hardClosed>=EXIT_MIN_HARD_VOYAGES&&closed.length>=EXIT_MIN_VOYAGES&&loan===0&&accrued===0;
 let exitQuote=null;
 if(d.exit&&closed.length>=EXIT_AVERAGE_VOYAGES){
  const last=closed.slice(-EXIT_AVERAGE_VOYAGES),avgProfit=Math.floor(last.reduce((a,c)=>a+c.profit,0)/EXIT_AVERAGE_VOYAGES);
  const value=safe(b.equity+Math.max(0,avgProfit)*EXIT_MULTIPLE),price=Math.max(1,Math.floor(value/totalShares));
  exitQuote={value,avgProfit,price,proceeds:price*FOUNDER_SHARES,equity:b.equity,shares:totalShares,undiluted:Math.max(1,Math.floor(value/FOUNDER_SHARES))*FOUNDER_SHARES};
 }
 const ranking=[...closed].sort((x,y)=>y.profit-x.profit||(y.margin??-Infinity)-(x.margin??-Infinity)).map((c,i,arr)=>{
  const prev=arr[i-1];return {...c,rank:prev&&prev.profit===c.profit&&prev.margin===c.margin?null:i+1};
 });
 for(let i=0;i<ranking.length;i++)if(ranking[i].rank===null)ranking[i].rank=ranking[i-1].rank;
 const totals={sales:sum(v=>v.sales),cost:sum(v=>v.cost),fares:sum(v=>v.fares),interest:sum(v=>v.interest),deposit:sum(v=>v.deposit),depreciation:sum(v=>v.depreciation)};
 totals.profit=cumProfit();
 const cumulative=Object.values(flows).reduce((a,f)=>({op:a.op+f.op,inv:a.inv+f.inv,fin:a.fin+f.fin}),{op:0,inv:0,fin:0});
 if(cumulative.op+cumulative.inv+cumulative.fin!==cash)throw new Error('Cash flow mismatch');
 return {
  difficulty:diff,founding:foundingDifficulty(s),settings:d,...b,lots,load,capacity,ships:ships.map(sh=>({...sh,bookValue:SHIP_PRICE-sh.depreciated*DEPRECIATION})),
  outside,totalShares,founderRatio:Math.round(FOUNDER_SHARES/totalShares*1000)/10,dividends,founderDividends,
  totals,perVoyage,current:{...current},closing:closingPreview,closed,ranking,closedCount:closed.length,hardClosed,unlocked,canExit,exitQuote,exit,specialReason,repaidVoyage,
  journal,flows,currentFlow:flows[s.voyage]??{op:0,inv:0,fin:0},cumulativeFlow:cumulative,startCash:start.cash,startLoan:start.loan,liquidation,fare:d.fare*ships.length,
  deadline:LOAN_DEADLINE,balanced:true
 };
}
export const report=s=>clone(reduce(s));

export function canSpecialClose(s){
 assertState(s);if(s.status!=='active'||s.stop===3)return false;
 const r=reduce(s);return r.cash<r.fare&&r.cash+r.liquidation<r.fare;
}
export function canDefault(s){
 assertState(s);if(s.status!=='closed'||s.voyage<LOAN_DEADLINE)return false;
 const r=reduce(s);return r.cash<r.loan+r.accrued;
}
export function preview(s,action){
 assertState(s);
 if(!action||!KINDS.includes(action.kind))throw new Error('Invalid action');
 const r=reduce(s),port=portAt(s),k=action.kind;
 const active=()=>{if(s.status!=='active')throw new Error('Voyage is closed');};
 const closedOnly=()=>{if(s.status!=='closed')throw new Error('Voyage not closed');};
 if(k==='difficulty'){
  active();if(s.stop!==0||s.events.some(e=>e.voyage===s.voyage))throw new Error('Switch only at voyage start');
  if(r.difficulty!=='easy'||action.value!=='hard')throw new Error('Cannot switch difficulty');
  return {kind:'difficulty',value:'hard',fare:DIFFICULTIES.hard.fare*r.ships.length,rate:DIFFICULTIES.hard.rate,entries:[]};
 }
 if(k==='ship'){
  active();if(r.cash<SHIP_PRICE)throw new Error('Insufficient cash');
  return {kind:'ship',port:port.id,amount:SHIP_PRICE,afterCash:r.cash-SHIP_PRICE,afterCapacity:r.capacity+SHIP_CAPACITY,afterShips:r.ships.length+1,afterFare:r.settings.fare*(r.ships.length+1),entries:[{debit:'ships',credit:'cash',amount:SHIP_PRICE}]};
 }
 if(k==='sail'){
  active();if(s.stop===3)throw new Error('Last port');
  if(r.cash<r.fare)throw new Error('Insufficient fare');
  return {kind:'sail',port:port.id,nextPort:route(s.voyage)[s.stop+1],amount:r.fare,ships:r.ships.length,afterCash:r.cash-r.fare,entries:[{debit:'fares',credit:'cash',amount:r.fare}]};
 }
 if(k==='buy'||k==='sell'){
  active();if(!GOODS.includes(action.good))throw new Error('Invalid trade');
  requireInt(action.qty,1);
  const price=port.prices[action.good],amount=safe(price*action.qty);
  if(k==='buy'){
   if(amount>r.cash)throw new Error('Insufficient cash');
   if(r.load+action.qty>r.capacity)throw new Error('Ship full');
   return {kind:'buy',port:port.id,good:action.good,qty:action.qty,price,amount,afterCash:r.cash-amount,afterLoad:r.load+action.qty,entries:[{debit:'goods',credit:'cash',amount}]};
  }
  if(action.qty>r.inventory[action.good].qty)throw new Error('Insufficient inventory');
  let left=action.qty,cost=0;
  for(const lot of r.lots[action.good]){const n=Math.min(left,lot.qty);cost=safe(cost+n*lot.unitCost);left-=n;if(!left)break;}
  return {kind:'sell',port:port.id,good:action.good,qty:action.qty,price,amount,cost,profit:amount-cost,afterCash:safe(r.cash+amount),afterLoad:r.load-action.qty,entries:[{debit:'cash',credit:'sales',amount},{debit:'cogs',credit:'goods',amount:cost}]};
 }
 if(k==='close'||k==='special'){
  active();if(!validAt(action.at))throw new Error('Invalid timestamp');
  if(k==='close'&&s.stop!==3)throw new Error('Cannot close yet');
  if(k==='special'&&!canSpecialClose(s))throw new Error('Cannot close yet');
  const c=r.closing;
  let cash=r.cash+c.deposit,accruedPaid=0,accruedLeft=c.accrued;
  if(accruedLeft&&cash>=accruedLeft){accruedPaid=accruedLeft;cash-=accruedLeft;accruedLeft=0;}
  const interestPaid=c.interestDue&&cash>=c.interestDue;if(interestPaid)cash-=c.interestDue;else accruedLeft+=c.interestDue;
  if(k==='close'&&s.voyage>=LOAN_DEADLINE){
   const shortfall=r.loan+accruedLeft-cash;
   if(shortfall>0&&r.liquidation>=shortfall)throw new Error('Sell inventory first');
  }
  const profit=safe(r.current.sales-r.current.cost-r.current.fares-c.interestDue+c.deposit-c.depreciation);
  const entries=[];
  if(c.depreciation)entries.push({debit:'depreciation',credit:'accDep',amount:c.depreciation});
  if(c.deposit)entries.push({debit:'cash',credit:'depositInterest',amount:c.deposit});
  if(accruedPaid)entries.push({debit:'accrued',credit:'cash',amount:accruedPaid});
  if(c.interestDue)entries.push({debit:'interest',credit:interestPaid?'cash':'accrued',amount:c.interestDue});
  return {kind:k,special:k==='special',depreciation:c.depreciation,deposit:c.deposit,accruedPaid,interestDue:c.interestDue,interestPaid:Boolean(interestPaid),accruedAfter:accruedLeft,afterCash:cash,profit,deadline:s.voyage>=LOAN_DEADLINE,loan:r.loan,entries};
 }
 if(k==='default'){
  if(!canDefault(s))throw new Error('Cannot default');
  return {kind:'default',cash:r.cash,loan:r.loan,accrued:r.accrued,shortfall:r.loan+r.accrued-r.cash,entries:[]};
 }
 if(k==='repay'){
  closedOnly();requireInt(action.amount,REPAY_UNIT);
  if(action.amount%REPAY_UNIT)throw new Error('Repay in units of 50');
  if(action.amount>r.cash)throw new Error('Insufficient cash');
  if(action.amount>r.loan)throw new Error('Exceeds loan');
  return {kind:'repay',amount:action.amount,afterCash:r.cash-action.amount,afterLoan:r.loan-action.amount,entries:[{debit:'loan',credit:'cash',amount:action.amount}]};
 }
 if(k==='issue'){
  closedOnly();if(!r.unlocked)throw new Error('Shares locked');
  if(!ISSUE_UNITS.includes(action.shares))throw new Error('Issue 50 or 100 shares');
  if(r.outside+action.shares>MAX_OUTSIDE_SHARES)throw new Error('Founder must keep 50%');
  const price=Math.max(1,Math.ceil(r.equity/r.totalShares)),amount=price*action.shares,total=r.totalShares+action.shares;
  const entries=[{debit:'cash',credit:'capital',amount:action.shares}];
  if(price>1)entries.push({debit:'cash',credit:'surplus',amount:(price-1)*action.shares});
  return {kind:'issue',shares:action.shares,price,amount,capital:action.shares,surplus:(price-1)*action.shares,afterCash:r.cash+amount,afterShares:total,afterOutside:r.outside+action.shares,founderRatio:Math.round(FOUNDER_SHARES/total*1000)/10,entries};
 }
 if(k==='dividend'){
  closedOnly();if(!r.unlocked)throw new Error('Shares locked');
  requireInt(action.perShare,1);const total=safe(action.perShare*r.totalShares);
  if(total>r.retained)throw new Error('Exceeds retained earnings');
  if(total>r.cash)throw new Error('Insufficient cash');
  return {kind:'dividend',perShare:action.perShare,total,founder:action.perShare*FOUNDER_SHARES,outside:action.perShare*r.outside,afterCash:r.cash-total,afterRetained:r.retained-total,entries:[{debit:'retained',credit:'cash',amount:total}]};
 }
 if(k==='exit'){
  if(!r.canExit)throw new Error('Exit not available');
  return {kind:'exit',...r.exitQuote,entries:[]};
 }
 throw new Error('Invalid action');
}
export function commit(s,action){
 assertState(s);
 if(typeof action?.id!=='string'||!action.id||action.id.length>128)throw new Error('Invalid id');
 if(s.events.some(e=>e.id===action.id))return clone(s);
 const p=preview(s,action),out=clone(s),v=s.voyage,id=action.id;
 let e;
 switch(p.kind){
  case 'buy':case 'sell':e={id,kind:p.kind,voyage:v,port:p.port,good:p.good,qty:p.qty,price:p.price};break;
  case 'sail':e={id,kind:'sail',voyage:v,port:p.port};out.stop++;break;
  case 'ship':e={id,kind:'ship',voyage:v,port:p.port};break;
  case 'close':case 'special':e={id,kind:p.kind,voyage:v};if(typeof action.at==='string')e.at=action.at;out.status=p.special?'special':'closed';break;
  case 'default':e={id,kind:'default',voyage:v};out.status='special';break;
  case 'repay':e={id,kind:'repay',voyage:v,amount:p.amount};break;
  case 'issue':e={id,kind:'issue',voyage:v,shares:p.shares,price:p.price};break;
  case 'dividend':e={id,kind:'dividend',voyage:v,perShare:p.perShare};break;
  case 'exit':e={id,kind:'exit',voyage:v,value:p.value,price:p.price,proceeds:p.proceeds,avgProfit:p.avgProfit,equity:p.equity,shares:p.shares};out.status='exited';break;
  case 'difficulty':e={id,kind:'difficulty',voyage:v,value:'hard'};out.difficulty='hard';break;
 }
 out.events.push(e);
 reduce(out);
 return out;
}
export function nextVoyage(s){
 assertState(s);if(s.status!=='closed')throw new Error('Voyage not closed');
 const r=reduce(s);
 if(s.voyage>=LOAN_DEADLINE&&(r.loan>0||r.accrued>0))throw new Error('Loan due');
 return {...clone(s),voyage:s.voyage+1,stop:0,status:'active'};
}
function actionOf(e){
 switch(e.kind){
  case 'buy':case 'sell':return {kind:e.kind,id:e.id,good:e.good,qty:e.qty};
  case 'close':case 'special':return e.at===undefined?{kind:e.kind,id:e.id}:{kind:e.kind,id:e.id,at:e.at};
  case 'repay':return {kind:'repay',id:e.id,amount:e.amount};
  case 'issue':return {kind:'issue',id:e.id,shares:e.shares};
  case 'dividend':return {kind:'dividend',id:e.id,perShare:e.perShare};
  case 'difficulty':return {kind:'difficulty',id:e.id,value:e.value};
  default:return {kind:e.kind,id:e.id};
 }
}
function verifyHistory(s){
 assertState(s);
 let prior=initialState(foundingDifficulty(s));
 for(const e of s.events){
  if(!e||typeof e.id!=='string'||!e.id||prior.events.some(x=>x.id===e.id))throw new Error('Invalid event id');
  if(!KINDS.includes(e.kind))throw new Error('Invalid event');
  if(e.voyage===prior.voyage+1&&prior.status==='closed')prior=nextVoyage(prior);
  if(e.voyage!==prior.voyage)throw new Error('Invalid event voyage');
  const next=commit(prior,actionOf(e));
  if(JSON.stringify(next.events.at(-1))!==JSON.stringify(e))throw new Error('Tampered event');
  prior=next;
 }
 if(s.voyage===prior.voyage+1&&prior.status==='closed')prior=nextVoyage(prior);
 if(prior.voyage!==s.voyage||prior.stop!==s.stop||prior.status!==s.status||prior.difficulty!==s.difficulty)throw new Error('Invalid progression');
 return true;
}
export function restore(s){verifyHistory(s);return clone(s);}
