// SPEC-018: pure helpers and data for the kids' accounting primer. No DOM.
// Text uses the `漢字{よみ}` notation; rubyHTML() turns it into <ruby> markup.
const KANJI=/[㐀-鿿々〆]/;
export const RUBY_PATTERN=/([㐀-鿿々〆]+)\{([^{}]+)\}/g;
export function rubyHTML(text){return String(text).replace(RUBY_PATTERN,'<ruby>$1<rt>$2</rt></ruby>');}
export function plainText(text){return String(text).replace(RUBY_PATTERN,'$1');}
export function bareKanji(text){return String(text).replace(RUBY_PATTERN,'').split('').filter(c=>KANJI.test(c));}
const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

// Step 1: a purchase and a sale, written on both sides.
export const PEPPER_COST=60,PEPPER_SALE=90;
export function purchaseEntries(){
 return [
  {label:'コショウを買{か}う',left:{account:'商品{しょうひん}（コショウ）',amount:PEPPER_COST},right:{account:'現金{げんきん}',amount:PEPPER_COST},note:'金貨{きんか}が出{で}ていって、コショウが手{て}に入{はい}った。'},
  {label:'コショウを売{う}る',left:{account:'現金{げんきん}',amount:PEPPER_SALE},right:{account:'売上{うりあげ}',amount:PEPPER_SALE},note:'コショウが出{で}ていって、金貨{きんか}が手{て}に入{はい}った。'}
 ];
}
export const entriesBalanced=entries=>entries.every(e=>e.left.amount===e.right.amount);

// Step 2: the treasure chest (assets) and where the money came from (liabilities + equity).
export const BALANCE_START=Object.freeze({cash:100,goods:0,ship:0,loan:0,own:100});
export function balanceAfter(actions){
 const b={...BALANCE_START};
 for(const a of actions){
  if(a==='borrow'){b.cash+=100;b.loan+=100;}
  else if(a==='ship'){if(b.cash<100)continue;b.cash-=100;b.ship+=100;}
  else if(a==='goods'){if(b.cash<50)continue;b.cash-=50;b.goods+=50;}
  else throw new Error('Unknown action');
 }
 const left=b.cash+b.goods+b.ship,right=b.loan+b.own;
 if(left!==right)throw new Error('Unbalanced');
 return {...b,left,right};
}

// Step 3: profit depends on how many bags were sold, not on how much cash is left.
export const BAGS=10,UNIT_COST=6,UNIT_PRICE=9,START_CASH=100;
export function profitFor(sold){
 if(!int(sold,0,BAGS))throw new RangeError('sold must be 0..'+BAGS);
 const sales=sold*UNIT_PRICE,cogs=sold*UNIT_COST,profit=sales-cogs;
 const cash=START_CASH-BAGS*UNIT_COST+sales,goodsLeft=BAGS-sold,goodsValue=goodsLeft*UNIT_COST;
 return {sold,sales,cogs,profit,cash,goodsLeft,goodsValue,assets:cash+goodsValue,cashChange:cash-START_CASH};
}

// Step 4: a ship is an asset; it becomes an expense little by little.
export const SHIP_PRICE=500,WEAR=25,SHIP_LIFE=20;
export function shipWear(voyages){
 if(!int(voyages,0,SHIP_LIFE))throw new RangeError('voyages must be 0..'+SHIP_LIFE);
 return {voyages,bookValue:SHIP_PRICE-WEAR*voyages,totalExpense:WEAR*voyages,expenseThisVoyage:voyages?WEAR:0};
}

// Step 5: borrowing versus shares.
export function financingCompare({amount=100,rate=5,profit=50}={}){
 const interest=Math.ceil(amount*rate/100);
 return {
  loan:{receive:amount,repay:amount,interest,total:amount+interest},
  shares:{receive:amount,repay:0,mine:profit/2,partner:profit/2}
 };
}

export const GLOSSARY=Object.freeze([
 {term:'現金{げんきん}',kid:'金貨{きんか}そのもの。'},
 {term:'商品{しょうひん}',kid:'売{う}るために持{も}っている品物{しなもの}。コショウなど。'},
 {term:'売上{うりあげ}',kid:'売{う}って受{う}け取{と}ったお金{かね}。'},
 {term:'費用{ひよう}',kid:'もうけるために、かかったお金{かね}。'},
 {term:'もうけ（利益{りえき}）',kid:'売上{うりあげ} − 費用{ひよう}。'},
 {term:'財産{ざいさん}（資産{しさん}）',kid:'宝箱{たからばこ}の中身{なかみ}。現金{げんきん}・商品{しょうひん}・船{ふね}。'},
 {term:'借金{しゃっきん}（負債{ふさい}）',kid:'あとで返{かえ}すお金{かね}。'},
 {term:'自分{じぶん}のお金{かね}（資本{しほん}）',kid:'財産{ざいさん}から借金{しゃっきん}を引{ひ}いた、ほんとうに自分{じぶん}のもの。'},
 {term:'仕訳{しわけ}',kid:'お金{かね}の動{うご}きを、左{ひだり}と右{みぎ}に同{おな}じ数{かず}で書{か}くこと。'},
 {term:'減価償却{げんかしょうきゃく}',kid:'船{ふね}が古{ふる}くなった分{ぶん}を、少{すこ}しずつ費用{ひよう}にすること。'}
]);

export const QUIZ=Object.freeze([
 {q:'金貨{きんか}60枚{まい}でコショウを買{か}った。これはソン？',choices:['ソンではない','ソンした'],answer:0,why:'金貨{きんか}がコショウに変{か}わっただけ。財産{ざいさん}の合計{ごうけい}は同{おな}じです。'},
 {q:'コショウ1ふくろを、金貨{きんか}9枚{まい}で売{う}った。仕入{しい}れは金貨{きんか}6枚{まい}。もうけは？',choices:['金貨{きんか}3枚{まい}','金貨{きんか}9枚{まい}'],answer:0,why:'売{う}ったお金{かね}9枚{まい} − かかったお金{かね}6枚{まい} ＝ もうけ3枚{まい}。'},
 {q:'船{ふね}を500枚{まい}で買{か}った。金貨{きんか}は減{へ}ったけど、財産{ざいさん}は？',choices:['変{か}わらない','減{へ}った'],answer:0,why:'金貨{きんか}500が、船{ふね}500という財産{ざいさん}に変{か}わりました。古{ふる}くなった分{ぶん}だけ、あとで少{すこ}しずつ費用{ひよう}になります。'}
]);
