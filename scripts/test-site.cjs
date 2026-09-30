'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=(process.env.SITE_URL||'http://127.0.0.1:4173/').replace(/\/?$/,'/'),qa=path.resolve('docs/qa/site');
(async()=>{
 fs.mkdirSync(qa,{recursive:true});const browser=await chromium.launch({headless:true,...(!fs.existsSync(chromium.executablePath())?{channel:'chrome'}:{})});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',acceptDownloads:true});const page=await context.newPage(),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url()+': '+r.status());});
 try{
  await page.goto(base);await page.waitForLoadState('networkidle');assert.match(await page.title(),/Agentibou/);assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.download-link').count(),2);
  await page.locator('#creation-prompt summary').click();assert.equal(await page.locator('#companion-prompt').inputValue(),require('../src/companion-prompt.js'));await context.grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#copy-companion-prompt').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),require('../src/companion-prompt.js'));await page.locator('#creation-prompt').screenshot({path:path.join(qa,'creation-prompt.png')});
  await page.screenshot({path:path.join(qa,'agentibou-atelier-desktop.png'),fullPage:true});
  for(const state of ['idle','thinking','working','done']){await page.locator(`[data-state="${state}"]`).click();assert.equal(await page.locator(`[data-state="${state}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('body').getAttribute('data-animation'),state);}
  assert.equal(await page.locator('[data-companion]').count(),5);
  for(const [id,name] of Object.entries({vic:'Vic',toktokette:'Paprika',basil:'Basil',tempo:'Tempo',mochi:'Mochi'})){
   await page.locator(`[data-companion="${id}"]`).click();assert.equal(await page.locator('#pet-name').textContent(),name);
   assert.match(await page.locator('#demo-sprite').evaluate(e=>e.style.backgroundImage),new RegExp(id==='vic'?'vic.webp':id+'.png'));
  }await page.locator('[data-state="working"]').click();
  const positions=new Set();for(let i=0;i<9;i++){positions.add(await page.locator('#demo-sprite').evaluate(e=>e.style.backgroundPosition));await page.waitForTimeout(90);}assert.ok(positions.size>=4);
  await page.locator('#pause-animation').click();const paused=await page.locator('#demo-sprite').evaluate(e=>e.style.backgroundPosition);await page.waitForTimeout(500);assert.equal(await page.locator('#demo-sprite').evaluate(e=>e.style.backgroundPosition),paused);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#pause-animation').click();assert.equal(await page.locator('#pause-animation').getAttribute('aria-pressed'),'true');await page.waitForTimeout(350);assert.equal(await page.locator('#demo-sprite').evaluate(e=>e.style.backgroundPosition),paused);await page.emulateMedia({reducedMotion:'no-preference'});
  const urls=await page.locator('a[href]').evaluateAll(els=>[...new Set(els.map(e=>e.getAttribute('href')).filter(h=>!h.startsWith('#')))]);
  for(const url of urls){const response=await context.request.head(new URL(url,base).href);assert.equal(response.status(),200,url);}
  await page.goto(base+'#installation-windows');assert.equal(await page.locator('#installation-windows').getAttribute('open'),'');
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:844});await page.goto(base);await page.locator('#creation-prompt summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px overflow`);await page.screenshot({path:path.join(qa,`agentibou-atelier-${width}.png`),fullPage:true});}
  if(process.env.SITE_DOWNLOAD_TEST==='1'){
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.download-link').first().click()]);
   const downloaded=await download.path();assert.ok(downloaded);const manifest=await (await context.request.get(base+'releases.json')).json();const release=manifest.releases.find(r=>r.file===download.suggestedFilename());assert.ok(release?.sha256,'Expected published SHA-256');const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(downloaded))hash.update(chunk);assert.equal(hash.digest('hex'),release.sha256);console.log('Real Windows download and SHA-256 verified.');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),url:base,widths:[1440,768,390],consoleErrors:errors,failedResponses:bad,downloadVerified:process.env.SITE_DOWNLOAD_TEST==='1'},null,2)+'\n');console.log('Atelier OK: responsive layouts, 4 states, characters, pause, reduced motion, guides, download links and clean console.');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
