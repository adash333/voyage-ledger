import {renderMap,configureMap} from '../map.mjs?v=20261018-atlas-en1';
import {PORTS,GOODS,CAPACITY,FARE,initialState,restore,report,route,portAt,preview,commit,closeVoyage,nextVoyage,canSpecialClose} from '../accounting.mjs';
import {exportSave,parseSave} from '../save.mjs?v=20261018-save-mode2';
// English UI for the free trading mode. Shares the accounting engine, the map module and the save key with the Japanese page.
const KEY='voyage-trade-v1',GUIDE='voyage-trade-guide-v1';
const names={pepper:'Pepper',silk:'Silk',glass:'Glassware'};
const units={pepper:'bags',silk:'bolts',glass:'pieces'};
const portNames={venice:'Venice',alexandria:'Alexandria',constantinople:'Constantinople',barcelona:'Barcelona'};
const accounts={'現金':'Cash','資本金':'Capital','商品':'Merchandise','売上':'Sales','売上原価':'Cost of goods sold','航海費':'Voyage expenses'};
const account=label=>accounts[label]||label;
const portName=id=>portNames[id]||id;
const direction=v=>v%2?'outbound':'return';
configureMap({
 portName:port=>portName(port.id),
 descriptions:{venice:'The voyage begins in the city of canals.',alexandria:'A port that links trade by sea and by land.',constantinople:'A port where East and West meet.',barcelona:'A busy port open to the western Mediterranean.'},
 goods:names,
 coinUnit:' coins',
 shipTitle:name=>'Your ship at '+name,
 currentText:name=>'Now at: '+name,
 mapAria:(name,list)=>'A trading voyage around four ports. Current port: '+name+'. Route: '+list.join(', '),
 location:(name,voyage)=>'⛵ Current port: '+name+' / Voyage '+voyage+' ('+direction(voyage)+')',
 stepCurrent:'Here',
 zoomIn:'Enlarge map text',
 zoomOut:'Show whole map'
});
const $=id=>document.getElementById(id);
let state=initialState(),pending=null,tab='trade',guideIndex=0;
try{const raw=localStorage.getItem(KEY);if(raw)state=restore(JSON.parse(raw));}catch(e){$('message').textContent='Could not load the saved data. Starting a new voyage.';}
const money=n=>n.toLocaleString('en-US')+(n===1?' gold coin':' gold coins');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function note(text){$('message').textContent=text;}
function tradeQuantity(){
 const r=report(state),good=$('good').value,buy=$('kind').value==='buy',qty=Number($('qty').value);
 const space=CAPACITY-r.load,price=portAt(state).prices[good],affordable=Math.floor(r.cash/price);
 const max=buy?Math.min(space,affordable):r.inventory[good].qty;
 let error='';
 if(!Number.isSafeInteger(qty)||qty<1)error='Enter a whole number of 1 or more.';
 else if(buy&&qty>space)error='The ship carries up to '+CAPACITY+' units in total. There is room for '+space+' more. Reduce the quantity or sell some goods first.';
 else if(buy&&qty>affordable)error='Not enough cash. This quantity costs '+money(qty*price)+'. You can buy up to '+max+' right now.';
 else if(!buy&&qty>max)error='You have '+max+' '+units[good]+' of '+names[good]+'. You can sell up to that amount.';
 return {qty,max,error,hint:buy?'You can buy up to '+max+' now (cargo space '+space+' / affordable '+affordable+')':'You can sell up to '+max+' now ('+names[good]+' in stock)'};
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
function readableError(e){return ({'Insufficient cash':'Not enough cash. Reduce the quantity.','Ship full':'The ship carries up to '+CAPACITY+' units in total.','Insufficient inventory':'Not enough stock. Reduce the quantity to sell.','Invalid nonnegative integer':'Enter a whole number of 1 or more.','Insufficient fare':'Not enough cash to pay the fare.','Voyage is closed':'This voyage has ended.','Last port':'This port is the final stop of this voyage.'})[e.message]||e.message;}
function switchTab(to){tab=to;for(const t of ['trade','journal','report']){$('panel-'+t).hidden=t!==to;$('tab-'+t).setAttribute('aria-selected',String(t===to));$('tab-'+t).tabIndex=t===to?0:-1;} }
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const a=['trade','journal','report'],next=a[(a.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];switchTab(next);$('tab-'+next).focus();e.preventDefault();});
function entriesHTML(entries){return entries.map(e=>'<div class="entries"><div><small>Debit (left)</small><br><strong>'+escapeHTML(account(e.debit))+' '+money(e.amount)+'</strong></div><div><small>Credit (right)</small><br><strong>'+escapeHTML(account(e.credit))+' '+money(e.amount)+'</strong></div></div>').join('');}
function explain(p){if(p.kind==='buy')return money(p.amount)+' of cash became '+names[p.good]+'. Profit does not change yet.';if(p.kind==='sail')return 'Sailing to the next port costs '+money(FARE)+'. Voyage expenses are subtracted from profit.';return 'You sold '+names[p.good]+'. Sales of '+money(p.amount)+' minus the purchase cost of '+money(p.cost)+' gives a gross profit of '+money(p.profit)+' on this trade.';}
function detailed(p){return p.kind==='buy'?'The asset Cash goes down and the asset Merchandise goes up by the same amount.':p.kind==='sail'?'The debit is Voyage expenses and the credit is Cash. The fare you paid appears on the income statement.':'Sales and the cost of the goods you bought earlier are recorded separately. Under first-in, first-out (FIFO), the oldest stock is sold first.';}
function showPreview(p,target){const area=$(target);area.hidden=false;area.innerHTML='<h3>📖 Journal preview</h3><p>'+escapeHTML(explain(p))+'</p>'+entriesHTML(p.entries)+'<p>Once confirmed, a trade or departure cannot be undone.</p><details><summary>Why? Learn more</summary><p>'+escapeHTML(detailed(p))+'</p></details><div class="actions"><button id="accept">Confirm</button><button id="cancel" class="light">Go back and change</button></div>';area.querySelector('#accept').addEventListener('click',()=>{try{const action=pending;if(!action)return;const now=preview(state,action);if(JSON.stringify(now)!==JSON.stringify(p))throw new Error('The details changed. Please review again.');state=commit(state,{...action,id:'v'+state.voyage+'-e'+(state.events.length+1)});save();pending=null;area.hidden=true;note(explain(p));render();}catch(e){note(e.message);pending=null;area.hidden=true;}});area.querySelector('#cancel').addEventListener('click',()=>{pending=null;area.hidden=true;});}
function begin(kind){clearPreviews();note('');if(kind!=='sail'&&updateQuantity().error){$('qty').focus();return;}try{pending=kind==='sail'?{kind:'sail'}:{kind:$('kind').value,good:$('good').value,qty:Number($('qty').value)};const p=preview(state,pending);showPreview(p,kind==='sail'?'sailPreview':'tradePreview');}catch(e){pending=null;note('Cannot review: '+readableError(e));}}
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
 $('summary').innerHTML='<span>Voyage '+state.voyage+' · '+direction(state.voyage)+'</span><span>'+escapeHTML(portName(port.id))+'</span><span>🪙 '+money(r.cash)+'</span><span>📦 Cargo '+r.load+' / '+CAPACITY+'</span>';
 $('prices').querySelector('tbody').innerHTML=PORTS.map(p=>'<tr class="'+(p.id===port.id?'current':'')+'"><td>'+escapeHTML(portName(p.id))+'</td>'+GOODS.map(g=>'<td>'+p.prices[g]+'</td>').join('')+'</tr>').join('');
 $('holding').textContent='Current stock: '+GOODS.map(g=>names[g]+' '+r.inventory[g].qty).join(' / ');
 clearPreviews();updateQuantity();
 $('nextPort').textContent=state.stop===3?'This port is the final stop of this voyage.':'Next port: '+portName(route(state.voyage)[state.stop+1])+' (fare '+money(FARE)+')';
 $('checkTrade').hidden=state.status!=='active';$('checkSail').hidden=state.status!=='active'||state.stop===3;
 $('checkSail').disabled=r.cash<FARE;
 $('closeBtn').hidden=state.status!=='active'||state.stop!==3;
 $('specialBtn').hidden=!canSpecialClose(state);
 $('journal').innerHTML=r.journal.map((j,i)=>'<div class="journal-entry"><strong>'+(i+1)+'. '+(j.voyage?'Voyage '+j.voyage:'Founding the company')+'</strong>'+entriesHTML([j])+'<details><summary>Why? Learn more</summary><p>The same amount is recorded on the debit side and the credit side.</p></details></div>').join('');
 const row=(label,value)=>'<div class="statement-row"><span>'+escapeHTML(label)+'</span><strong>'+money(value)+'</strong></div>';
 const assets=row('Cash',r.cash)+GOODS.map(g=>row(names[g]+' ('+r.inventory[g].qty+' '+units[g]+')',r.inventory[g].cost)).join('');
 const equity=row('Capital (initial funds)',r.capital)+row('Retained profit',r.profit);
 $('report').innerHTML=
  '<section class="statement" aria-labelledby="pl-title"><h3 id="pl-title">① Income statement (P/L)</h3><p class="hint">How much did this voyage earn?</p>'+
  row('Sales',r.current.sales)+row('Cost of goods sold',r.current.cost)+row('Voyage expenses',r.current.fares)+
  '<div class="statement-total">'+row('Profit this voyage',r.current.profit)+'</div></section>'+
  '<section class="statement" aria-labelledby="bs-title"><h3 id="bs-title">② Balance sheet (B/S)</h3><p class="hint">Compare what you own with where the money came from.</p>'+
  '<div class="balance-columns"><div class="balance-side asset-side"><h4>Left: Assets (what you own)</h4>'+assets+
  '<div class="statement-total">'+row('Total assets',r.assets)+'</div></div>'+
  '<div class="balance-side equity-side"><h4>Right: Liabilities &amp; equity (where the money came from)</h4>'+
  '<p class="hint">There are no loans, so liabilities are 0.</p>'+row('Liabilities (loans)',0)+equity+
  '<div class="statement-total">'+row('Total liabilities & equity',r.capital+r.profit)+'</div></div></div>'+
  '<p class="balance-check" role="status">'+(r.assets===r.capital+r.profit?'✓ Both sides match.':'The two sides do not match.')+'</p></section>';
 $('outcome').hidden=state.status==='active';
 if(state.status!=='active'){
   $('result').innerHTML='<p>Profit this voyage: <strong>'+money(r.current.profit)+'</strong> / Retained profit: <strong>'+money(r.profit)+'</strong></p><p>Cash: '+money(r.cash)+' / Inventory at cost: '+money(r.assets-r.cash)+' / Total assets: '+money(r.assets)+'</p><p>Sales '+money(r.current.sales)+' − cost '+money(r.current.cost)+' − voyage expenses '+money(r.current.fares)+' = profit this voyage '+money(r.current.profit)+'</p><p>'+(r.assets>r.cash?'Unsold goods stay on the books as assets at their purchase cost.':'You sold everything, so all of your assets are cash.')+'</p><p>Next tip: compare port prices with the fare, and think about what to buy and where to sell it.</p>';
 }
 $('continueBtn').hidden=state.status!=='closed';
}
$('closeBtn').addEventListener('click',()=>{if(!confirm('Close the books for this voyage?'))return;state=closeVoyage(state);save();render();$('outcome').scrollIntoView({behavior:'smooth'});});
$('specialBtn').addEventListener('click',()=>{if(!confirm('Run a special closing and end the voyage?'))return;state=closeVoyage(state,{special:true});save();render();$('outcome').scrollIntoView({behavior:'smooth'});});
$('continueBtn').addEventListener('click',()=>{state=nextVoyage(state);save();render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});});
$('restartBtn').addEventListener('click',()=>{if(!confirm('Erase all trade history and start over?'))return;state=initialState();save();render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});});
function saveNote(text,error=false){$('saveMessage').textContent=text;$('saveMessage').classList.toggle('error',error);}
function saveError(e){return ({'Not JSON':'The file could not be read as JSON.','Not a save file':'This is not a save file for this game.','Company save':'This is Company Mode data. It cannot be loaded in Free Trading Mode. Upload it in Company Mode.','Unsupported format':'This file format is not supported.'})[e.message]||'The save data is not valid ('+e.message+').';}
$('exportBtn').addEventListener('click',()=>{try{const {filename,json}=exportSave(state);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);saveNote('Saved: '+filename);}catch(e){saveNote('Could not save: '+e.message,true);}});
$('importFile').addEventListener('change',async()=>{const file=$('importFile').files[0];$('importFile').value='';if(!file)return;try{const next=parseSave(await file.text());if(!confirm('Replace your current progress with the file (voyage '+next.voyage+')?'))return;state=next;save();pending=null;render();switchTab('trade');saveNote('Loaded: continuing from voyage '+state.voyage+'.');}catch(e){saveNote('Could not load: '+saveError(e),true);}});
const steps=['① Compare the prices. Goods cost different amounts in the four ports. Think about buying where it is cheap and selling where it is expensive.','② Buy and sell goods. Choose the goods and quantity, review the journal entry, then confirm.','③ Check the books and the statements. Switch between the Trade, Journal and Statements tabs.'];
function showGuide(){guideIndex=0;guideRender();$('guide').showModal();}
function guideRender(){$('guideStep').textContent=steps[guideIndex];$('guideBack').disabled=guideIndex===0;$('guideNext').textContent=guideIndex===2?'Start the game':'Next';}
function finishGuide(){$('guide').close();localStorage.setItem(GUIDE,'seen');}
$('guideBtn').addEventListener('click',showGuide);$('guideBack').addEventListener('click',()=>{guideIndex--;guideRender();});$('guideNext').addEventListener('click',()=>{if(guideIndex===2)finishGuide();else{guideIndex++;guideRender();}});$('guideSkip').addEventListener('click',finishGuide);
render();if(!localStorage.getItem(GUIDE))showGuide();
