import {renderMap} from './map.mjs?v=20261016-swipe1';
import {PORTS,GOODS,CAPACITY,FARE,initialState,restore,report,route,portAt,preview,commit,closeVoyage,nextVoyage,canSpecialClose} from './accounting.mjs';
import {exportSave,parseSave} from './save.mjs?v=20261018-save-mode2';
const KEY='voyage-trade-v1',GUIDE='voyage-trade-guide-v1';
const names={pepper:'コショウ',silk:'絹織物',glass:'ガラス製品'};
const $=id=>document.getElementById(id);
let state=initialState(),pending=null,tab='trade',guideIndex=0;
try{const raw=localStorage.getItem(KEY);if(raw)state=restore(JSON.parse(raw));}catch(e){$('message').textContent='保存データを読み込めませんでした。新しい航海から始めます。';}
const money=n=>'金貨'+n.toLocaleString('ja-JP')+'枚';
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function note(text){$('message').textContent=text;}
function tradeQuantity(){
 const r=report(state),good=$('good').value,buy=$('kind').value==='buy',qty=Number($('qty').value);
 const space=CAPACITY-r.load,price=portAt(state).prices[good],affordable=Math.floor(r.cash/price);
 const max=buy?Math.min(space,affordable):r.inventory[good].qty;
 let error='';
 if(!Number.isSafeInteger(qty)||qty<1)error='数量は1以上の整数で入力してください。';
 else if(buy&&qty>space)error='船に積めるのは全商品合計で'+CAPACITY+'個までです。あと'+space+'個積めます。数量を減らすか、先に商品を売ってください。';
 else if(buy&&qty>affordable)error='現金が足りません。この数量には'+money(qty*price)+'必要です。いま買えるのは'+max+'個までです。';
 else if(!buy&&qty>max)error=names[good]+'の在庫は'+max+'個です。在庫の数まで売れます。';
 return {qty,max,error,hint:buy?'いま買える数量：最大'+max+'個（積載の空き '+space+'個／現金で買える数 '+affordable+'個）':'いま売れる数量：最大'+max+'個（'+names[good]+'の在庫）'};
}
function updateQuantity(){
 const q=tradeQuantity(),active=state.status==='active';
 $('qtyHint').textContent=q.hint;
 $('qty').max=String(q.max);
 $('qty').setAttribute('aria-invalid',String(active&&Boolean(q.error)));
 $('qtyError').textContent=active?q.error:'';
 $('qtyError').hidden=!active||!q.error;
 $('qtyDecrease').disabled=!active||q.qty<=1;
 $('qtyIncrease').disabled=!active||q.max<1||q.qty>=q.max;
 for(const id of ['kind','good','qty'])$(id).disabled=!active;
 return q;
}
function clearPreviews(){pending=null;$('tradePreview').hidden=true;$('sailPreview').hidden=true;}
function quantityChanged(){clearPreviews();updateQuantity();}
function readableError(e){return ({'Insufficient cash':'現金が足りません。数量を減らしてください。','Ship full':'船の積載上限は全商品合計で'+CAPACITY+'個です。','Insufficient inventory':'在庫が足りません。売る数量を減らしてください。','Invalid nonnegative integer':'数量は1以上の整数で入力してください。','Insufficient fare':'出航するための現金が足りません。','Voyage is closed':'この航海は終了しています。','Last port':'この港が今回の航海の終点です。'})[e.message]||e.message;}
function switchTab(to){tab=to;for(const t of ['trade','journal','report']){$('panel-'+t).hidden=t!==to;$('tab-'+t).setAttribute('aria-selected',String(t===to));$('tab-'+t).tabIndex=t===to?0:-1;} }
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const a=['trade','journal','report'],next=a[(a.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];switchTab(next);$('tab-'+next).focus();e.preventDefault();});
function entriesHTML(entries){return entries.map(e=>'<div class="entries"><div><small>借方（左）</small><br><strong>'+escapeHTML(e.debit)+' '+money(e.amount)+'</strong></div><div><small>貸方（右）</small><br><strong>'+escapeHTML(e.credit)+' '+money(e.amount)+'</strong></div></div>').join('');}
function explain(p){if(p.kind==='buy')return money(p.amount)+'が'+names[p.good]+'に変わりました。まだ利益は増えません。';if(p.kind==='sail')return '港へ移動するために金貨5枚を使います。航海費は利益から差し引きます。';return names[p.good]+'を売りました。売上'+money(p.amount)+'から仕入原価'+money(p.cost)+'を引くと、この取引の粗利益は'+money(p.profit)+'です。';}
function detailed(p){return p.kind==='buy'?'現金という資産が減り、商品という資産が同じ金額増えます。':p.kind==='sail'?'借方は航海費、貸方は現金です。支払った航海費は損益計算書に反映されます。':'売上と、先に仕入れた商品の原価を別々に記録します。先入先出法では古い在庫から売れたと考えます。';}
function showPreview(p,target){const area=$(target);area.hidden=false;area.innerHTML='<h3>📖 仕訳プレビュー</h3><p>'+escapeHTML(explain(p))+'</p>'+entriesHTML(p.entries)+'<p>取引・出航を確定すると取り消せません。</p><details><summary>なぜ？ 詳しく見る</summary><p>'+escapeHTML(detailed(p))+'</p></details><div class="actions"><button id="accept">確定する</button><button id="cancel" class="light">戻って変更する</button></div>';area.querySelector('#accept').addEventListener('click',()=>{try{const action=pending;if(!action)return;const now=preview(state,action);if(JSON.stringify(now)!==JSON.stringify(p))throw new Error('内容が変わりました。再確認してください。');state=commit(state,{...action,id:'v'+state.voyage+'-e'+(state.events.length+1)});save();pending=null;area.hidden=true;note(explain(p));render();}catch(e){note(e.message);pending=null;area.hidden=true;}});area.querySelector('#cancel').addEventListener('click',()=>{pending=null;area.hidden=true;});}
function begin(kind){clearPreviews();note('');if(kind!=='sail'&&updateQuantity().error){$('qty').focus();return;}try{pending=kind==='sail'?{kind:'sail'}:{kind:$('kind').value,good:$('good').value,qty:Number($('qty').value)};const p=preview(state,pending);showPreview(p,kind==='sail'?'sailPreview':'tradePreview');}catch(e){pending=null;note('確認できません：'+readableError(e));}}
$('checkTrade').addEventListener('click',()=>begin('trade'));
$('checkSail').addEventListener('click',()=>begin('sail'));
for(const id of ['kind','good'])$(id).addEventListener('change',quantityChanged);
$('qty').addEventListener('input',quantityChanged);
for(const [id,step] of [['qtyDecrease',-1],['qtyIncrease',1]])$(id).addEventListener('click',()=>{
 const value=Number($('qty').value);
 $('qty').value=String(Number.isSafeInteger(value)&&value>=1?Math.max(1,value+step):1);
 quantityChanged();
});
function render(){
 const r=report(state),port=portAt(state);
 renderMap(state);
 $('summary').innerHTML='<span>第'+state.voyage+'航海・'+(state.voyage%2?'往路':'復路')+'</span><span>'+escapeHTML(port.name)+'</span><span>🪙 '+money(r.cash)+'</span><span>📦 積載 '+r.load+' / '+CAPACITY+'</span>';
 $('prices').querySelector('tbody').innerHTML=PORTS.map(p=>'<tr class="'+(p.id===port.id?'current':'')+'"><td>'+escapeHTML(p.name)+'</td>'+GOODS.map(g=>'<td>'+p.prices[g]+'</td>').join('')+'</tr>').join('');
 $('holding').textContent='いまの在庫：'+GOODS.map(g=>names[g]+' '+r.inventory[g].qty).join(' ／ ');
 clearPreviews();updateQuantity();
 $('nextPort').textContent=state.stop===3?'この港が今回の航海の終点です。':'次の港：'+PORTS.find(p=>p.id===route(state.voyage)[state.stop+1]).name+'（航海費 '+money(FARE)+'）';
 $('checkTrade').hidden=state.status!=='active';$('checkSail').hidden=state.status!=='active'||state.stop===3;
 $('checkSail').disabled=r.cash<FARE;
 $('closeBtn').hidden=state.status!=='active'||state.stop!==3;
 $('specialBtn').hidden=!canSpecialClose(state);
 $('journal').innerHTML=r.journal.map((j,i)=>'<div class="journal-entry"><strong>'+(i+1)+'. '+(j.voyage?'第'+j.voyage+'航海':'商会設立')+'</strong>'+entriesHTML([j])+'<details><summary>なぜ？ 詳しく見る</summary><p>借方と貸方に同じ金額を記録しています。</p></details></div>').join('');
 const row=(label,value)=>'<div class="statement-row"><span>'+escapeHTML(label)+'</span><strong>'+money(value)+'</strong></div>';
 const assets=row('現金',r.cash)+GOODS.map(g=>row(names[g]+'（'+r.inventory[g].qty+'個）',r.inventory[g].cost)).join('');
 const equity=row('資本金（最初の元手）',r.capital)+row('累積利益',r.profit);
 $('report').innerHTML=
  '<section class="statement" aria-labelledby="pl-title"><h3 id="pl-title">① 損益計算書（P/L）</h3><p class="hint">今回の航海で、いくらもうかった？</p>'+
  row('売上',r.current.sales)+row('売上原価',r.current.cost)+row('航海費',r.current.fares)+
  '<div class="statement-total">'+row('今回の利益',r.current.profit)+'</div></section>'+
  '<section class="statement" aria-labelledby="bs-title"><h3 id="bs-title">② 貸借対照表（B/S）</h3><p class="hint">今ある財産と、そのお金の出どころを比べよう。</p>'+
  '<div class="balance-columns"><div class="balance-side asset-side"><h4>左：資産（持っているもの）</h4>'+assets+
  '<div class="statement-total">'+row('資産合計',r.assets)+'</div></div>'+
  '<div class="balance-side equity-side"><h4>右：負債・純資産（お金の出どころ）</h4>'+
  '<p class="hint">借入金はないため、負債は0枚です。</p>'+row('負債（借金）',0)+equity+
  '<div class="statement-total">'+row('負債・純資産合計',r.capital+r.profit)+'</div></div></div>'+
  '<p class="balance-check" role="status">'+(r.assets===r.capital+r.profit?'✓ 左右の合計は一致しています。':'左右の金額が一致しません。')+'</p></section>';
 $('outcome').hidden=state.status==='active';
 if(state.status!=='active'){
   $('result').innerHTML='<p>今回の利益：<strong>'+money(r.current.profit)+'</strong> ／ 累積利益：<strong>'+money(r.profit)+'</strong></p><p>現金：'+money(r.cash)+' ／ 在庫原価：'+money(r.assets-r.cash)+' ／ 総資産：'+money(r.assets)+'</p><p>売上'+money(r.current.sales)+' − 原価'+money(r.current.cost)+' − 航海費'+money(r.current.fares)+' ＝ 今回の利益'+money(r.current.profit)+'</p><p>'+(r.assets>r.cash?'売れ残った商品も、仕入原価で財産として残っています。':'商品を売り切ったので、財産は現金になっています。')+'</p><p>次のヒント：港の相場と航海費を比べて、買う商品と売る場所を考えてみましょう。</p>';
 }
 $('continueBtn').hidden=state.status!=='closed';
}
$('closeBtn').addEventListener('click',()=>{if(!confirm('この航海の決算を確定しますか？'))return;state=closeVoyage(state);save();render();$('outcome').scrollIntoView({behavior:'smooth'});});
$('specialBtn').addEventListener('click',()=>{if(!confirm('特別決算して航海を終了しますか？'))return;state=closeVoyage(state,{special:true});save();render();$('outcome').scrollIntoView({behavior:'smooth'});});
$('continueBtn').addEventListener('click',()=>{state=nextVoyage(state);save();render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});});
$('restartBtn').addEventListener('click',()=>{if(!confirm('これまでの取引履歴を消して最初から始めますか？'))return;state=initialState();save();render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});});
function saveNote(text,error=false){$('saveMessage').textContent=text;$('saveMessage').classList.toggle('error',error);}
function saveError(e){return ({'Not JSON':'JSONファイルとして読み込めませんでした。','Not a save file':'このゲームのセーブデータではありません。','Company save':'これは株式会社版のデータです。自由経営モードでは読み込めません。株式会社版でアップロードしてください。','Unsupported format':'このバージョンでは読み込めない形式です。'})[e.message]||'セーブデータの形式が正しくありません（'+e.message+'）。';}
$('exportBtn').addEventListener('click',()=>{try{const {filename,json}=exportSave(state);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);saveNote('保存しました：'+filename);}catch(e){saveNote('保存できませんでした：'+e.message,true);}});
$('importFile').addEventListener('change',async()=>{const file=$('importFile').files[0];$('importFile').value='';if(!file)return;try{const next=parseSave(await file.text());if(!confirm('いまの進行状況を、ファイルの内容（第'+next.voyage+'航海）に置き換えますか？'))return;state=next;save();pending=null;render();switchTab('trade');saveNote('読み込みました：第'+state.voyage+'航海の続きから始めます。');}catch(e){saveNote('読み込めませんでした：'+saveError(e),true);}});
const steps=['① 相場を比べよう。4つの港で商品の値段が違います。安い港で買い、高い港で売る方法を考えましょう。','② 商品を売買しよう。商品と数量を選んだら、仕訳を確認してから確定します。','③ 帳簿と決算書を見よう。「売買」「仕訳帳」「決算書」の3つのタブを切り替えられます。'];
function showGuide(){guideIndex=0;guideRender();$('guide').showModal();}
function guideRender(){$('guideStep').textContent=steps[guideIndex];$('guideBack').disabled=guideIndex===0;$('guideNext').textContent=guideIndex===2?'ゲームをはじめる':'つぎへ';}
function finishGuide(){$('guide').close();localStorage.setItem(GUIDE,'seen');}
$('guideBtn').addEventListener('click',showGuide);$('guideBack').addEventListener('click',()=>{guideIndex--;guideRender();});$('guideNext').addEventListener('click',()=>{if(guideIndex===2)finishGuide();else{guideIndex++;guideRender();}});$('guideSkip').addEventListener('click',finishGuide);
render();if(!localStorage.getItem(GUIDE))showGuide();
