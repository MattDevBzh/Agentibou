'use strict';
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');

(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-recovery-'));
 const env={...process.env,AGENTIBOU_HOME:root,CODEX_HOME:path.join(root,'codex'),AGENTIBOU_CLAUDE_DESKTOP_HOME:path.join(root,'claude')};
 fs.writeFileSync(path.join(root,'preferences.json'),JSON.stringify({companions:{mode:'per-tool',defaultId:'vic',assignments:{codex:'vic',claude:'vic'}},petAppearance:{codex:{scale:1.5,hidden:true},claude:{scale:.7,hidden:true}},dismissedConversations:['codex:kept']}));
 let app;
 const wait=async(check,label,attempts=80)=>{for(let i=0;i<attempts;i++){const result=await check();if(result)return result;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+label);};
 const native=provider=>app.evaluate(({BrowserWindow},provider)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html?provider='+provider));return w?{id:w.id,visible:w.isVisible(),minimized:w.isMinimized(),topmost:w.isAlwaysOnTop(),bounds:w.getBounds()}:null;},provider);
 const launch=async()=>{app=await electron.launch({args:[path.resolve('.')],env});const p=await wait(()=>app.windows().find(w=>w.url().endsWith('index.html')),'dashboard');await p.waitForFunction(()=>!!window.agentibou);await wait(()=>native('codex'),'Codex window');await wait(()=>native('claude'),'Claude window');return p;};
 try{
  let dashboard=await launch();
  assert.equal((await native('codex')).visible,false);
  assert.equal((await native('claude')).visible,false);
  // An unexpected native close must not leave a dead entry that blocks recreation.
  const oldId=(await native('codex')).id;
  await app.evaluate(({BrowserWindow},id)=>BrowserWindow.fromId(id).destroy(),oldId);
  await wait(async()=>{const w=await native('codex');return w&&w.id!==oldId;},'recreate closed companion');
  assert.equal((await native('codex')).visible,false,'recovery respects intentional hiding');
  // Explicit recovery works with both global and individual hiding enabled.
  await dashboard.locator('#toggle-pet').click();
  await dashboard.locator('#restore-pets').click();
  await wait(async()=> (await native('codex'))?.visible&&(await native('claude'))?.visible,'restore all companions');
  let saved=JSON.parse(fs.readFileSync(path.join(root,'preferences.json')));
  assert.deepEqual(saved.petAppearance.codex,{scale:1.5,hidden:false});
  assert.deepEqual(saved.petAppearance.claude,{scale:.7,hidden:false});
  assert.deepEqual(saved.dismissedConversations,['codex:kept']);
  // A renderer crash recovers into a painted, visible window with the same settings.
  const crashId=(await native('codex')).id;
  await app.evaluate(({BrowserWindow},id)=>BrowserWindow.fromId(id).webContents.forcefullyCrashRenderer(),crashId);
  await wait(async()=>{const w=await native('codex');return w&&w.id!==crashId&&w.visible;},'recover crashed renderer');
  const pet=await wait(()=>app.windows().find(w=>!w.isClosed()&&w.url().endsWith('pet.html?provider=codex')),'recovered renderer');
  await pet.waitForFunction(()=>document.querySelector('.sprite')?.getAttribute('aria-label')?.includes('Vic'));
  // Unexpected OS hiding is repaired without changing intentionally hidden neighbours.
  await dashboard.evaluate(()=>window.agentibou.petAppearance('claude',{hidden:true}));
  const visibleId=(await native('codex')).id;
  await app.evaluate(({BrowserWindow},id)=>BrowserWindow.fromId(id).hide(),visibleId);
  await wait(async()=> (await native('codex'))?.visible,'restore unexpectedly hidden window');
  assert.equal((await native('claude')).visible,false);
  // Native minimization and loss of topmost status must not strand a live window.
  await app.evaluate(({BrowserWindow},id)=>{const w=BrowserWindow.fromId(id);w.setMinimizable(true);w.minimize();w.setAlwaysOnTop(false);},visibleId);
  await wait(async()=>{const w=await native('codex');return w?.visible&&!w.minimized&&w.topmost;},'restore minimized companion');
  // A live but blocked renderer is distinct from a crashed process.
  // Queue the blocking work so Playwright can return before its event loop stalls.
  const stalledId=(await native('codex')).id;
  await app.evaluate(({BrowserWindow},id)=>{BrowserWindow.fromId(id).webContents.executeJavaScript('setTimeout(()=>{while(true){}},100);void 0').catch(()=>{});},stalledId);
  await wait(async()=>{const w=await native('codex');return w&&w.id!==stalledId&&w.visible;},'recover hung renderer',350);
  assert.equal((await native('claude')).visible,false,'watchdog preserves hidden neighbours');
  // Resume and GPU process loss rebuild transparent surfaces, preserving settings.
  for(const event of ['resume','gpu']){
   const before=(await native('codex')).id;
   await app.evaluate(({app,powerMonitor},event)=>{if(event==='resume')powerMonitor.emit('resume');else app.emit('child-process-gone',{}, {type:'GPU',reason:'crashed',exitCode:1});},event);
   await wait(async()=>{const w=await native('codex');return w&&w.id!==before&&w.visible;},event+' rebuild');
   assert.equal((await native('claude')).visible,false);
  }
  // Explicit repair recreates even a window Electron still reports as visible.
  const manualId=(await native('codex')).id;
  await dashboard.locator('#restore-pets').click();
  await wait(async()=>{const w=await native('codex');return w&&w.id!==manualId&&w.visible;},'manual surface repair');
  const records=fs.readFileSync(path.join(root,'logs','companions.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  for(const reason of ['renderer-timeout','resume','gpu-process-gone','manual-restore'])assert.ok(records.some(r=>r.event==='pet-retired'&&r.reason===reason),'diagnostic: '+reason);
  assert.ok(records.some(r=>r.event==='renderer-gone'&&r.reason),'crash reason logged');
  // Choosing Reafficher on one companion also releases the global hide switch.
  await dashboard.locator('#toggle-pet').click();
  await dashboard.locator('[data-pet-provider="claude"] button').click();
  await wait(async()=> (await native('claude'))?.visible,'individual restore while globally hidden');
  await dashboard.locator('#restore-pets').click();
  await app.close();app=null;
  dashboard=await launch();
  await wait(async()=> (await native('codex'))?.visible&&(await native('claude'))?.visible,'recovery survives restart');
  assert.equal((await native('codex')).bounds.width,450);
  assert.equal((await native('claude')).bounds.width,210);
  console.log('Recovery OK on '+process.platform+': closed window, crashed and hung renderer, hiding/minimization, resume/GPU simulation, manual rebuild, diagnostics and restart persistence.');
 }finally{if(app)await app.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
