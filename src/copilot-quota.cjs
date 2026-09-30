'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
// Account RPC only. Never create/resume a session, send a prompt or read credentials.
function cliCommand(env=process.env,platform=process.platform){
 if(env.AGENTIBOU_COPILOT_CLI){const file=env.AGENTIBOU_COPILOT_CLI;return /\.c?js$/i.test(file)?{file:process.execPath,args:[file],env:{...env,ELECTRON_RUN_AS_NODE:'1'}}:{file,args:[],env};}
 const dirs=[...(env.PATH||env.Path||'').split(path.delimiter),...(platform==='darwin'?['/opt/homebrew/bin','/usr/local/bin']:[]),...(platform==='win32'?[path.join(env.LOCALAPPDATA||os.homedir(),'Microsoft','WinGet','Links')]:[])];
 for(const dir of dirs.filter(Boolean))for(const name of platform==='win32'?['copilot.exe','copilot.cmd']:['copilot']){
  const file=path.join(dir,name);if(!fs.existsSync(file))continue;
  // npm's Windows shim cannot be spawned directly without a shell. Run its JS entry.
  if(name.endsWith('.cmd')){const js=path.join(dir,'node_modules','@github','copilot','index.js');if(fs.existsSync(js))return {file:process.execPath,args:[js],env:{...env,ELECTRON_RUN_AS_NODE:'1'}};continue;}
  return {file,args:[],env};
 }
 throw Error('Copilot CLI introuvable');
}
function readQuota({command,spawnProcess=spawn,timeout=15000}={}){
 let child,stop;
 const promise=new Promise((resolve,reject)=>{
  let finished=false,buffer=Buffer.alloc(0),timer;
  const done=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);if(child){child.stdin?.end();child.kill();}error?reject(error):resolve(result);};
  stop=()=>done(Error('Lecture annulée'));
  try{command ||= cliCommand();child=spawnProcess(command.file,[...command.args,'--headless','--stdio','--no-auto-update','--log-level','none'],{env:command.env,windowsHide:true,stdio:['pipe','pipe','pipe'],cwd:os.homedir()});}catch{return done(Error('Copilot CLI indisponible'));}
  timer=setTimeout(()=>done(Error('Copilot CLI ne répond pas')),timeout);
  child.on('error',()=>done(Error('Copilot CLI indisponible')));child.on('exit',()=>done(Error('Copilot CLI arrêté')));child.stdin.on('error',()=>done(Error('Copilot CLI déconnecté')));child.stderr.resume();
  const send=(id,method)=>{const payload=JSON.stringify({jsonrpc:'2.0',id,method,params:{}});child.stdin.write('Content-Length: '+Buffer.byteLength(payload)+'\r\n\r\n'+payload);};
  child.stdout.on('data',chunk=>{
   if(finished)return;buffer=Buffer.concat([buffer,chunk]);if(buffer.length>1024*1024)return done(Error('Réponse Copilot trop volumineuse'));
   while(!finished){const end=buffer.indexOf('\r\n\r\n');if(end<0)return;const length=Number(/Content-Length:\s*(\d+)/i.exec(buffer.subarray(0,end).toString())?.[1]);if(!Number.isSafeInteger(length)||length<=0||length>1024*1024)return done(Error('Protocole Copilot incompatible'));if(buffer.length<end+4+length)return;
    let response;try{response=JSON.parse(buffer.subarray(end+4,end+4+length));}catch{return done(Error('Réponse Copilot invalide'));}buffer=buffer.subarray(end+4+length);
    if(response.id===1){if(response.error?.code===-32601)send(3,'ping');else if(response.error)return done(Error('Connexion Copilot impossible'));else send(2,'account.getQuota');}
    if(response.id===3){if(response.error)return done(Error('Connexion Copilot impossible'));send(2,'account.getQuota');}
    if(response.id===2)done(response.error?Error('Quota Copilot indisponible'):null,response.result);
   }
  });send(1,'connect');
 });return {promise,cancel:()=>stop?.()};
}
function copilotUsage(data,now=Date.now()){
 const q=data?.quotaSnapshots;
 // Token billing can put the allowance under chat instead of premium_interactions.
 const entry=[['premium_interactions','Abonnement'],['chat','Chat']].find(([key])=>q?.[key]?.hasQuota!==false&&(q?.[key]?.isUnlimitedEntitlement||q?.[key]?.entitlementRequests===-1||q?.[key]?.entitlementRequests>0));
 if(!entry)return [];const [key,label]=entry,v=q[key],unlimited=v.isUnlimitedEntitlement===true||v.entitlementRequests===-1;
 if(!unlimited&&(typeof v.remainingPercentage!=='number'||!Number.isFinite(v.remainingPercentage)||v.remainingPercentage<0||v.remainingPercentage>100))return [];
 const reset=Date.parse(v.resetDate); // Some CLI builds return observation time as resetDate; omit that invalid reset.
 return [{key:'copilot-account',label,value:unlimited?null:Math.round((100-v.remainingPercentage)*10)/10,unit:unlimited?'unlimited':'percent',at:now,resetAt:reset>now+60000?reset:null,source:'Quota du compte Copilot connecté au CLI · '+key+' · part utilisée, tous outils confondus'}];
}
class CopilotQuota{
 constructor({request=readQuota}={}){this.request=request;this.items=[];this.status='Quota en attente';this.next=0;this.pending=null;}
 poll(now=Date.now()){
  if(this.pending||now<this.next)return;this.next=now+300000;this.status=this.items.length?'Dernier relevé disponible':'Lecture du quota…';
  const req=this.request();this.pending=req;
  req.promise.then(data=>{this.items=copilotUsage(data);this.status=this.items.length?'Quota du compte connecté':'Quota non communiqué par Copilot';}).catch(()=>{this.items=[];this.status='Quota indisponible · vérifier la connexion au CLI';}).finally(()=>{this.pending=null;});
 }
 snapshot(now=Date.now()){return this.items.filter(e=>now-e.at<600000&&(!e.resetAt||e.resetAt>now)).map(e=>({...e,stale:now-e.at>300000}));}
 stop(){this.pending?.cancel();}
}
module.exports={cliCommand,readQuota,copilotUsage,CopilotQuota};
