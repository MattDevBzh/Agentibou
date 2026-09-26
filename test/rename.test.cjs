const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {dataRoot}=require('../scripts/bridge.cjs');
const {install}=require('../src/integrations.cjs');
function setup(t){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-rename-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  return {home,root:path.join(home,'.avatai'),project:home,exe:process.execPath,bridge:path.resolve('scripts/bridge.cjs')};
}
test('existing data stays on the store used by old hooks; overrides remain isolated',t=>{
  const {home,root}=setup(t);
  assert.equal(dataRoot({},home),path.join(home,'.agentibou'));
  fs.mkdirSync(root);fs.writeFileSync(path.join(root,'preferences.json'),'{"reducedMotion":true}');
  assert.equal(dataRoot({},home),root);
  assert.equal(dataRoot({AVATAI_HOME:'/legacy'},home),'/legacy');
  assert.equal(dataRoot({AGENTIBOU_HOME:'/new',AVATAI_HOME:'/legacy'},home),'/new');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataRoot({},home),'preferences.json'))).reducedMotion,true);
});
test('reconnecting owned legacy integrations leaves one hook set and preserves other servers',t=>{
  const opts=setup(t),dir=path.join(opts.project,'.github','hooks');
  fs.mkdirSync(dir,{recursive:true});
  const old=path.join(dir,'avatai.json');
  fs.writeFileSync(old,JSON.stringify({_avatai:true,hooks:{Stop:[{command:'old'}]}}));
  install('vscode',opts);install('vscode',opts);
  assert.equal(fs.existsSync(old),false);
  assert.deepEqual(fs.readdirSync(dir).filter(n=>n.endsWith('.json')),['agentibou.json']);
  assert.ok(fs.readdirSync(dir).some(n=>n.startsWith('avatai.json.agentibou-backup-')));
  const mcp=path.join(opts.project,'.vs','mcp.json');fs.mkdirSync(path.dirname(mcp));
  fs.writeFileSync(mcp,JSON.stringify({servers:{avatai:{args:[path.join(opts.root,'bridge.cjs'),'mcp']},other:{url:'https://example.com'}}}));
  install('visualstudio',opts);install('visualstudio',opts);
  const servers=JSON.parse(fs.readFileSync(mcp)).servers;
  assert.deepEqual(Object.keys(servers).sort(),['agentibou','other']);
});
test('legacy names never authorize replacing unrelated hook files or MCP servers',t=>{
  const opts=setup(t),old=path.join(opts.project,'.github','hooks','avatai.json');
  fs.mkdirSync(path.dirname(old),{recursive:true});fs.writeFileSync(old,'{"custom":true}');
  install('vscode',opts);assert.equal(fs.readFileSync(old,'utf8'),'{"custom":true}');
  const file=path.join(opts.project,'.vs','mcp.json');fs.mkdirSync(path.dirname(file));
  const unrelated={command:'other',args:['/other/bridge.cjs']};
  fs.writeFileSync(file,JSON.stringify({servers:{avatai:unrelated}}));
  install('visualstudio',opts);assert.deepEqual(JSON.parse(fs.readFileSync(file)).servers.avatai,unrelated);
});
test('old MCP calls work while discovery only advertises Agentibou',t=>{
  const opts=setup(t);
  const messages=[{id:1,method:'tools/list'},{id:2,method:'tools/call',params:{name:'avatai_state',arguments:{state:'done'}}}];
  const result=spawnSync(process.execPath,[opts.bridge,'mcp'],{env:{...process.env,AGENTIBOU_HOME:opts.root},input:messages.map(m=>JSON.stringify({jsonrpc:'2.0',...m})).join('\n')+'\n'});
  assert.equal(result.status,0);
  const replies=result.stdout.toString().trim().split('\n').map(JSON.parse);
  assert.deepEqual(replies[0].result.tools.map(t=>t.name),['agentibou_state']);
  assert.equal(replies[1].result.isError,undefined);
  const events=fs.readdirSync(path.join(opts.root,'events'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(opts.root,'events',events[0]))).state,'done');
});
