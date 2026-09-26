'use strict';
const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-background-'));
 fs.mkdirSync(path.join(root,'events'));
 fs.writeFileSync(path.join(root,'events','working.json'),JSON.stringify({provider:'codex',session:'background-test',project:'Animation test',state:'working',at:Date.now()}));
 // Playwright's Electron loader adds these switches itself. Remove them before
 // the application creates any windows so automation cannot hide this regression.
 const switches=['disable-background-timer-throttling','disable-renderer-backgrounding','disable-backgrounding-occluded-windows'];
 const entry=path.join(root,'launch.cjs');
 fs.writeFileSync(entry,`const {app}=require('electron');for(const flag of ${JSON.stringify(switches)})app.commandLine.removeSwitch(flag);require(${JSON.stringify(path.resolve('src/main.cjs'))});`);
 let app;
 const wait=async(check,label)=>{for(let i=0;i<100;i++){const result=await check();if(result)return result;await delay(100);}throw Error('Timeout: '+label);};
 try{
  app=await electron.launch({args:[entry],env:{...process.env,AGENTIBOU_HOME:root,CODEX_HOME:path.join(root,'codex'),AGENTIBOU_CLAUDE_DESKTOP_HOME:path.join(root,'claude')}});
  assert.deepEqual(await app.evaluate(({app},flags)=>flags.filter(flag=>app.commandLine.hasSwitch(flag)),switches),[]);
  const pet=await wait(()=>app.windows().find(w=>w.url().endsWith('pet.html?provider=codex')),'companion');
  await pet.emulateMedia({reducedMotion:'no-preference'});
  await pet.waitForFunction(()=>document.querySelector('.sprite')?.getAttribute('aria-label')?.includes('au travail'));
  await wait(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.webContents.getURL().includes('pet.html?provider=codex')&&w.isVisible())),'visible companion');
  const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({pet:w.webContents.getURL().includes('pet.html'),throttled:w.webContents.getBackgroundThrottling()})));
  assert.equal(prefs.find(w=>w.pet).throttled,false,'companions must animate in the background');
  assert.equal(prefs.find(w=>!w.pet).throttled,true,'dashboard retains normal background power saving');
  for(const mode of ['focused-dashboard','hidden-dashboard','minimized-dashboard']){
   await app.evaluate(({BrowserWindow},mode)=>{
    const windows=BrowserWindow.getAllWindows(),panel=windows.find(w=>w.webContents.getURL().endsWith('index.html'));
    panel.restore();panel.show();panel.focus();
    if(mode==='hidden-dashboard')panel.hide();
    if(mode==='minimized-dashboard')panel.minimize();
    for(const w of windows)if(w!==panel)w.blur();
   },mode);
   await delay(500);
   await pet.evaluate(()=>{
    const sprite=document.querySelector('.sprite');let last=sprite.style.backgroundPosition;
    window.animationSamples=[];
    window.animationObserver=new MutationObserver(()=>{const position=sprite.style.backgroundPosition;if(position!==last){window.animationSamples.push(position);last=position;}});
    window.animationObserver.observe(sprite,{attributes:true,attributeFilter:['style']});
   });
   // Wait outside the renderer: repeated evaluate calls could wake a stalled page.
   await delay(3200);
   const positions=await pet.evaluate(()=>{window.animationObserver.disconnect();return window.animationSamples;});
   assert.ok(positions.length>=10,`${mode}: animation stalled (${positions.length} frame changes in 3.2s)`);
   assert.equal(new Set(positions).size,6,`${mode}: all working frames should appear`);
   const native=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html?provider=codex'));return {visible:w.isVisible(),focused:w.isFocused()};});
   assert.deepEqual(native,{visible:true,focused:false});
   console.log(`${mode}: ${positions.length} frame changes; companion visible and unfocused`);
  }
  console.log(`Background animation OK on ${process.platform}. Other operating systems still require a native run.`);
 }finally{if(app)await app.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
