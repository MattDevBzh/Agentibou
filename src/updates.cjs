'use strict';
const {EventEmitter}=require('node:events');
const RELEASES_URL='https://github.com/MattDevBzh/Agentibou/releases/latest';
const API_URL='https://api.github.com/repos/MattDevBzh/Agentibou/releases/latest';
function newerVersion(candidate,current){
 const parse=v=>/^(?:v)?(\d+)\.(\d+)\.(\d+)$/.exec(v);
 const a=parse(candidate),b=parse(current);if(!a||!b)return false;
 for(let i=1;i<=3;i++){if(Number(a[i])!==Number(b[i]))return Number(a[i])>Number(b[i]);}return false;
}
class UpdateManager extends EventEmitter{
 constructor({version,packaged,platform,macSigned=false,updater,fetchRelease,openExternal,beforeInstall=()=>{}}){
  super();Object.assign(this,{version,packaged,platform,updater,fetchRelease,openExternal,beforeInstall});
  this.automatic=packaged&&(platform==='win32'||(platform==='darwin'&&macSigned));
  this.state={status:packaged?'idle':'development',currentVersion:version,version:null,progress:null,automatic:this.automatic};this.busy=false;
  if(this.automatic){
   updater.autoDownload=true;updater.autoInstallOnAppQuit=false;updater.allowPrerelease=false;updater.allowDowngrade=false;
   updater.on('checking-for-update',()=>this.set({status:'checking',progress:null}));
   updater.on('update-available',info=>this.set({status:'downloading',version:info.version,progress:0}));
   updater.on('download-progress',p=>this.set({status:'downloading',progress:Math.max(0,Math.min(100,Math.round(p.percent||0)))}));
   updater.on('update-downloaded',info=>this.set({status:'ready',version:info.version,progress:100}));
   updater.on('update-not-available',()=>this.set({status:'current',version:null,progress:null}));
   updater.on('error',()=>this.set({status:'error',progress:null}));
  }
 }
 set(value){this.state={...this.state,...value};this.emit('change',this.snapshot());}
 snapshot(){return {...this.state};}
 async check(){
  if(!this.packaged||this.busy||['downloading','ready','installing'].includes(this.state.status))return this.snapshot();
  this.busy=true;this.set({status:'checking',progress:null});
  try{
   if(this.automatic){await this.updater.checkForUpdates();}
   else{
    const release=await this.fetchRelease();
    if(release&&!release.draft&&!release.prerelease&&newerVersion(release.tag_name,this.version)){
     // Never execute or open an arbitrary URL supplied by release metadata.
     this.set({status:'manual',version:release.tag_name.replace(/^v/,''),progress:null});
    }else this.set({status:'current',version:null,progress:null});
   }
  }catch{this.set({status:'error',progress:null});}finally{this.busy=false;}
  return this.snapshot();
 }
 async install(){
  if(this.state.status==='manual'){await this.openExternal(RELEASES_URL);return this.snapshot();}
  if(this.state.status!=='ready')return this.snapshot();
  this.set({status:'installing'});this.beforeInstall();this.updater.quitAndInstall(false,true);return this.snapshot();
 }
 start(){if(!this.packaged)return;this.initial=setTimeout(()=>this.check(),15000);this.interval=setInterval(()=>this.check(),6*60*60*1000);this.initial.unref?.();this.interval.unref?.();}
 stop(){clearTimeout(this.initial);clearInterval(this.interval);}
}
module.exports={UpdateManager,newerVersion,RELEASES_URL,API_URL};
