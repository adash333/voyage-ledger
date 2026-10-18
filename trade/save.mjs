// SPEC-TRADE-SAVE-002: JSON export/import of the free trading save.
// Pure helpers shared by the Japanese and English pages; the browser glue lives in app.js.
import {restore} from './accounting.mjs';
export const SAVE_APP='voyage-ledger-trade';
export const SAVE_FORMAT=1;
const pad=n=>String(n).padStart(2,'0');
export function exportSave(state,now=new Date()){
 const verified=restore(state);
 const stamp=now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+pad(now.getHours())+pad(now.getMinutes());
 return {
  filename:'voyage-trade-'+stamp+'.json',
  json:JSON.stringify({app:SAVE_APP,format:SAVE_FORMAT,exportedAt:now.toISOString(),state:verified},null,2)
 };
}
export function parseSave(text){
 let data;
 try{data=JSON.parse(String(text));}catch(e){throw new Error('Not JSON');}
 if(!data||typeof data!=='object')throw new Error('Not a save file');
 // A bare state is accepted only when it is this game's (the company mode marks its states with mode:"company").
 const state=data.app===SAVE_APP?data.state:data.version===1&&Array.isArray(data.events)&&data.mode===undefined?data:null;
 if(!state)throw new Error('Not a save file');
 return restore(state); // verifies the event history and rejects tampering
}
