'use strict';
const providers = ['codex','claude','copilot','copilot-cli','visualstudio'];
const states = ['idle','thinking','working','done','waiting','error'];
function projectKey(e){const path=require('node:path');return e.cwd?'path:'+((path.win32.isAbsolute(e.cwd)&&!e.cwd.startsWith('/'))?path.win32.normalize(e.cwd).toLowerCase():path.posix.normalize(e.cwd)):'name:'+e.project;}
class SessionStore {
  constructor(dismissed=[]) { this.sessions=new Map();this.celebrations=new Map();this.completed=new Map();this.dismissed=new Map(dismissed.filter(e=>Array.isArray(e)&&typeof e[0]==='string'&&Number.isFinite(e[1]))); }
  accept(e, now=Date.now()) {
    if(!e||!providers.includes(e.provider)||!states.includes(e.state)||typeof e.session!=='string'||!e.session||e.session.length>250||!Number.isFinite(e.at)||e.at>now+60000)return false;
    const key=e.provider+':'+e.session,old=this.sessions.get(key);if(old&&old.at>=e.at)return false;
    const event={provider:e.provider,state:e.state,session:e.session,project:String(e.project||'Session').slice(0,100),at:e.at,startedAt:old?.startedAt||e.at,cwd:require('./navigation.cjs').safeDirectory(e.cwd)||old?.cwd};
    this.sessions.set(key,event);
    if(['thinking','working','waiting','error'].includes(e.state)){this.completed.delete(key);this.celebrations.delete(key);}
    if(e.state==='done'&&e.at>(this.dismissed.get(key)||0)){this.completed.set(key,event);if(now-e.at<7000)this.celebrations.set(key,event);}
    return true;
  }
  acknowledge(key,at){const e=this.completed.get(key);if(!e||e.at!==at)return false;this.completed.delete(key);this.dismissed.set(key,at);return true;}
  snapshot(now=Date.now(),provider=null) {
    for(const map of [this.completed,this.sessions])for(const [key,e] of map)if(now-e.at>86400000)map.delete(key);
    for(const [key,at] of this.dismissed)if(now-at>86400000)this.dismissed.delete(key);
    for(const [key,e] of this.celebrations)if(now-e.at>=7000)this.celebrations.delete(key);
    const sessions=[...this.sessions.values()].filter(e=>!provider||e.provider===provider).map(e=>({...e,state:['thinking','working'].includes(e.state)&&now-e.at>1200000?'waiting':e.state,stale:['thinking','working'].includes(e.state)&&now-e.at>1200000})).sort((a,b)=>b.at-a.at);
    const active=sessions.filter(e=>['thinking','working'].includes(e.state));
    const recentDone=[...this.celebrations.values()].filter(e=>!provider||e.provider===provider).sort((a,b)=>b.at-a.at)[0];
    const focus=recentDone||active.find(e=>e.state==='working')||active.find(e=>e.state==='thinking');
    const completions=[...this.completed.values()].filter(e=>!provider||e.provider===provider).sort((a,b)=>b.at-a.at);
    const visible=new Map(sessions.filter(e=>['thinking','working','waiting','error'].includes(e.state)).map(e=>[e.provider+':'+e.session,e]));
    for(const e of completions)visible.set(e.provider+':'+e.session,e);
    const conversations=[...visible.values()].sort((a,b)=>a.startedAt-b.startedAt||(a.provider+':'+a.session).localeCompare(b.provider+':'+b.session)).map(e=>({...e,key:e.provider+':'+e.session,projectKey:projectKey(e)}));
    const groups=new Map();for(const e of conversations){let group=groups.get(e.projectKey);if(!group){group={key:e.projectKey,name:e.project,cwd:e.cwd,count:0,done:0,providers:[]};groups.set(e.projectKey,group);}group.count++;if(e.state==='done')group.done++;if(!group.providers.includes(e.provider))group.providers.push(e.provider);}
    return {completion:completions[0]||null,completions,conversations,projects:[...groups.values()],state:focus?.state||'idle',focus:focus||null,active:active.length,sessions};
  }
}

function codexEvent(line, meta, now=Date.now()) {
  let e; try {e=JSON.parse(line);} catch {return null;}
  const p=e.payload||{};
  if(e.type==='session_meta') {meta.session=p.id||p.session_id;meta.cwd=require('./navigation.cjs').safeDirectory(p.cwd);meta.project=require('node:path').basename(p.cwd||'Codex');return null;}
  if(!meta.session)return null;
  if(e.type==='response_item'&&['function_call','custom_tool_call','web_search_call'].includes(p.type)){const at=Date.parse(e.timestamp);if(!Number.isFinite(at))return null;meta.state='working';return {provider:'codex',session:meta.session,project:meta.project,cwd:meta.cwd,state:'working',at};}
  if(e.type!=='event_msg')return null;
  const map={task_started:'thinking',task_complete:'done',task_completed:'done',turn_aborted:'idle',task_aborted:'idle'};
  let state=map[p.type];
  if(p.type==='agent_reasoning'||(p.type==='item_completed'&&p.item?.type==='Reasoning'))state='thinking';
  if(p.type==='item_started'&&['CommandExecution','McpToolCall','FileChange','WebSearch','ImageView'].includes(p.item?.type))state='working';
  if(p.type==='item_completed'&&['CommandExecution','McpToolCall','FileChange','WebSearch','ImageView','Extension'].includes(p.item?.type))state='thinking';
  if(state) meta.state=state;
  // Progress refreshes the lease without interpreting message contents.
  const progress=['token_count','item_completed','agent_reasoning','agent_message'].includes(p.type);
  if(!state && !((!meta.state||['thinking','working'].includes(meta.state))&&progress)) return null;
  if(!state&&progress&&!meta.state)meta.state='thinking';
  const at=Date.parse(e.timestamp);
  if(!Number.isFinite(at))return null;
  return {provider:'codex',session:meta.session,project:meta.project,cwd:meta.cwd,state:state||meta.state||'thinking',at};
}
module.exports={SessionStore,codexEvent};
