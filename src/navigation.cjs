'use strict';
const path=require('node:path');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeDirectory(value){return typeof value==='string'&&value.length<=4096&&!/[\x00-\x1f]/.test(value)&&(path.posix.isAbsolute(value)||path.win32.isAbsolute(value))?value:undefined;}
function destination(session,options={}){
 if(!session)return null;
 if(session.provider==='codex'&&UUID.test(session.session))return {kind:'url',url:'codex://threads/'+session.session,label:'Ouvrir la conversation',exact:true};
 const cwd=safeDirectory(session.cwd);
 if(session.provider==='copilot'&&cwd){const normalized=cwd.replaceAll('\\','/');return {kind:'url',url:'vscode://file/'+normalized.split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A\//,'$1:/'),label:'Ouvrir le projet VS Code',exact:false};}
 if(session.provider==='claude'){
  const local=options.claudeDesktopId||session.session;
  if(/^local_[A-Za-z0-9-]{1,64}$/.test(local))return {kind:'url',url:'claude://claude.ai/claude-code-desktop/'+local,label:'Ouvrir dans Claude Desktop',exact:true};
  if(UUID.test(session.session))return {kind:'url',url:'claude://resume?session='+session.session,label:'Ouvrir dans Claude Desktop',exact:true};
 }
 if(cwd)return {kind:'folder',path:cwd,label:'Retrouver le dossier du projet',exact:false};
 return {kind:'unavailable',label:'Voir les détails de la session',exact:false};
}
module.exports={destination,safeDirectory};
