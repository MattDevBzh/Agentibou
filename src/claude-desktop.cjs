'use strict';
const fs=require('node:fs'),path=require('node:path');
const LOCAL_ID=/^local_[A-Za-z0-9-]{1,64}$/;
// Claude Desktop stores its own ID alongside the CLI hook ID. Read only the
// metadata registry, never transcripts. Both IDs can differ after /clear.
function findDesktopSession(root,cliId){
 let found;let scanned=0;
 function visit(dir,depth){
  let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
  for(const e of entries){
   if(found||scanned>=10000)return;
   const file=path.join(dir,e.name);
   if(e.isDirectory()&&depth<2){visit(file,depth+1);continue;}
   if(!e.isFile()||!/^local_[A-Za-z0-9-]+\.json$/.test(e.name))continue;
   scanned++;
   try{if(fs.statSync(file).size>4*1024*1024)continue;const item=JSON.parse(fs.readFileSync(file,'utf8'));if(LOCAL_ID.test(item.sessionId)&&(item.cliSessionId===cliId||item.sessionId===cliId))found=item.sessionId;}catch{}
  }
 }
 visit(path.join(root,'claude-code-sessions'),0);return found;
}
module.exports={findDesktopSession,LOCAL_ID};
