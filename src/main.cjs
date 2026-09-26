'use strict';
const {app,BrowserWindow,ipcMain,screen,Tray,Menu,nativeImage,dialog,shell,net}=require('electron');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {visibleProviders,CompanionLibrary,cleanSelection,selectedCompanion,cleanName,imageType,PROVIDERS}=require('./companions.cjs');
const {destination}=require('./navigation.cjs');
const {findDesktopSession}=require('./claude-desktop.cjs');
const claudeDesktopRoot=process.env.AGENTIBOU_CLAUDE_DESKTOP_HOME||process.env.AVATAI_CLAUDE_DESKTOP_HOME||path.join(app.getPath('appData'),'Claude');
const {UsageStore}=require('./usage.cjs');
const {petLayout,petPreference,PET_PROVIDERS}=require('./pet-layout.cjs');
const {SessionStore}=require('./state.cjs');const {Watcher}=require('./watcher.cjs');const {install}=require('./integrations.cjs');
const ROOT=require('../scripts/bridge.cjs').dataRoot();
app.setName('Agentibou');
app.setPath('userData',path.join(ROOT,'electron'));
const library=new CompanionLibrary(ROOT,path.join(__dirname,'assets','vic.webp'));
const usage=new UsageStore(claudeDesktopRoot);const store=new SessionStore();const watcher=new Watcher(store,ROOT,process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),usage);
let panel,tray,timer,settings={},quitting=false,petsVisible=true;
const {UpdateManager,API_URL}=require('./updates.cjs');
const updates=new UpdateManager({
 version:app.getVersion(),packaged:app.isPackaged,platform:process.platform,
 macSigned:require('../package.json').agentibouUpdates?.macSigned===true,
 updater:require('electron-updater').autoUpdater,
 fetchRelease:async()=>{const response=await net.fetch(API_URL,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});if(response.status===404)return null;if(!response.ok)throw Error('Update check failed');return response.json();},
 openExternal:url=>shell.openExternal(url),beforeInstall:()=>{quitting=true;}
});
updates.on('change',state=>{if(panel&&!panel.isDestroyed())panel.webContents.send('update-state',state);});
const pets=new Map();
const settingsFile=path.join(ROOT,'preferences.json');
try{settings=JSON.parse(fs.readFileSync(settingsFile,'utf8'));}catch{}
if(Array.isArray(settings.dismissedConversations))store.dismissed=new SessionStore(settings.dismissedConversations).dismissed;

function saveSettings(){fs.mkdirSync(ROOT,{recursive:true});fs.writeFileSync(settingsFile,JSON.stringify(settings,null,2));}
function secureWindow(options,{backgroundThrottling=true}={}){const w=new BrowserWindow({...options,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());return w;}
function snapshot(provider=null){const state=store.snapshot(Date.now(),provider);const companions=library.list(),selection=cleanSelection(settings.companions,companions);const companionProvider=PROVIDERS.includes(provider)?provider:state.focus?.provider||null;return {...state,provider,usage:usage.snapshot(companionProvider,state.focus?.session),conversations:state.conversations.map(e=>({...e,destination:e.state==='done'?destination(e):null})),companions,companionSelection:selection,companionProvider,companion:selectedCompanion(selection,companions,companionProvider),completion:state.completion?{...state.completion,destination:destination(state.completion)}:null,diagnostics:watcher.status,settings,petsVisible,petControls:PET_PROVIDERS.map(provider=>({provider,...petPreference(settings,provider),present:visibleProviders(state.conversations,selection,settings.keepAssignedVisible!==false).includes(provider)})),platform:process.platform,home:ROOT};}
function petFor(sender){return [...pets.values()].find(p=>p.window.webContents===sender);}
function petSnapshot(p){const s=snapshot(p.provider);resizePet(p,s);s.petPosition=p.window.getPosition();return s;}
function syncPets(s){const wanted=visibleProviders(s.conversations,s.companionSelection,settings.keepAssignedVisible!==false);for(const [key,p] of pets)if(!wanted.includes(key)){pets.delete(key);p.window.hide();setTimeout(()=>{if(!p.window.isDestroyed())p.window.destroy();},150);}for(const provider of wanted)if(!pets.has(provider))createPet(provider);}
function send(){const s=snapshot();syncPets(s);if(panel&&!panel.isDestroyed())panel.webContents.send('state',s);for(const p of pets.values())if(!p.window.isDestroyed()){const state=petSnapshot(p);p.window.setTitle((state.companion?.name||'Compagnon')+' · '+(PROVIDERS.includes(p.provider)?p.provider:'Agentibou'));p.window.webContents.send('state',state);applyPetVisibility(p);}}
function applyPetVisibility(p){if(p.window.isDestroyed()||!p.ready)return;const visible=petsVisible&&!petPreference(settings,p.provider).hidden;if(visible&&!p.window.isVisible())p.window.showInactive();else if(!visible&&p.window.isVisible())p.window.hide();}
function resizePet(p,s){const pet=p.window;if(pet.isDestroyed())return;const bounds=pet.getBounds(),area=screen.getDisplayMatching(bounds).workArea;const layout=petLayout(s.conversations.length,s.usage.length?1:0,area.height,petPreference(settings,p.provider).scale,area.width);const x=Math.max(area.x,Math.min(bounds.x,area.x+area.width-layout.width)),y=Math.max(area.y,Math.min(bounds.y+p.top-Math.round(layout.topHeight*layout.scale),area.y+area.height-layout.height));p.top=Math.round(layout.topHeight*layout.scale);if(bounds.width!==layout.width||bounds.height!==layout.height||bounds.x!==x||bounds.y!==y)pet.setBounds({x,y,width:layout.width,height:layout.height});s.petLayout=layout;}
function togglePets(){petsVisible=!petsVisible;for(const p of pets.values())applyPetVisibility(p);send();return petsVisible;}
function restorePets(){
 petsVisible=true;settings.petAppearance||={};
 for(const provider of PET_PROVIDERS)settings.petAppearance[provider]={...petPreference(settings,provider),hidden:false};
 saveSettings();send();return {restored:true};
}
function acknowledge(key,at){const removed=store.acknowledge(key,at);if(removed){settings.dismissedConversations=[...store.dismissed];saveSettings();}return removed;}
function showPanel(){if(panel&&!panel.isDestroyed()){panel.show();panel.focus();return;}
  panel=secureWindow({width:1030,height:780,minWidth:870,minHeight:650,title:'Agentibou — Compagnons',backgroundColor:'#f8f7f3',autoHideMenuBar:true});
  panel.loadFile(path.join(__dirname,'index.html'));
  panel.on('close',e=>{if(!quitting){e.preventDefault();panel.hide();}});
}
function placePet(provider){
 const area=screen.getPrimaryDisplay().workArea;const pos=settings.positions?.[provider]||(!pets.size?settings.position:null);const bounds={width:300,height:240,x:area.x+area.width-322,y:area.y+area.height-257};
 if(pos&&screen.getAllDisplays().some(d=>pos.x>=d.workArea.x&&pos.y>=d.workArea.y&&pos.x+300<=d.workArea.x+d.workArea.width&&pos.y+240<=d.workArea.y+d.workArea.height)){bounds.x=pos.x;bounds.y=pos.y;}
 const occupied=[...pets.values()].map(p=>p.window.getBounds());
 const overlaps=(x,y)=>occupied.some(b=>x<b.x+b.width&&x+300>b.x&&y<b.y+b.height&&y+240>b.y);
 if(overlaps(bounds.x,bounds.y)){let found=false;for(let y=area.y+area.height-257;y>=area.y&&!found;y-=250)for(let x=area.x+area.width-322;x>=area.x;x-=310)if(!overlaps(x,y)){bounds.x=x;bounds.y=y;found=true;break;}}
 return bounds;
}
// Companions normally run unfocused: keep their sprite timer and painting active.
function createPet(provider){const window=secureWindow({...placePet(provider),show:false,frame:false,transparent:true,resizable:false,hasShadow:false,alwaysOnTop:true,skipTaskbar:true,title:'Agentibou · '+provider},{backgroundThrottling:false});const p={window,provider,top:0,ready:false};pets.set(provider,p);window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
 // Remove only this instance: a retired window can close after its replacement exists.
 window.on('closed',()=>{if(pets.get(provider)===p)pets.delete(provider);});
 window.webContents.on('render-process-gone',()=>{if(!window.isDestroyed())window.destroy();});
 window.once('ready-to-show',()=>{if(!window.isDestroyed()&&pets.get(provider)===p){p.ready=true;applyPetVisibility(p);}});window.loadFile(path.join(__dirname,'pet.html'),{query:{provider}});window.on('moved',()=>{if(window.isDestroyed())return;const [x,y]=window.getPosition();settings.positions||={};settings.positions[provider]={x,y};saveSettings();});}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>showPanel());
 app.whenReady().then(()=>{
  showPanel();
  // NativeImage does not decode SVG. Build a small monochrome template icon.
  const pixels=Buffer.alloc(44*44*4);
  for(let y=0;y<44;y++)for(let x=0;x<44;x++){
    const head=x>=6&&x<38&&y>=12&&y<38;
    const aerial=x>=20&&x<24&&y>=4&&y<13;
    const eye=((x-16)**2+(y-24)**2<10)||((x-28)**2+(y-24)**2<10);
    if((head||aerial)&&!eye){const i=(y*44+x)*4;pixels[i]=48;pixels[i+1]=64;pixels[i+2]=51;pixels[i+3]=255;}
  }
  const trayIcon=nativeImage.createFromBitmap(pixels,{width:44,height:44}).resize({width:22,height:22});
  if(process.platform==='darwin')trayIcon.setTemplateImage(true);
  tray=new Tray(trayIcon);tray.setToolTip('Agentibou · Compagnons');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Ouvrir Agentibou',click:showPanel},{label:'Afficher / masquer les compagnons',click:togglePets},{label:'Réafficher tous les compagnons',click:restorePets},{type:'separator'},{label:'Quitter Agentibou',click:()=>{quitting=true;app.quit();}}]));tray.on('click',showPanel);
  updates.start();watcher.poll();send();timer=setInterval(()=>{watcher.poll();send();},1000);

 });
}
app.on('before-quit',()=>{quitting=true;updates.stop();clearInterval(timer);});app.on('activate',showPanel);app.on('window-all-closed',()=>{});
ipcMain.handle('get-update-state',event=>event.sender===panel?.webContents?updates.snapshot():null);
ipcMain.handle('check-updates',event=>event.sender===panel?.webContents?updates.check():null);
ipcMain.handle('install-update',event=>event.sender===panel?.webContents?updates.install():null);
ipcMain.handle('get-state',event=>{const p=petFor(event.sender);return p?petSnapshot(p):snapshot();});
ipcMain.handle('dismiss-conversation',(_,key,at)=>{const removed=acknowledge(key,at);send();return removed?{dismissed:true}:{error:'Cette conversation a repris ou a déjà été fermée.'};});
ipcMain.handle('panel',()=>showPanel());
ipcMain.handle('toggle-pet',togglePets);
ipcMain.handle('restore-pets',event=>event.sender===panel?.webContents?restorePets():{error:'Action disponible dans Agentibou.'});
ipcMain.handle('pet-appearance',(event,provider,value)=>{
 const senderPet=petFor(event.sender);
 if(!PET_PROVIDERS.includes(provider)||(senderPet&&senderPet.provider!==provider)||(!senderPet&&event.sender!==panel?.webContents))return {error:'Compagnon indisponible.'};
 if(!value||typeof value!=='object'||(value.scale!==undefined&&(!Number.isFinite(value.scale)||value.scale<.6||value.scale>1.5))||(value.hidden!==undefined&&typeof value.hidden!=='boolean'))return {error:'Réglage invalide.'};
 settings.petAppearance||={};settings.petAppearance[provider]={...petPreference(settings,provider),...(value.scale!==undefined?{scale:Math.round(value.scale*100)/100}:{}),...(value.hidden!==undefined?{hidden:value.hidden}:{})};
 if(value.hidden===false)petsVisible=true;
 saveSettings();send();return {saved:true};
});
ipcMain.handle('demo',(_,state)=>{if(!['idle','thinking','working','done','waiting','error',null].includes(state))return;for(const w of [panel,...[...pets.values()].map(p=>p.window)])if(w&&!w.isDestroyed())w.webContents.send('demo',state);});
ipcMain.handle('preferences',(_,values)=>{if(values.reducedMotion===null)settings.reducedMotion=null;for(const k of ['reducedMotion','silent','keepAssignedVisible'])if(typeof values[k]==='boolean')settings[k]=values[k];saveSettings();send();});
ipcMain.handle('clear-session',(_,key)=>{if(typeof key==='string'){const e=store.sessions.get(key);if(e){e.state='idle';e.at=Date.now();}}send();});
ipcMain.handle('install',async(_,kind)=>{
 try{if(!['claude','vscode','visualstudio'].includes(kind))throw new Error('Intégration inconnue');let project;
 if(kind!=='claude'){const result=await dialog.showOpenDialog(panel,{title:kind==='vscode'?'Choisir le projet VS Code':'Choisir la solution Visual Studio',properties:['openDirectory']});if(result.canceled)return {cancelled:true};project=result.filePaths[0];}
 return install(kind,{home:os.homedir(),claudeConfig:process.env.CLAUDE_CONFIG_DIR,root:ROOT,exe:process.execPath,bridge:path.join(__dirname,'..','scripts','bridge.cjs'),project});}catch(e){return {error:e.message};}
});
ipcMain.handle('open-folder',()=>shell.openPath(ROOT));

ipcMain.handle('move-pet',(event,x,y)=>{const p=petFor(event.sender);if(!p||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>20000||Math.abs(y)>20000)return;p.window.setPosition(Math.round(x),Math.round(y));});
ipcMain.handle('open-session',async(request,key,at)=>{
 const parent=BrowserWindow.fromWebContents(request.sender)||panel;
 const event=store.completed.get(key);if(!event||event.at!==at)return {error:'Cette tâche a repris ou une autre réponse est arrivée.'};
 const target=destination(event,{claudeDesktopId:event.provider==='claude'?findDesktopSession(claudeDesktopRoot,event.session):undefined});
 try {
  if(target.kind==='url'){
   if(!target.exact){const answer=await dialog.showMessageBox(parent,{type:'info',message:'Ouvrir le projet VS Code',detail:'Le lien vers cette conversation Copilot n’est pas disponible. Le projet va s’ouvrir ; retrouve la conversation dans l’historique du chat.',buttons:['Ouvrir le projet','Annuler'],cancelId:1});if(answer.response===1)return {cancelled:true};}
   await shell.openExternal(target.url);
  }else if(target.kind==='folder'){
   if(!fs.statSync(target.path).isDirectory())throw new Error('Dossier indisponible.');
   const answer=await dialog.showMessageBox(parent,{type:'info',message:'Retrouver le projet',detail:'Ce fournisseur ne donne pas de lien direct vers la conversation. Ouvre le dossier du projet, puis son historique de chat.',buttons:['Ouvrir le dossier','Annuler'],cancelId:1});if(answer.response===1)return {cancelled:true};
   const error=await shell.openPath(target.path);if(error)throw new Error(error);
  }else return {error:'Aucun lien de conversation ni dossier disponible pour cette session.'};
  acknowledge(key,at);send();return {opened:true,exact:target.exact};
 }catch{return {error:'Impossible d’ouvrir cette destination. Vérifie que l’application est installée. Tu peux réessayer.'};}
});

ipcMain.handle('select-companions',(_,value)=>{
 try{if(!value||!['shared','per-tool'].includes(value.mode))throw new Error('Choix invalide.');const catalog=library.list(),ids=new Set(catalog.map(p=>p.id));if(!ids.has(value.defaultId))throw new Error('Compagnon indisponible.');for(const provider of PROVIDERS){const id=value.assignments?.[provider];if(id!==undefined&&id!==''&&!ids.has(id))throw new Error('Compagnon indisponible.');}settings.companions=cleanSelection(value,catalog);saveSettings();send();return {saved:true};}catch(e){return {error:e.message};}
});
ipcMain.handle('import-companion',async(_,name)=>{
 let validator;
 try{
  name=cleanName(name);
  const result=await dialog.showOpenDialog(panel,{title:'Importer la planche du compagnon',properties:['openFile'],filters:[{name:'Planche animée PNG / WebP',extensions:['png','webp']}]});
  if(result.canceled)return {cancelled:true};
  const file=result.filePaths[0];if(fs.statSync(file).size>20*1024*1024)throw new Error('L’image ne doit pas dépasser 20 Mo.');
  const bytes=fs.readFileSync(file),type=imageType(bytes),dataUrl='data:image/'+type+';base64,'+bytes.toString('base64');
  // Chromium decodes PNG and WebP; NativeImage cannot decode the existing WebP atlas.
  validator=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await validator.loadURL('data:text/html,<meta http-equiv="Content-Security-Policy" content="default-src %27none%27; img-src data:">');
  const dimensions=await Promise.race([validator.webContents.executeJavaScript(`(async()=>{const img=new Image();img.src=${JSON.stringify(dataUrl)};await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};})()`),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Lecture de l’image trop longue.')),10000);timer.unref();})]);
  if(dimensions.width!==1536||dimensions.height!==1872)throw new Error('Format attendu : 1536 × 1872 pixels, soit 8 colonnes × 9 lignes.');
  const companion=library.add(name,bytes,type);send();return {companion};
 }catch(e){return {error:e.message.includes('EncodingError')?'L’image est illisible. Vérifie le fichier.':e.message};}finally{if(validator&&!validator.isDestroyed())validator.destroy();}
});
