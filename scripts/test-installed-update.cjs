'use strict';
// Run the actual, previously published Windows application. Do not replace its
// updater, feed, version, timers or IPC: detection must come from the real feed.
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 assert.equal(process.platform,'win32','This check requires a Windows runner');
 const executablePath=process.env.AGENTIBOU_TEST_EXE;
 assert.ok(executablePath&&fs.existsSync(executablePath),'Installed executable missing');
 const from=process.env.UPDATE_FROM,target=process.env.UPDATE_TARGET;
 assert.match(from,/^\d+\.\d+\.\d+$/);assert.match(target,/^\d+\.\d+\.\d+$/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-update-'));
 const qa=path.resolve('docs/qa/installed-update');fs.mkdirSync(qa,{recursive:true});
 const report={platform:process.platform,from,target,states:[],checkedAt:new Date().toISOString(),installed:false};
 let app,panel;
 try{
  app=await electron.launch({executablePath,args:[],env:{...process.env,AGENTIBOU_HOME:root,CODEX_HOME:path.join(root,'codex'),AGENTIBOU_CLAUDE_DESKTOP_HOME:path.join(root,'claude')}});
  assert.deepEqual(await app.evaluate(({app})=>({packaged:app.isPackaged,version:app.getVersion()})),{packaged:true,version:from});
  for(let i=0;i<100&&!panel;i++){panel=app.windows().find(p=>p.url().endsWith('index.html'));if(!panel)await delay(100);}
  assert.ok(panel,'Dashboard not opened');
  await panel.waitForFunction(()=>!!window.agentibou);
  await panel.evaluate(()=>{window.updateEvents=[];window.agentibou.onUpdateState(state=>window.updateEvents.push(state));});
  // Hide the dashboard as users do while coding. The production 15-second
  // startup check must find and download the release without clicking Check.
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html')).hide());
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){
   const state=await panel.evaluate(()=>window.agentibou.getUpdateState());
   if(report.states.at(-1)?.status!==state.status){report.states.push(state);console.log('Updater:',JSON.stringify(state));}
   if(state.status==='error')throw Error('Published Windows updater reported an error');
   if(state.status==='ready'){assert.equal(state.version,target);break;}
   await delay(1000);
  }
  assert.equal(report.states.at(-1)?.status,'ready','Automatic update did not become ready within three minutes');
  report.events=await panel.evaluate(()=>window.updateEvents);
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));w.show();w.focus();});
  await panel.locator('#install-update').waitFor({state:'visible'});
  report.message=await panel.locator('#update-status').innerText();
  assert.ok(report.message.includes(target));
  assert.equal(await panel.locator('#install-update').innerText(),'Redémarrer pour installer');
  assert.equal(await panel.locator('#install-update').isEnabled(),true);
  await panel.locator('#install-update').scrollIntoViewIfNeeded();
  await panel.screenshot({path:path.join(qa,'windows-update-ready.png')});
  // Installation is deliberately left to the user; this verifies detection,
  // download and the actual dashboard notification, not a native Windows toast.
  report.success=true;
  console.log(`Published Windows ${from} automatically downloaded ${target}; dashboard notification and install button visible.`);
 }catch(error){report.error=error.message;if(panel)await panel.screenshot({path:path.join(qa,'failure.png')}).catch(()=>{});throw error;}
 finally{
  fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify(report,null,2)+'\n');
  if(app)await app.close();fs.rmSync(root,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
