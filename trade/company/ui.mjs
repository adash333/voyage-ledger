// SPEC-017 v1.2: browser UI for the company mode, shared by /trade/company/ (ja) and /trade/company/en/.
// All text comes from the locale object `L`; the accounting engine is pure and lives in accounting.mjs.
import {renderMap,configureMap} from '../map.mjs?v=20261016-swipe1';
import * as C from './accounting.mjs';
import {exportSave,parseSave} from './save.mjs?v=20261018-save-mode2';
const {PORTS,GOODS,route,initialState,restore,report,portAt,preview,commit,nextVoyage,canSpecialClose,canDefault,REPAY_UNIT,ISSUE_UNITS,LOAN_DEADLINE,SHIP_PRICE,UNLOCK_VOYAGES,UNLOCK_EQUITY,EXIT_MIN_VOYAGES,EXIT_MIN_HARD_VOYAGES,EXIT_MULTIPLE}=C;
export const KEY='voyage-company-v1',SETUP='voyage-company-setup-v1';
const TABS=['trade','fleet','journal','report','records'];
const $=id=>document.getElementById(id);
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function startApp(L){
 configureMap(L.map);
 let state=initialState(),pending=null,tab='trade',detail=null;
 try{const raw=localStorage.getItem(KEY);if(raw)state=restore(JSON.parse(raw));}catch(e){$('message').textContent=L.loadFailed;}
 const money=L.money,acc=k=>L.accounts[k]||k,portName=id=>L.portName(PORTS.find(p=>p.id===id));
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const note=text=>{$('message').textContent=text;};
 const nextId=()=>'v'+state.voyage+'-e'+(state.events.length+1)+'-'+Date.now().toString(36);
 const readable=e=>L.errors[e.message]||e.message;
 function entriesHTML(entries){return entries.map(e=>'<div class="entries"><div><small>'+L.debit+'</small><br><strong>'+escapeHTML(acc(e.debit))+' '+money(e.amount)+'</strong></div><div><small>'+L.credit+'</small><br><strong>'+escapeHTML(acc(e.credit))+' '+money(e.amount)+'</strong></div></div>').join('');}
 function switchTab(to){tab=to;for(const t of TABS){$('panel-'+t).hidden=t!==to;$('tab-'+t).setAttribute('aria-selected',String(t===to));$('tab-'+t).tabIndex=t===to?0:-1;}}
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
 document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const next=TABS[(TABS.indexOf(tab)+(e.key==='ArrowRight'?1:TABS.length-1))%TABS.length];switchTab(next);$('tab-'+next).focus();e.preventDefault();});
 function clearPreviews(){pending=null;for(const id of ['tradePreview','sailPreview','bankPreview','closePreview','outcomePreview'])$(id).hidden=true;}
 // ---- generic preview → confirm → commit ----
 function showPreview(p,target,{explain,detailed,confirmLabel}){
  const area=$(target);area.hidden=false;
  area.innerHTML='<h3>'+L.previewTitle+'</h3><p>'+escapeHTML(explain)+'</p>'+(p.entries.length?entriesHTML(p.entries):'<p class="hint">'+L.noEntry+'</p>')+'<p>'+L.irreversible+'</p>'+(detailed?'<details><summary>'+L.why+'</summary><p>'+escapeHTML(detailed)+'</p></details>':'')+'<div class="actions"><button id="accept">'+escapeHTML(confirmLabel||L.confirm)+'</button><button id="cancel" class="light">'+L.cancel+'</button></div>';
  area.querySelector('#accept').addEventListener('click',()=>{
   try{const action=pending;if(!action)return;const now=preview(state,action);const strip=x=>JSON.stringify({...x,entries:undefined});if(strip(now)!==strip(p))throw new Error(L.changed);
    const done=commit(state,{...action,id:nextId()});const r=report(done);state=done;save();pending=null;area.hidden=true;note(explain);render();afterCommit(action,r);
   }catch(e){note(readable(e));pending=null;area.hidden=true;}
  });
  area.querySelector('#cancel').addEventListener('click',()=>{pending=null;area.hidden=true;});
  area.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function afterCommit(action,r){
  if(action.kind==='repay'&&r.loan===0)celebrate(L.celebrateRepaid(r));
  if(action.kind==='exit')celebrate(L.celebrateExit(r));
  if(['close','special','default','exit'].includes(action.kind)){$('outcome').scrollIntoView({behavior:'smooth'});}
  if(action.kind==='difficulty')switchTab('trade');
 }
 function celebrate(text){$('celebrate').hidden=false;$('celebrate').innerHTML='<h2>🎉 '+escapeHTML(L.celebrateTitle)+'</h2><p>'+escapeHTML(text)+'</p>';}
 function begin(action,target,texts){clearPreviews();note('');try{pending=action;const p=preview(state,action);showPreview(p,target,texts(p));}catch(e){pending=null;note(L.cannot+readable(e));}}
 // ---- trade panel ----
 function tradeQuantity(){
  const r=report(state),good=$('good').value,buy=$('kind').value==='buy',qty=Number($('qty').value);
  const space=r.capacity-r.load,price=portAt(state).prices[good],affordable=Math.floor(r.cash/price);
  const max=buy?Math.min(space,affordable):r.inventory[good].qty;
  let error='';
  if(!Number.isSafeInteger(qty)||qty<1)error=L.qtyInteger;
  else if(buy&&qty>space)error=L.qtyFull(r.capacity,space);
  else if(buy&&qty>affordable)error=L.qtyCash(money(qty*price),max);
  else if(!buy&&qty>max)error=L.qtyStock(L.goods[good],max);
  return {qty,max,error,hint:buy?L.qtyBuyHint(max,space,affordable):L.qtySellHint(max,L.goods[good])};
 }
 function updateQuantity(){
  const q=tradeQuantity(),active=state.status==='active';
  $('qtyHint').textContent=q.hint;$('qty').max=String(q.max);
  $('qty').setAttribute('aria-invalid',String(active&&Boolean(q.error)));
  $('qtyError').textContent=active?q.error:'';$('qtyError').hidden=!active||!q.error;
  $('qtyDecrease').disabled=!active||q.qty<=1;$('qtyIncrease').disabled=!active||q.max<1||q.qty>=q.max;
  for(const id of ['kind','good','qty'])$(id).disabled=!active;
  return q;
 }
 const quantityChanged=()=>{clearPreviews();updateQuantity();};
 $('checkTrade').addEventListener('click',()=>{clearPreviews();if(updateQuantity().error){$('qty').focus();return;}begin({kind:$('kind').value,good:$('good').value,qty:Number($('qty').value)},'tradePreview',p=>({explain:L.explainTrade(p),detailed:L.detailTrade(p)}));});
 $('checkSail').addEventListener('click',()=>begin({kind:'sail'},'sailPreview',p=>({explain:L.explainSail(p),detailed:L.detailSail})));
 for(const id of ['kind','good'])$(id).addEventListener('change',quantityChanged);
 $('qty').addEventListener('input',quantityChanged);
 for(const [id,step] of [['qtyDecrease',-1],['qtyIncrease',1]])$(id).addEventListener('click',()=>{const v=Number($('qty').value);$('qty').value=String(Number.isSafeInteger(v)&&v>=1?Math.max(1,v+step):1);quantityChanged();});
 $('closeBtn').addEventListener('click',()=>begin({kind:'close',at:new Date().toISOString()},'closePreview',p=>({explain:L.explainClose(p),detailed:L.detailClose,confirmLabel:L.confirmClose})));
 $('specialBtn').addEventListener('click',()=>begin({kind:'special',at:new Date().toISOString()},'closePreview',p=>({explain:L.explainSpecial(p),detailed:L.detailSpecial,confirmLabel:L.confirmSpecial})));
 // ---- fleet / bank panel ----
 $('shipBtn').addEventListener('click',()=>begin({kind:'ship'},'bankPreview',p=>({explain:L.explainShip(p),detailed:L.detailShip})));
 $('repayBtn').addEventListener('click',()=>begin({kind:'repay',amount:Number($('repayAmount').value)},'bankPreview',p=>({explain:L.explainRepay(p),detailed:L.detailRepay})));
 $('issueBtn').addEventListener('click',()=>begin({kind:'issue',shares:Number($('issueShares').value)},'bankPreview',p=>({explain:L.explainIssue(p),detailed:L.detailIssue})));
 $('dividendBtn').addEventListener('click',()=>begin({kind:'dividend',perShare:Number($('dividendPerShare').value)},'bankPreview',p=>({explain:L.explainDividend(p),detailed:L.detailDividend})));
 $('exitBtn').addEventListener('click',()=>begin({kind:'exit'},'bankPreview',p=>({explain:L.explainExit(p),detailed:L.detailExit,confirmLabel:L.confirmExit})));
 $('hardBtn').addEventListener('click',()=>begin({kind:'difficulty',value:'hard'},'bankPreview',p=>({explain:L.explainHard(p),detailed:L.detailHard,confirmLabel:L.confirmHard})));
 $('defaultBtn').addEventListener('click',()=>begin({kind:'default'},'outcomePreview',p=>({explain:L.explainDefault(p),detailed:L.detailDefault,confirmLabel:L.confirmDefault})));
 // ---- flow buttons ----
 $('continueBtn').addEventListener('click',()=>{try{state=nextVoyage(state);save();clearPreviews();render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});}catch(e){note(readable(e));}});
 const restart=()=>{if(!confirm(L.confirmRestart))return;state=initialState();save();clearPreviews();$('celebrate').hidden=true;render();switchTab('trade');scrollTo({top:0,behavior:'smooth'});showSetup();};
 $('restartBtn').addEventListener('click',restart);$('restartAnytime').addEventListener('click',restart);
 // ---- save / load ----
 $('importBtn').addEventListener('click',()=>$('importFile').click());
 const saveNote=(text,error=false)=>{$('saveMessage').textContent=text;$('saveMessage').classList.toggle('error',error);};
 $('exportBtn').addEventListener('click',()=>{try{const {filename,json}=exportSave(state);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);saveNote(L.saved(filename));}catch(e){saveNote(L.saveFailed(e.message),true);}});
 $('importFile').addEventListener('change',async()=>{const file=$('importFile').files[0];$('importFile').value='';if(!file)return;try{const next=parseSave(await file.text());if(!confirm(L.confirmImport(next.voyage)))return;state=next;save();clearPreviews();render();switchTab('trade');saveNote(L.loaded(state.voyage));}catch(e){saveNote(L.loadError(e),true);}});
 // ---- setup (difficulty) dialog ----
 function showSetup(){$('setup').showModal();}
 $('setupEasy').addEventListener('click',()=>{$('setup').close();localStorage.setItem(SETUP,'done');});
 $('setupHard').addEventListener('click',()=>{try{state=commit(state,{kind:'difficulty',value:'hard',id:nextId()});save();render();}catch(e){note(readable(e));}$('setup').close();localStorage.setItem(SETUP,'done');});
 // ---- render ----
 const row=(label,value,cls='')=>'<div class="statement-row'+(cls?' '+cls:'')+'"><span>'+escapeHTML(label)+'</span><strong>'+money(value)+'</strong></div>';
 function render(){
  const r=report(state),port=portAt(state),hard=r.difficulty==='hard',active=state.status==='active',closed=state.status==='closed';
  renderMap(state);
  document.body.classList.toggle('hard',hard);
  $('summary').innerHTML='<span class="badge '+(hard?'hard':'easy')+'">'+escapeHTML(hard?L.hardBadge:L.easyBadge)+'</span><span>'+escapeHTML(L.voyageLabel(state.voyage))+'</span><span>'+escapeHTML(L.portName(port))+'</span><span>🪙 '+money(r.cash)+'</span><span>🏦 '+escapeHTML(L.loanShort)+' '+money(r.loan+r.accrued)+'</span><span>📦 '+r.load+' / '+r.capacity+'</span><span>⛵ '+escapeHTML(L.shipsShort(r.ships.length))+'</span>';
  $('prices').querySelector('tbody').innerHTML=PORTS.map(p=>'<tr class="'+(p.id===port.id?'current':'')+'"><td>'+escapeHTML(L.portName(p))+'</td>'+GOODS.map(g=>'<td>'+p.prices[g]+'</td>').join('')+'</tr>').join('');
  $('holding').textContent=L.holding(GOODS.map(g=>L.goods[g]+' '+r.inventory[g].qty).join(' / '));
  clearPreviews();updateQuantity();
  $('nextPort').textContent=state.stop===3?L.lastPort:L.nextPort(portName(route(state.voyage)[state.stop+1]),money(r.fare),r.ships.length);
  $('checkTrade').hidden=!active;$('checkSail').hidden=!active||state.stop===3;$('checkSail').disabled=r.cash<r.fare;
  $('closeBtn').hidden=!active||state.stop!==3;$('specialBtn').hidden=!canSpecialClose(state);
  $('deadlineNote').hidden=!(active&&state.voyage>=LOAN_DEADLINE&&(r.loan||r.accrued));
  $('deadlineNote').textContent=L.deadlineNote(money(r.loan+r.accrued+(r.closing?.interestDue??0)),money(r.cash));
  // fleet & bank
  $('shipList').innerHTML=r.ships.map((sh,i)=>'<li>'+escapeHTML(L.shipItem(i+1,sh.bought,sh.bookValue))+'</li>').join('');
  $('shipFacts').textContent=L.shipFacts(r.ships.length,r.capacity,money(r.fare),money(r.closing?r.closing.depreciation:0));
  $('shipBtn').hidden=!active;$('shipBtn').disabled=r.cash<SHIP_PRICE;
  $('loanFacts').innerHTML='<p>'+escapeHTML(L.loanFacts(money(r.loan),money(r.accrued),r.settings.rate,money(r.closing?r.closing.interestDue:Math.ceil(r.loan*r.settings.rate/100))))+'</p><p class="hint">'+escapeHTML(L.deadlineFacts(LOAN_DEADLINE,state.voyage))+'</p>'+(hard?'<p class="hint">'+escapeHTML(L.depositFacts(money(r.closing?r.closing.deposit:0)))+'</p>':'');
  const repayOptions=[];for(let a=REPAY_UNIT;a<=Math.min(r.loan,r.cash);a+=REPAY_UNIT)repayOptions.push(a);
  $('repayAmount').innerHTML=repayOptions.map(a=>'<option value="'+a+'"'+(a===repayOptions.at(-1)?' selected':'')+'>'+money(a)+'</option>').join('');
  $('repayForm').hidden=!(closed&&r.loan>0);$('repayBtn').disabled=!repayOptions.length;
  $('repayHint').textContent=closed?(r.loan?L.repayHint:L.repaid):L.onlyAtClosing;
  $('shareFacts').innerHTML='<p>'+escapeHTML(L.shareFacts(r.totalShares,r.outside,r.founderRatio))+'</p><p>'+escapeHTML(L.equityFacts(money(r.equity),money(r.capital),money(r.surplus),money(r.retained)))+'</p><p class="hint">'+escapeHTML(r.unlocked?L.unlocked:L.lockedWhy(UNLOCK_VOYAGES,r.closedCount,money(UNLOCK_EQUITY),money(r.equity),r.accrued>0))+'</p><p>'+escapeHTML(L.founderDividends(money(r.founderDividends)))+'</p>';
  $('issueForm').hidden=!(closed&&r.unlocked);$('dividendForm').hidden=!(closed&&r.unlocked);
  if(closed&&r.unlocked){const price=Math.max(1,Math.ceil(r.equity/r.totalShares));$('issueHint').textContent=L.issueHint(money(price));$('dividendPerShare').max=String(Math.max(0,Math.floor(Math.min(r.retained,r.cash)/r.totalShares)));$('dividendHint').textContent=L.dividendHint(r.totalShares,money(Math.min(r.retained,r.cash)));}
  $('hardSwitch').hidden=!(active&&!hard&&state.stop===0&&!state.events.some(e=>e.voyage===state.voyage));
  $('exitBox').hidden=!hard;
  if(hard){
   const q=r.exitQuote;
   $('exitFacts').innerHTML='<ul class="checklist">'+[[r.hardClosed>=EXIT_MIN_HARD_VOYAGES,L.exitCondHard(EXIT_MIN_HARD_VOYAGES,r.hardClosed)],[r.closedCount>=EXIT_MIN_VOYAGES,L.exitCondVoyages(EXIT_MIN_VOYAGES,r.closedCount)],[r.loan===0&&r.accrued===0,L.exitCondDebt],[closed,L.exitCondClosing]].map(([ok,t])=>'<li>'+(ok?'✅':'⬜')+' '+escapeHTML(t)+'</li>').join('')+'</ul>'+(q?'<p>'+escapeHTML(L.exitQuote(money(q.equity),money(Math.max(0,q.avgProfit)),EXIT_MULTIPLE,money(q.value),q.shares,money(q.price),money(q.proceeds)))+'</p>'+(q.undiluted>q.proceeds?'<p class="hint">'+escapeHTML(L.exitDilution(money(q.undiluted)))+'</p>':''):'<p class="hint">'+escapeHTML(L.exitNoQuote)+'</p>');
   $('exitBtn').hidden=!r.canExit;
  }
  // journal
  $('journal').innerHTML=r.journal.map((j,i)=>'<div class="journal-entry"><strong>'+(i+1)+'. '+escapeHTML(j.voyage?L.voyageLabel(j.voyage):L.founding)+(j.good?' · '+escapeHTML(L.goods[j.good]):'')+'</strong>'+entriesHTML([j])+'<details><summary>'+L.why+'</summary><p>'+escapeHTML(L.journalWhy[j.kind]||L.journalWhyDefault)+'</p></details></div>').join('');
  // statements
  const cur=r.current,pending_=r.closing;
  const plRows=row(acc('sales'),cur.sales)+row(acc('cogs'),cur.cost)+row(acc('fares'),cur.fares)+row(acc('interest'),cur.interest)+(hard||cur.deposit?row(acc('depositInterest'),cur.deposit):'')+row(acc('depreciation'),cur.depreciation);
  const inv=GOODS.map(g=>row(L.goods[g]+' ('+r.inventory[g].qty+')',r.inventory[g].cost)).join('');
  const projected=pending_?cur.sales-cur.cost-cur.fares-pending_.interestDue+pending_.deposit-pending_.depreciation:null;
  $('report').innerHTML=
   '<section class="statement"><h3>'+L.plTitle+'</h3><p class="hint">'+escapeHTML(L.plHint)+'</p>'+plRows+'<div class="statement-total">'+row(L.profitNow,cur.closed?cur.profit:cur.sales-cur.cost-cur.fares)+'</div>'+(active?'<p class="hint">'+escapeHTML(L.pendingNote(money(pending_.interestDue),money(pending_.depreciation),hard?money(pending_.deposit):null,money(projected)))+'</p>':'')+'</section>'+
   '<section class="statement"><h3>'+L.bsTitle+'</h3><p class="hint">'+escapeHTML(L.bsHint)+'</p><div class="balance-columns"><div class="balance-side asset-side"><h4>'+L.assetsSide+'</h4>'+row(acc('cash'),r.cash)+inv+row(acc('ships')+' ('+r.ships.length+')',r.shipsCost)+row(acc('accDep'),-r.accDep)+'<div class="statement-total">'+row(L.assetsTotal,r.assets)+'</div></div><div class="balance-side equity-side"><h4>'+L.equitySide+'</h4>'+row(acc('loan'),r.loan)+row(acc('accrued'),r.accrued)+row(acc('capital'),r.capital)+row(acc('surplus'),r.surplus)+row(acc('retained'),r.retained)+'<div class="statement-total">'+row(L.equityTotal,r.liabilities+r.equity)+'</div></div></div><p class="balance-check" role="status">'+(r.assets===r.liabilities+r.equity?L.balanced:L.unbalanced)+'</p></section>'+
   '<section class="statement"><h3>'+L.cfTitle+'</h3><p class="hint">'+escapeHTML(L.cfHint)+'</p><div class="table-wrap"><table class="cf"><thead><tr><th></th><th>'+L.cfThis+'</th><th>'+L.cfTotal+'</th></tr></thead><tbody>'+[['op',L.cfOp],['inv',L.cfInv],['fin',L.cfFin]].map(([k,label])=>'<tr><td>'+escapeHTML(label)+'</td><td>'+money(r.currentFlow[k])+'</td><td>'+money(r.cumulativeFlow[k])+'</td></tr>').join('')+'<tr class="total"><td>'+L.cfNet+'</td><td>'+money(r.currentFlow.op+r.currentFlow.inv+r.currentFlow.fin)+'</td><td>'+money(r.cash)+'</td></tr></tbody></table></div><p class="hint">'+escapeHTML(L.cfNote)+'</p></section>';
  // records
  $('ranking').innerHTML=r.ranking.length?'<div class="table-wrap"><table><thead><tr><th>#</th><th>'+L.rkVoyage+'</th><th>'+L.rkProfit+'</th><th>'+L.rkSales+'</th><th>'+L.rkMargin+'</th><th>'+L.rkEquity+'</th><th></th></tr></thead><tbody>'+r.ranking.map(c=>'<tr><td>'+c.rank+'</td><td>'+(c.difficulty==='hard'?'🔥 ':'')+c.voyage+(c.special?' '+L.rkSpecial:'')+(c.voyage===r.repaidVoyage?' 🏅':'')+'</td><td>'+money(c.profit)+'</td><td>'+money(c.sales)+'</td><td>'+(c.margin===null?'—':Math.round(c.margin*100)+'%')+'</td><td>'+money(c.equity)+'</td><td><button class="light small" data-detail="'+c.voyage+'">'+L.rkView+'</button></td></tr>').join('')+'</tbody></table></div>':'<p class="hint">'+escapeHTML(L.rkEmpty)+'</p>';
  $('ranking').querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{detail=Number(b.dataset.detail);renderDetail(r);}));
  renderDetail(r);
  $('exitRecord').hidden=!r.exit;if(r.exit)$('exitRecord').innerHTML='<h3>'+L.exitRecordTitle+'</h3><p>'+escapeHTML(L.exitRecord(r.exit.voyage,money(r.exit.value),money(r.exit.price),money(r.exit.proceeds),money(r.founderDividends)))+'</p>';
  // outcome
  $('outcome').hidden=active;
  if(!active){
   const last=r.closed.at(-1);
   let html='<p>'+escapeHTML(L.outcomeProfit(money(last?last.profit:0),money(r.totals.profit)))+'</p>';
   if(last)html+='<p>'+escapeHTML(L.outcomeFormula(money(last.sales),money(last.cost),money(last.fares),money(last.interest),hard||last.deposit?money(last.deposit):null,money(last.depreciation),money(last.profit)))+'</p>';
   html+='<p>'+escapeHTML(L.outcomeAssets(money(r.cash),money(r.inventoryCost),money(r.bookValue),money(r.loan+r.accrued),money(r.equity)))+'</p>';
   if(state.status==='closed'){
    const due=state.voyage>=LOAN_DEADLINE&&(r.loan||r.accrued);
    html+='<p class="guide">'+escapeHTML(due?(canDefault(state)?L.deadlineHopeless(money(r.loan+r.accrued),money(r.cash)):L.deadlineRepayNow(money(r.loan+r.accrued))):L.decisionGuide)+'</p>';
   }
   if(state.status==='special')html+='<p class="guide">'+escapeHTML(r.specialReason==='deadline'?L.specialDeadline:L.specialFare)+'</p>';
   if(state.status==='exited')html+='<p class="guide">'+escapeHTML(L.exitedNote(money(r.exit.proceeds)))+'</p>';
   $('result').innerHTML=html;
  }
  $('continueBtn').hidden=!closed||(state.voyage>=LOAN_DEADLINE&&(r.loan>0||r.accrued>0));
  $('defaultBtn').hidden=!canDefault(state);
  $('bankLink').hidden=!closed;
 }
 function renderDetail(r){
  const c=r.closed.find(x=>x.voyage===detail);
  $('rankingDetail').hidden=!c;if(!c)return;
  const pl=c.pl,bs=c.bs;
  $('rankingDetail').innerHTML='<h3>'+escapeHTML(L.detailTitle(c.voyage,c.difficulty==='hard'?L.hardBadge:L.easyBadge))+'</h3>'+(c.at?'<p class="hint">'+escapeHTML(L.closedAt(c.at))+'</p>':'')+(c.special?'<p class="hint">'+escapeHTML(c.defaulted?L.specialDeadline:L.specialFare)+'</p>':'')+'<div class="balance-columns"><div class="balance-side asset-side"><h4>'+L.plTitle+'</h4>'+row(acc('sales'),pl.sales)+row(acc('cogs'),pl.cost)+row(acc('fares'),pl.fares)+row(acc('interest'),pl.interest)+(pl.deposit?row(acc('depositInterest'),pl.deposit):'')+row(acc('depreciation'),pl.depreciation)+'<div class="statement-total">'+row(L.profitNow,pl.profit)+'</div></div><div class="balance-side equity-side"><h4>'+L.bsTitle+'</h4>'+row(acc('cash'),bs.cash)+row(L.inventoryLabel,bs.inventoryCost)+row(acc('ships'),bs.shipsCost)+row(acc('accDep'),-bs.accDep)+row(acc('loan'),bs.loan)+row(acc('accrued'),bs.accrued)+row(acc('capital'),bs.capital)+row(acc('surplus'),bs.surplus)+row(acc('retained'),bs.retained)+'<div class="statement-total">'+row(L.equityLabel,bs.equity)+'</div></div></div>';
 }
 $('bankLink').addEventListener('click',()=>{switchTab('fleet');$('panel-fleet').scrollIntoView({behavior:'smooth'});});
 render();
 if(!localStorage.getItem(SETUP)&&state.events.length===0&&state.voyage===1)showSetup();
}
