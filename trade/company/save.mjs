// SPEC-017 v1.2 §10: JSON export/import of the company-mode save.
// Pure helpers shared by the Japanese and English pages; the browser glue lives in app.js.
import {restore} from './accounting.mjs';
export const SAVE_APP='voyage-ledger-company';
export const SAVE_FORMAT=1;
const pad=n=>String(n).padStart(2,'0');
export function exportSave(state,now=new Date()){
 const verified=restore(state);
 const stamp=now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+pad(now.getHours())+pad(now.getMinutes());
 return {
  filename:'company-ledger-'+stamp+'.json',
  json:JSON.stringify({app:SAVE_APP,format:SAVE_FORMAT,exportedAt:now.toISOString(),state:verified},null,2)
 };
}
export function parseSave(text){
 let data;
 try{data=JSON.parse(String(text));}catch(e){throw new Error('Not JSON');}
 if(!data||typeof data!=='object')throw new Error('Not a save file');
 if(data.app==='voyage-ledger-trade'||data.app===undefined&&data.version===1&&Array.isArray(data.events)&&data.mode===undefined)throw new Error('Free trading save');
 if(data.app!==undefined&&data.app!==SAVE_APP)throw new Error('Not a save file'); // e.g. a free-trading-mode file
 const state=data.app===SAVE_APP?data.state:data.mode==='company'?data:null;
 if(!state||typeof state!=='object'||state.mode!=='company')throw new Error('Not a save file');
 if(data.app===SAVE_APP&&data.format!==SAVE_FORMAT)throw new Error('Unsupported format');
 return restore(state); // replays and verifies the event history, rejecting tampering
}
