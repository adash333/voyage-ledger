import {rubyHTML,purchaseEntries,entriesBalanced,balanceAfter,profitFor,shipWear,financingCompare,GLOSSARY,QUIZ,SHIP_PRICE,SHIP_LIFE,BAGS} from './content.mjs?v=20261020-learn1';
const RUBY_KEY='voyage-learn-ruby-v1';
const $=id=>document.getElementById(id);
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r=text=>rubyHTML(escapeHTML(text));
const coins=n=>'金貨'+n.toLocaleString('ja-JP')+'枚';
// Convert `漢字{よみ}` in the static page text into <ruby>.
function rubifyNode(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){if(!/\{/.test(node.nodeValue))continue;const span=document.createElement('span');span.innerHTML=r(node.nodeValue);node.replaceWith(...span.childNodes);}
}
rubifyNode(document.querySelector('main'));
// Furigana toggle, remembered per browser.
let ruby=true;try{ruby=localStorage.getItem(RUBY_KEY)!=='off';}catch(e){}
function applyRuby(){document.body.classList.toggle('no-ruby',!ruby);$('rubyToggle').textContent=ruby?'ふりがな：あり':'ふりがな：なし';$('rubyToggle').setAttribute('aria-pressed',String(ruby));}
$('rubyToggle').addEventListener('click',()=>{ruby=!ruby;try{localStorage.setItem(RUBY_KEY,ruby?'on':'off');}catch(e){}applyRuby();});
applyRuby();
const row=(label,amount,cls='')=>'<div class="row'+(cls?' '+cls:'')+'"><span>'+r(label)+'</span><strong>'+coins(amount)+'</strong></div>';
// Step 1
const entries=purchaseEntries();let done=0;
function renderEntries(){
 const shown=entries.slice(0,done);
 $('entryLeft').innerHTML=shown.map(e=>row(e.left.account,e.left.amount)).join('')+(shown.length?row('合計{ごうけい}',shown.reduce((a,e)=>a+e.left.amount,0),'total'):'');
 $('entryRight').innerHTML=shown.map(e=>row(e.right.account,e.right.amount)).join('')+(shown.length?row('合計{ごうけい}',shown.reduce((a,e)=>a+e.right.amount,0),'total'):'');
 $('entryNote').innerHTML=shown.length?r(shown.at(-1).note):r('ボタンをおしてみよう。');
 $('entryCheck').hidden=!shown.length;$('entryCheck').innerHTML=r(entriesBalanced(shown)?'✓ 左{ひだり}の合計{ごうけい}と右{みぎ}の合計{ごうけい}は同{おな}じ！':'左右{さゆう}が合{あ}いません');
 $('buyBtn').disabled=done>=1;$('sellBtn').disabled=done!==1;
}
$('buyBtn').addEventListener('click',()=>{done=1;renderEntries();});
$('sellBtn').addEventListener('click',()=>{done=2;renderEntries();});
$('entryReset').addEventListener('click',()=>{done=0;renderEntries();});
renderEntries();
// Step 2
let actions=[];
function renderBalance(){
 const b=balanceAfter(actions);
 $('balanceLeft').innerHTML=row('現金{げんきん}',b.cash)+row('商品{しょうひん}（コショウ）',b.goods)+row('船{ふね}',b.ship)+row('合計{ごうけい}',b.left,'total');
 $('balanceRight').innerHTML=row('借金{しゃっきん}（借{か}りたお金{かね}）',b.loan)+row('自分{じぶん}のお金{かね}',b.own)+row('合計{ごうけい}',b.right,'total');
 $('panLeft').textContent=b.left;$('panRight').textContent=b.right;
 const last=actions.at(-1);
 $('balanceNote').innerHTML=r(last==='borrow'?'借{か}りると、現金{げんきん}も借金{しゃっきん}も100増{ふ}える。左右{さゆう}はやっぱり同{おな}じ。':last==='ship'?'現金{げんきん}が船{ふね}に変{か}わっただけ。宝箱{たからばこ}の合計{ごうけい}は変{か}わらない。':last==='goods'?'現金{げんきん}がコショウに変{か}わっただけ。合計{ごうけい}は同{おな}じ。':'はじめは、自分{じぶん}のお金{かね}100枚{まい}が宝箱{たからばこ}に入{はい}っています。');
 document.querySelectorAll('[data-act]').forEach(btn=>{const a=btn.dataset.act;btn.disabled=(a==='ship'&&b.cash<100)||(a==='goods'&&b.cash<50)||actions.length>=8;});
}
document.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>{actions.push(btn.dataset.act);renderBalance();}));
$('balanceReset').addEventListener('click',()=>{actions=[];renderBalance();});
renderBalance();
// Step 3
function renderProfit(){
 const p=profitFor(Number($('soldRange').value));
 $('soldLabel').textContent=String(p.sold);
 $('profitBox').innerHTML=row('売{う}ったお金{かね}（売上{うりあげ}）',p.sales)+row('かかったお金{かね}（原価{げんか}）',p.cogs)+row('もうけ',p.profit,'total');
 $('chestBox').innerHTML=row('金貨{きんか}',p.cash)+row('コショウ '+p.goodsLeft+'ふくろ',p.goodsValue)+row('財産{ざいさん}の合計{ごうけい}',p.assets,'total');
 $('profitNote').innerHTML=r(p.sold===0?'まだ1つも売{う}れていません。金貨{きんか}は60枚{まい}減{へ}ったけれど、コショウが60枚{まい}分{ぶん}あるので、財産{ざいさん}は100のまま。':p.sold<BAGS?'金貨{きんか}は'+(p.cashChange>=0?'はじめより'+p.cashChange+'枚{まい}多{おお}い':'はじめより'+(-p.cashChange)+'枚{まい}少{すく}ない')+'。でも、もうけは'+p.profit+'枚{まい}。残{のこ}りのコショウも財産{ざいさん}です。':'全部{ぜんぶ}売{う}れた！ もうけ'+p.profit+'枚{まい}で、財産{ざいさん}は'+p.assets+'枚{まい}になりました。');
}
$('soldRange').addEventListener('input',renderProfit);renderProfit();
// Step 4
let voyages=0;
function renderShip(){
 const w=shipWear(voyages);
 $('voyageCount').textContent=String(w.voyages);$('bookValue').textContent=String(w.bookValue);$('wearTotal').textContent=String(w.totalExpense);
 $('shipBar').style.width=(w.bookValue/SHIP_PRICE*100)+'%';
 $('voyageBtn').disabled=voyages>=SHIP_LIFE;
 $('shipNote').innerHTML=r(voyages===0?'買{か}ったばかり。帳簿{ちょうぼ}の値段{ねだん}は500枚{まい}。':voyages<SHIP_LIFE?'今回{こんかい}の費用{ひよう}は'+w.expenseThisVoyage+'枚{まい}。金貨{きんか}は1枚{まい}も出{で}ていっていないのに、費用{ひよう}が増{ふ}えました。':'20回{かい}で帳簿{ちょうぼ}の値段{ねだん}は0。でも船{ふね}はまだ使{つか}えます。');
}
$('voyageBtn').addEventListener('click',()=>{voyages=Math.min(SHIP_LIFE,voyages+1);renderShip();});
$('shipReset').addEventListener('click',()=>{voyages=0;renderShip();});
renderShip();
// Step 5
function renderFinance(kind){
 const f=financingCompare();
 $('financeBox').innerHTML=kind==='loan'
  ?'<div class="sides"><div class="side left"><h4>'+r('いま')+'</h4>'+row('銀行{ぎんこう}からもらう',f.loan.receive)+'</div><div class="side right"><h4>'+r('あとで')+'</h4>'+row('返{かえ}す',f.loan.repay)+row('レンタル料{りょう}（利息{りそく}）',f.loan.interest)+row('合計{ごうけい}',f.loan.total,'total')+'</div></div><p class="hint">'+r('借{か}りたお金{かね}は「借金{しゃっきん}」。利息{りそく}は費用{ひよう}になります。')+'</p>'
  :'<div class="sides"><div class="side left"><h4>'+r('いま')+'</h4>'+row('仲間{なかま}からもらう',f.shares.receive)+row('返{かえ}す',f.shares.repay)+'</div><div class="side right"><h4>'+r('もうけ50が出{で}たら')+'</h4>'+row('自分{じぶん}の分{ぶん}',f.shares.mine)+row('仲間{なかま}の分{ぶん}（配当{はいとう}）',f.shares.partner)+'</div></div><p class="hint">'+r('仲間{なかま}のお金{かね}は「自分{じぶん}たちのお金{かね}（資本{しほん}）」。返{かえ}さないかわりに、もうけを分{わ}けます。')+'</p>';
}
$('loanBtn').addEventListener('click',()=>renderFinance('loan'));$('shareBtn').addEventListener('click',()=>renderFinance('shares'));
$('financeBox').innerHTML='<p class="hint">'+r('どちらかをおしてみよう。')+'</p>';
// Glossary
$('cards').innerHTML=GLOSSARY.map((g,i)=>'<button class="card" data-card="'+i+'" aria-pressed="false">'+r(g.term)+'<small>'+r('タップで言{い}いかえ')+'</small></button>').join('');
document.querySelectorAll('[data-card]').forEach(btn=>btn.addEventListener('click',()=>{const g=GLOSSARY[Number(btn.dataset.card)],flipped=btn.classList.toggle('flipped');btn.setAttribute('aria-pressed',String(flipped));btn.innerHTML=flipped?r(g.kid)+'<small>'+r(g.term)+'</small>':r(g.term)+'<small>'+r('タップで言{い}いかえ')+'</small>';}));
// Quiz
$('quizBox').innerHTML=QUIZ.map((q,i)=>'<div class="quiz" data-quiz="'+i+'"><p><strong>Q'+(i+1)+'.</strong> '+r(q.q)+'</p><div class="choices">'+q.choices.map((c,j)=>'<button data-choice="'+j+'">'+r(c)+'</button>').join('')+'</div><p class="feedback" aria-live="polite"></p></div>').join('');
document.querySelectorAll('[data-quiz]').forEach(box=>{const q=QUIZ[Number(box.dataset.quiz)];box.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{const j=Number(btn.dataset.choice);box.querySelectorAll('[data-choice]').forEach(b=>b.classList.remove('correct','wrong'));btn.classList.add(j===q.answer?'correct':'wrong');box.querySelector('.feedback').innerHTML=(j===q.answer?'⭕ '+r('せいかい！ '):'🤔 '+r('おしい！ '))+r(q.why);}));});
