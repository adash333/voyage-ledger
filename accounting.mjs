// Pure accounting logic: SPEC-ACC-001, SPEC-GAME-001, SPEC-SAVE-001
export const UNIT_COST=6;
export const QUANTITY=10;
export const initial=()=>({step:0,entries:[]});
export function entriesFor(step,unitPrice=9){
 if(step===0)return [{debit:'現金',credit:'資本金',amount:100}];
 if(step===1)return [{debit:'商品',credit:'現金',amount:60}];
 if(step===2){if(!Number.isInteger(unitPrice)||unitPrice<3||unitPrice>12)throw Error('Invalid unit price');return [{debit:'現金',credit:'売上',amount:unitPrice*QUANTITY},{debit:'売上原価',credit:'商品',amount:60}];}
 throw Error('Invalid step');
}
export function valid(state){
 if(!state||!Number.isInteger(state.step)||state.step<0||state.step>3||!Array.isArray(state.entries))return false;
 const entries=state.entries;
 if(state.step<3)return JSON.stringify(entries)===JSON.stringify(Array.from({length:state.step},(_,i)=>entriesFor(i)).flat());
 if(entries.length!==4)return false;
 const price=entries[2]?.amount/QUANTITY;
 return Number.isInteger(price)&&price>=3&&price<=12&&JSON.stringify(entries)===JSON.stringify([...entriesFor(0),...entriesFor(1),...entriesFor(2,price)]);
}
export function advance(state,unitPrice=9){
 if(!valid(state)||state.step===3)throw Error('Invalid game state');
 return {step:state.step+1,entries:[...state.entries,...entriesFor(state.step,unitPrice)]};
}
export function balances(entries){
 const b={};
 for(const e of entries){
  if(!e||!Number.isSafeInteger(e.amount)||e.amount<=0||!e.debit||!e.credit||e.debit===e.credit)throw Error('Invalid journal entry');
  b[e.debit]=(b[e.debit]||0)+e.amount;
  b[e.credit]=(b[e.credit]||0)-e.amount;
 }
 return b;
}
export function statement(entries){
 const b=balances(entries),cash=b['現金']||0,stock=b['商品']||0,sales=-(b['売上']||0),cost=b['売上原価']||0,capital=-(b['資本金']||0),profit=sales-cost;
 const zero=n=>Object.is(n,-0)?0:n;
 return {cash:zero(cash),stock:zero(stock),sales:zero(sales),cost:zero(cost),capital:zero(capital),profit:zero(profit),assets:zero(cash+stock),sources:zero(capital+profit),balanced:cash+stock===capital+profit};
}
export function preview(unitPrice){
 if(!Number.isInteger(unitPrice)||unitPrice<3||unitPrice>12)throw Error('Invalid price');
 const sales=unitPrice*QUANTITY;
 return {sales,profit:sales-60,cash:40+sales};
}
