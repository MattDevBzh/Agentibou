'use strict';
const fs=require('node:fs'),path=require('node:path');
const percent=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const time=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
function codexUsage(line,session,now=Date.now()){
 let e;try{e=JSON.parse(line);}catch{return null;}
 if(e.type!=='event_msg'||e.payload?.type!=='token_count')return null;
 const at=Date.parse(e.timestamp);if(!time(at)||at>now+60000)return null;
 const p=e.payload,windows=[];
 // A primary window can itself be weekly; never assume primary means five hours.
 if(!p.rate_limits?.limit_id||p.rate_limits.limit_id==='codex')for(const w of [p.rate_limits?.primary,p.rate_limits?.secondary]){
  if(!w||!percent(w.used_percent)||![300,10080].includes(w.window_minutes))continue;
  const resetAt=time(w.resets_at)?w.resets_at*1000:null;
  if(resetAt!==null&&resetAt<=now)continue;
  windows.push({key:w.window_minutes===300?'fiveHour':'week',label:w.window_minutes===300?'5 h':'7 j',value:w.used_percent,unit:'percent',at,resetAt,source:'Relevé des quotas du compte Codex'});
 }
 const total=p.info?.total_token_usage?.total_tokens;
 return {at,session,windows,authoritative:!!p.rate_limits&&(!p.rate_limits.limit_id||p.rate_limits.limit_id==='codex'),tokens:typeof total==='number'&&Number.isSafeInteger(total)&&total>=0?total:null};
}
function claudeUsage(history,now=Date.now()){
 if(![1,2].includes(history?.version)||!Array.isArray(history.samples))return [];
 const samples=history.samples.filter(s=>time(s?.t)&&s.t<=now+60000&&now-s.t<86400000);
 // Do not attribute another organization's historical allowance to this account.
 if(new Set(samples.map(s=>s.org).filter(Boolean)).size>1)return [];
 const sample=samples.sort((a,b)=>b.t-a.t)[0];if(!sample)return [];
 const u=history.version===1?sample:sample.u;if(!u)return [];
 return [['fh','fiveHour','5 h',5*3600000],['sd','week','7 j',86400000]].flatMap(([field,key,label,maxAge])=>percent(u[field])&&now-sample.t<maxAge?[{key,label,value:u[field],unit:'percent',at:sample.t,resetAt:null,source:'Dernier relevé local de Claude Desktop ; quota du compte, pas de la conversation'}]:[]);
}
class UsageStore{
 constructor(claudeRoot){this.claudeRoot=claudeRoot;this.windows=new Map();this.sessions=new Map();this.claude=[];this.lastPoll=0;this.lastRateAt=0;}
 observeCodex(line,meta,now=Date.now()){
  const data=codexUsage(line,meta.session,now);if(!data)return;
  if(data.session&&data.tokens!==null){const prev=this.sessions.get(data.session);if(!prev||data.at>prev.at)this.sessions.set(data.session,{key:'conversation',label:'Conv.',value:data.tokens,unit:'tokens',at:data.at,session:data.session,project:meta.project,source:'Tokens cumulés de cette conversation Codex, entrées et sorties, cache compris. Ce compteur ne représente ni un prix ni un pourcentage du quota.'});}
  if(data.authoritative&&data.at>this.lastRateAt){this.lastRateAt=data.at;this.windows=new Map(data.windows.map(w=>[w.key,w]));}
 }
 poll(now=Date.now()){
  if(now-this.lastPoll<15000)return;this.lastPoll=now;
  try{const file=path.join(this.claudeRoot,'plan-usage-history.json');if(fs.statSync(file).size>10*1024*1024)throw Error('too large');this.claude=claudeUsage(JSON.parse(fs.readFileSync(file,'utf8')),now);}catch{this.claude=[];}
  for(const [key,s] of this.sessions)if(now-s.at>86400000)this.sessions.delete(key);
 }
 snapshot(provider,session,now=Date.now()){
  let items=[];
  if(provider==='codex'){const current=this.sessions.get(session);if(current&&now-current.at<86400000)items.push(current);items.push(...this.windows.values());}
  if(provider==='claude')items=this.claude;
  return items.filter(e=>now-e.at<86400000&&(e.resetAt===null||e.resetAt===undefined||e.resetAt>now)&&(e.key!=='fiveHour'||e.resetAt||now-e.at<5*3600000)).map(e=>({...e,stale:now-e.at>20*60000}));
 }
}
module.exports={UsageStore,codexUsage,claudeUsage};
