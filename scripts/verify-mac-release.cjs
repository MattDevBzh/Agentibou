'use strict';
// Verify the distributed containers, not merely the unquarantined build directory.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {_electron:electron}=require('playwright');
const asar=require('@electron/asar');
const version=require('../package.json').version;
const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
(async()=>{
 assert.equal(process.platform,'darwin','Mac package verification requires macOS');
 const dir=path.resolve(process.argv[2]||'dist'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-mac-verify-'));
 let app,mounted=false;const mount=path.join(temp,'dmg'),zip=path.join(temp,'zip');fs.mkdirSync(mount);fs.mkdirSync(zip);
 const report={version,checkedAt:new Date().toISOString(),containers:[],notarized:false};
 try{
  run('ditto',['-x','-k',path.join(dir,`Agentibou-${version}-mac-arm64.zip`),zip]);
  run('hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,path.join(dir,`Agentibou-${version}-mac-arm64.dmg`)]);mounted=true;
  let zipArchive;
  for(const [format,root] of [['zip',zip],['dmg',mount]]){
   const bundle=path.join(root,'Agentibou.app');
   run('codesign',['--verify','--deep','--strict','--verbose=2',bundle]);
   assert.ok(fs.existsSync(path.join(bundle,'Contents','Resources','LIRE-MOI.md')),'Documentation must live in Resources');
   assert.equal(fs.existsSync(path.join(bundle,'Contents','INSTALLER-WINDOWS.md')),false,'Loose files in Contents break bundle signing');
   const archive=path.join(bundle,'Contents','Resources','app.asar');
   const meta=JSON.parse(asar.extractFile(archive,'package.json'));assert.equal(meta.version,version);
   assert.equal(run('plutil',['-extract','CFBundleIdentifier','raw','-o','-',path.join(bundle,'Contents','Info.plist')]).trim(),'fr.agentibou.companion');
   if(zipArchive)assert.ok(fs.readFileSync(archive).equals(zipArchive),'DMG and ZIP app contents differ');else zipArchive=fs.readFileSync(archive);
   if(meta.agentibouUpdates?.macSigned){run('spctl',['--assess','--type','execute','--verbose=2',bundle]);run('xcrun',['stapler','validate',bundle]);report.notarized=true;}
   report.containers.push({format,signatureValid:true});
  }
  const data=path.join(temp,'data');fs.mkdirSync(data);
  app=await electron.launch({executablePath:path.join(zip,'Agentibou.app','Contents','MacOS','Agentibou'),args:[],env:{...process.env,AGENTIBOU_HOME:data,CODEX_HOME:path.join(temp,'codex'),COPILOT_HOME:path.join(temp,'copilot'),AGENTIBOU_CLAUDE_DESKTOP_HOME:path.join(temp,'claude')}});
  assert.deepEqual(await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged})),{version,packaged:true});
  let panel;for(let i=0;i<100;i++){panel=app.windows().find(w=>w.url().endsWith('index.html'));if(panel)break;await new Promise(r=>setTimeout(r,100));}assert.ok(panel,'Packaged dashboard missing');
  await panel.waitForFunction(()=>!!window.agentibou);assert.equal((await panel.evaluate(()=>window.agentibou.getState())).funSettings.enabled,false);
  report.launchVerified=true;report.gatekeeperApproval=report.notarized?'Apple notarized':'User approval still required: no Developer ID or Apple notarization';
  fs.writeFileSync(path.join(dir,'mac-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Mac ${version}: strict signatures valid in DMG + ZIP; packaged launch verified; Apple notarization: ${report.notarized}.`);
 }finally{if(app)await app.close();if(mounted)run('hdiutil',['detach',mount]);fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);if(error.stderr)console.error(error.stderr.toString());process.exitCode=1;});
