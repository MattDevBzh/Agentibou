'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');
const {FunScheduler,validFun}=require('../src/fun.cjs');
const {copilotUsage,readQuota,CopilotQuota}=require('../src/copilot-quota.cjs');
const {SessionStore,codexEvent}=require('../src/state.cjs');const {Watcher}=require('../src/watcher.cjs');
const {petDisplay,petLayout}=require('../src/pet-layout.cjs');
const jokes=require('../src/jokes.json');
function root(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-features-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const cfg={enabled:true,count:3,start:'09:00',end:'18:00'};
const date=(h,m=0,day=30)=>new Date(2026,8,day,h,m).getTime();
test('fun respects idle availability, range, daily cap, restart and no catch-up burst',t=>{
 const file=path.join(root(t),'fun.json');let f=new FunScheduler(file,{random:()=>0});
 f.tick(cfg,[],date(9));assert.equal(f.current,null);f.tick(cfg,['idle'],date(9,1));assert.ok(jokes.includes(f.current.text));const first=f.current.text;
 f=new FunScheduler(file,{random:()=>0});f.tick(cfg,['idle'],date(9,2));assert.equal(f.current,null);assert.equal(f.state.count,1);
 f.tick(cfg,['idle'],date(17));assert.notEqual(f.current.text,first);f.tick(cfg,[],date(17,1));assert.equal(f.current,null);f.tick(cfg,['idle'],date(17,2));assert.equal(f.current,null);
 f.tick(cfg,['idle'],date(17,5));assert.equal(f.state.count,3);f.tick(cfg,['idle'],date(17,6));assert.equal(f.current,null);f.tick(cfg,['idle'],date(18));assert.equal(f.state.count,3);
 f.tick(cfg,['idle'],date(9,0,31));assert.equal(f.state.count,1);
});
test('settings changes retain daily count; disabled, busy and hidden pets never receive jokes',t=>{
 const f=new FunScheduler(path.join(root(t),'fun.json'),{random:()=>0});f.tick(cfg,['idle'],date(10));f.tick({...cfg,enabled:false},['idle'],date(10,1));assert.equal(f.current,null);
 f.tick({...cfg,count:1},['idle'],date(11));assert.equal(f.state.count,1);assert.equal(f.current,null);
 f.tick({...cfg,count:4},[],date(11,1));assert.equal(f.state.count,1);f.tick({...cfg,count:4},['codex'],date(11,2));assert.equal(f.current.provider,'codex');f.tick({...cfg,count:4},[],date(11,2));assert.equal(f.current,null);
 assert.equal(validFun({...cfg,end:'08:00'}),false);assert.equal(validFun({...cfg,count:25}),false);assert.equal(validFun({...cfg,start:'27:00'}),false);
});
test('200 distinct short jokes, full shuffle cycle without repetition across restarts',t=>{
 assert.equal(jokes.length,200);assert.equal(new Set(jokes).size,200);assert.ok(jokes.every(j=>typeof j==='string'&&j.length<220));
 const file=path.join(root(t),'fun.json'),seen=new Set();let f=new FunScheduler(file);
 for(let i=0;i<200;i++){const d=new Date(2026,0,i+1,9).getTime();f.tick({enabled:true,count:1,start:'09:00',end:'18:00'},[],d);f.tick({enabled:true,count:1,start:'09:00',end:'18:00'},['idle'],d+9*3600000-1);assert.ok(f.current);assert.ok(!seen.has(f.current.text));seen.add(f.current.text);f=new FunScheduler(file);}
});
test('quota uses remaining percentage as account usage and rejects absent/unusable entitlements',()=>{
 const wrap=q=>({quotaSnapshots:q}),q={hasQuota:true,entitlementRequests:100,remainingPercentage:72};assert.equal(copilotUsage(wrap({premium_interactions:q}))[0].value,28);
 assert.equal(copilotUsage(wrap({premium_interactions:{...q,hasQuota:false},chat:q}))[0].label,'Chat');
 assert.equal(copilotUsage(wrap({premium_interactions:{isUnlimitedEntitlement:true}}))[0].unit,'unlimited');
 for(const remainingPercentage of [null,undefined,-1,101,'50',NaN])assert.deepEqual(copilotUsage(wrap({premium_interactions:{...q,remainingPercentage}})),[]);
 assert.deepEqual(copilotUsage({}),[]);assert.deepEqual(copilotUsage(wrap({chat:{...q,hasQuota:false}})),[]);
});
test('account RPC handles fragmented UTF-8, legacy handshake and never starts a session',async()=>{
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.killed=true;};let pending=Buffer.alloc(0);const methods=[];
 child.stdin.on('data',chunk=>{pending=Buffer.concat([pending,chunk]);const at=pending.indexOf('\r\n\r\n');if(at<0)return;const request=JSON.parse(pending.subarray(at+4));pending=Buffer.alloc(0);methods.push(request.method);const result=request.method==='connect'?{error:{code:-32601}}:{result:request.method==='ping'?{protocolVersion:3}:{quotaSnapshots:{chat:{hasQuota:true,entitlementRequests:200,remainingPercentage:40}}}};const json=JSON.stringify({jsonrpc:'2.0',id:request.id,...result}),buffer=Buffer.from('Content-Length: '+Buffer.byteLength(json)+'\r\n\r\n'+json);queueMicrotask(()=>{for(let i=0;i<buffer.length;i+=7)child.stdout.write(buffer.subarray(i,i+7));});});
 const r=await readQuota({command:{file:'fake',args:[]},spawnProcess:()=>child}).promise;assert.equal(copilotUsage(r)[0].value,60);assert.deepEqual(methods,['connect','ping','account.getQuota']);assert.equal(child.killed,true);
});
test('quota process timeout and polling errors are bounded and drop the prior account reading',async()=>{
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};
 await assert.rejects(readQuota({command:{file:'fake',args:[]},spawnProcess:()=>child,timeout:5}).promise,/répond/);
 const q=new CopilotQuota({request:()=>({promise:Promise.reject(Error('offline')),cancel(){}})});q.items=[{value:50}];q.poll();await new Promise(r=>setImmediate(r));assert.deepEqual(q.snapshot(),[]);assert.match(q.status,/indisponible/);
});
test('models follow Codex turn context and CLI changes, ignore subagents, preserve hooks without model',t=>{
 const r=root(t),store=new SessionStore(),now=Date.now(),meta={};codexEvent(JSON.stringify({type:'session_meta',payload:{id:'a',cwd:r}}),meta);
 codexEvent(JSON.stringify({type:'turn_context',payload:{model:'gpt-test'}}),meta);store.accept(codexEvent(JSON.stringify({type:'event_msg',timestamp:new Date(now).toISOString(),payload:{type:'task_started'}}),meta));assert.equal(store.snapshot().sessions[0].model,'gpt-test');
 const watcher=new Watcher(store,r,path.join(r,'none'),null,path.join(r,'copilot'));
 watcher.observeCopilot(JSON.stringify({type:'session.start',timestamp:new Date(now).toISOString(),data:{selectedModel:'model-one'}}),{session:'cli'});
 store.accept({provider:'copilot-cli',session:'cli',state:'thinking',at:now});assert.equal(store.snapshot(now,'copilot-cli').sessions[0].model,'model-one');
 watcher.observeCopilot(JSON.stringify({type:'assistant.message',agentId:'child',timestamp:new Date(now+1).toISOString(),data:{model:'child-model'}}),{session:'cli'});assert.equal(store.snapshot(now,'copilot-cli').sessions[0].model,'model-one');
 watcher.observeCopilot(JSON.stringify({type:'assistant.message',timestamp:new Date(now+2).toISOString(),data:{model:'model-two'}}),{session:'cli'});store.accept({provider:'copilot-cli',session:'cli',state:'done',at:now+3});assert.equal(store.snapshot(now+3,'copilot-cli').conversations[0].model,'model-two');
});
test('display toggles are independent and enlarged bubbles fit small screens',()=>{
 const s={petAppearance:{codex:{showModels:false,showSessions:false,showUsage:false}}};assert.deepEqual(petDisplay(s,'codex'),{showModels:false,showSessions:false,showUsage:false});assert.equal(petDisplay(s,'claude').showModels,true);
 for(const h of [240,300,500,900]){const l=petLayout(20,1,h,1.5,400,true,true);assert.ok(l.height<=h);assert.ok(l.width<=400);}
});
test('Claude bridge extracts model only from the bounded transcript tail and preserves no message content',t=>{
 const dir=root(t),file=path.join(dir,'session.jsonl');const {normalize}=require('../scripts/bridge.cjs');
 fs.writeFileSync(file,JSON.stringify({type:'assistant',message:{model:'old-model',content:'PRIVATE_BODY'}})+'\n'+JSON.stringify({type:'user',message:{content:'x'.repeat(150000)}})+'\n'+JSON.stringify({type:'assistant',message:{model:'claude-test',content:'PRIVATE_RESPONSE'}})+'\n');
 const e=normalize('claude','done',{session_id:'test',cwd:dir,transcript_path:file});assert.equal(e.model,'claude-test');assert.ok(!JSON.stringify(e).includes('PRIVATE'));assert.equal(e.transcript_path,undefined);
 assert.equal(normalize('claude','working',{model:'hook-model',transcript_path:file}).model,'hook-model');assert.equal(normalize('copilot','working',{transcript_path:file}).model,undefined);
});
test('random schedule reserves spacing and fits all requested appearances when time permits',t=>{
 const f=new FunScheduler(path.join(root(t),'fun.json'),{random:()=>.99999});f.tick({...cfg,count:24},[],date(9));assert.equal(f.state.slots.length,24);assert.ok(f.state.slots.at(-1)<date(18));for(let i=1;i<f.state.slots.length;i++)assert.ok(f.state.slots[i]-f.state.slots[i-1]>=300000);
});
