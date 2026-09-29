const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {install}=require('../src/integrations.cjs');
const {SessionStore}=require('../src/state.cjs');
const {Watcher}=require('../src/watcher.cjs');
const {normalize}=require('../scripts/bridge.cjs');
const {cleanSelection,visibleProviders}=require('../src/companions.cjs');
const {PET_PROVIDERS}=require('../src/pet-layout.cjs');
const {destination}=require('../src/navigation.cjs');

function options(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-copilot-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 return {home,root:path.join(home,"Matt's $data `literal`"),exe:process.execPath,bridge:path.resolve('scripts/bridge.cjs')};
}
test('Copilot CLI connects globally, respects COPILOT_HOME and preserves unrelated hooks',t=>{
 const opts=options(t);opts.copilotHome=path.join(opts.home,'custom-copilot');
 const dir=path.join(opts.copilotHome,'hooks');fs.mkdirSync(dir,{recursive:true});
 const unrelated='{"version":1,"hooks":{"agentStop":[{"bash":"echo existing"}]}}';
 fs.writeFileSync(path.join(dir,'personal.json'),unrelated);
 const first=install('copilot-cli',opts),before=fs.readFileSync(first.file,'utf8');
 install('copilot-cli',opts);
 assert.equal(first.file,path.join(dir,'agentibou.json'));
 assert.equal(fs.readFileSync(first.file,'utf8'),before);
 assert.equal(fs.readFileSync(path.join(dir,'personal.json'),'utf8'),unrelated);
 assert.ok(fs.readdirSync(dir).some(n=>n.startsWith('agentibou.json.agentibou-backup-')&&!n.endsWith('.json')));
 assert.equal(fs.existsSync(path.join(opts.home,'.github')),false);
 assert.equal(fs.existsSync(path.join(opts.home,'.copilot')),false);
 const config=JSON.parse(before);assert.equal(config.version,1);
 for(const hooks of Object.values(config.hooks)){
  assert.equal(hooks.length,1);const h=hooks[0];assert.equal(h.type,'command');assert.equal(h.timeoutSec,3);
  assert.equal(h.env.ELECTRON_RUN_AS_NODE,'1');assert.equal(h.env.AGENTIBOU_HOME,opts.root);
  assert.ok(h.bash.includes('copilot-cli'));assert.ok(h.powershell.startsWith('& '));
  assert.equal(h.command,undefined);assert.equal(h.windows,undefined);
 }
});
test('Copilot CLI refuses malformed or unowned configuration without replacing it',t=>{
 const opts=options(t),file=path.join(opts.home,'.copilot','hooks','agentibou.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 for(const content of ['{broken','{}','null','{"_agentibou":false,"hooks":{}}']){
  fs.writeFileSync(file,content);assert.throws(()=>install('copilot-cli',opts));
  assert.equal(fs.readFileSync(file,'utf8'),content);
 }
});
test('generated CLI hooks reach watcher with isolated sessions, completion and metadata only',t=>{
 const opts=options(t),config=JSON.parse(fs.readFileSync(install('copilot-cli',opts).file));
 const store=new SessionStore(),watcher=new Watcher(store,opts.root,path.join(opts.home,'no-codex'));
 const run=(name,sessionId='cli-one',extra={})=>{
  const hook=config.hooks[name][0];
  const r=spawnSync(process.platform==='win32'?'powershell':'/bin/sh',process.platform==='win32'?['-NoProfile','-Command',hook.powershell]:['-c',hook.bash],{
   input:JSON.stringify({sessionId,cwd:opts.home,prompt:'PRIVATE_PROMPT',toolArgs:{secret:'PRIVATE_ARGS'},...extra}),
   env:{...process.env,...hook.env},timeout:5000
  });
  assert.equal(r.status,0,r.stderr.toString());assert.equal(r.stdout.toString(),'');watcher.poll();
  const session=store.sessions.get('copilot-cli:'+sessionId);assert.ok(session);return session;
 };
 assert.equal(run('sessionStart').state,'idle');
 assert.equal(run('userPromptSubmitted').state,'thinking');
 assert.equal(run('preToolUse').state,'working');
 assert.equal(run('userPromptSubmitted','cli-two').state,'thinking');
 assert.equal(store.snapshot(Date.now(),'copilot-cli').active,2);
 assert.equal(run('postToolUse').state,'thinking');
 assert.equal(run('agentStop').state,'done');
 assert.equal(store.snapshot().completions.length,1);
 assert.equal(run('sessionEnd').state,'idle');assert.equal(store.snapshot().completions.length,1);
 assert.equal(run('userPromptSubmitted').state,'thinking');assert.equal(store.snapshot().completions.length,0);
 assert.equal(run('postToolUseFailure').state,'error');assert.equal(run('errorOccurred').state,'error');
 assert.equal(store.snapshot(Date.now(),'copilot').sessions.length,0);
 for(const file of fs.readdirSync(path.join(opts.root,'events'))){
  const text=fs.readFileSync(path.join(opts.root,'events',file),'utf8');assert.ok(!text.includes('PRIVATE_'));
 }
});
test('CLI companion assignments and navigation remain independent from VS Code',()=>{
 const catalog=[{id:'vic'},{id:'toktokette'}];
 const selection=cleanSelection({mode:'per-tool',assignments:{'copilot-cli':'toktokette',copilot:'vic'}},catalog);
 assert.equal(selection.assignments['copilot-cli'],'toktokette');
 assert.ok(visibleProviders([],selection).includes('copilot-cli'));assert.ok(PET_PROVIDERS.includes('copilot-cli'));
 const event=normalize('copilot-cli','done',{sessionId:'cli-session',cwd:'/tmp/project'});
 assert.equal(event.session,'cli-session');assert.equal(destination(event).kind,'folder');
 assert.equal(destination({...event,provider:'copilot'}).kind,'url');
 assert.equal(normalize('copilot-cli','thinking',{cwd:'/tmp/project'}).session,'/tmp/project');
});
