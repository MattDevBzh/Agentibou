'use strict';
const fs=require('node:fs'),path=require('node:path');

// Only lifecycle metadata is supplied by callers: never conversations or file URLs.
// Keep at most three 512 KiB files, including across application restarts.
function createDiagnostics(root,{maxBytes=512*1024}={}){
 const directory=path.join(root,'logs'),file=path.join(directory,'companions.jsonl');
 let last='',lastAt=0;
 function log(event,details={}){
  try{
   const payload=JSON.stringify({event,...details}),now=Date.now();
   if(payload===last&&now-lastAt<30000)return;
   last=payload;lastAt=now;
   fs.mkdirSync(directory,{recursive:true,mode:0o700});
   const line=JSON.stringify({at:new Date(now).toISOString(),pid:process.pid,event,...details})+'\n';
   if(fs.existsSync(file)&&fs.statSync(file).size+Buffer.byteLength(line)>maxBytes){
    fs.rmSync(file+'.2',{force:true});
    if(fs.existsSync(file+'.1'))fs.renameSync(file+'.1',file+'.2');
    fs.renameSync(file,file+'.1');
   }
   fs.appendFileSync(file,line,{mode:0o600});
  }catch{ /* Diagnostics must never interrupt companion recovery (e.g. full disk). */ }
 }
 return {directory,log};
}
module.exports={createDiagnostics};
