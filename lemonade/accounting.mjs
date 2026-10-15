// SPEC-LEMON-001: deterministic double-entry teaching steps.
export const steps=[
 {name:'スタート',title:'自分のお小遣い500円でスタート！',description:'自分の貯金から500円を商売の元手にしました。',debit:'現金',credit:'元手',amount:500,leftNote:'手元に現金が増えました。',rightNote:'自分が出したお金です。',lesson:'元手500円は、商売を始めるために自分で用意したお金です。'},
 {name:'借入',title:'家族から500円を借りた！',description:'材料を買うため、家族から500円を借りました。あとで返す約束です。',debit:'現金',credit:'借入金',amount:500,leftNote:'現金が増えます。',rightNote:'返す約束（負債）が増えます。',lesson:'借りた500円は利益ではありません。現金と同時に借金が増えます。'},
 {name:'仕入',title:'600円でレモネードの材料を購入！',description:'レモン・砂糖・カップなどを600円で買いました。',debit:'材料',credit:'現金',amount:600,leftNote:'材料が資産として増えます。',rightNote:'現金を600円支払いました。',lesson:'現金が材料に姿を変えました。買った時点では、まだ全部を費用にしません。'},
 {name:'販売',title:'レモネードを1200円で販売！',description:'材料をすべて使ってレモネードを作り、合計1200円で売りました。',debit:'現金',credit:'売上',amount:1200,leftNote:'販売代金が入りました。',rightNote:'売上1200円を記録します。',lesson:'売上1200円から材料代600円を引くと、利益は600円です。'},
 {name:'返済',title:'借りた500円を返そう！',description:'家族に借りていた500円を返しました。',debit:'借入金',credit:'現金',amount:500,leftNote:'返す義務がなくなります。',rightNote:'現金500円が出ていきます。',lesson:'返済は借金を減らす取引。費用ではないため、利益600円は変わりません。'}
];
export function journalAt(index){if(!Number.isInteger(index)||index<0||index>=steps.length)throw Error('invalid step');const entries=[];for(let i=0;i<=index;i++){const s=steps[i];entries.push({debit:s.debit,credit:s.credit,amount:s.amount});if(i===3)entries.push({debit:'売上原価',credit:'材料',amount:600})}return entries}
export function snapshot(index){const balances={};for(const e of journalAt(index)){balances[e.debit]=(balances[e.debit]||0)+e.amount;balances[e.credit]=(balances[e.credit]||0)-e.amount}const cash=balances['現金']||0,materials=balances['材料']||0,debt=-(balances['借入金']||0),capital=-(balances['元手']||0),sales=-(balances['売上']||0),cost=balances['売上原価']||0,profit=sales-cost;return {cash,materials,debt,capital,sales,cost,profit,assets:cash+materials,sources:debt+capital+profit,balanced:cash+materials===debt+capital+profit}}
