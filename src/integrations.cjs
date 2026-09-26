'use strict';
const fs=require('node:fs');const path=require('node:path');
function readJSON(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw new Error('Le fichier '+file+' doit contenir du JSON valide. Il n’a pas été modifié.');}}
function save(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file))fs.copyFileSync(file,file+'.agentibou-backup-'+Date.now()+'-'+require('node:crypto').randomUUID().slice(0,8));const temp=file+'.agentibou-tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600});fs.renameSync(temp,file);}
function command(exe,bridge,provider,state,windows=false){
  const quote=s=>windows?"'"+s.replaceAll("'","''")+"'":"'"+s.replaceAll("'","'\\''")+"'";
  const base=[exe,bridge,provider,state].map(quote).join(' ');
  return windows?'& '+base:base;
}
function ownsCommand(command,stable){if(typeof command!=='string')return false;if(command.includes(stable))return true;const encoded=command.match(/-EncodedCommand ([A-Za-z0-9+/=]+)$/);return !!encoded&&Buffer.from(encoded[1],'base64').toString('utf16le').includes(stable);}
function hook(exe,bridge,provider,state){return {type:'command',command:command(exe,bridge,provider,state),windows:command(exe,bridge,provider,state,true),env:{ELECTRON_RUN_AS_NODE:'1'},timeout:3};}
function install(kind,{home,root,exe,bridge,project,claudeConfig}){
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  const stable=path.join(root,'bridge.cjs');fs.copyFileSync(bridge,stable);
  if(kind==='claude'){
    const file=path.join(claudeConfig||path.join(home,'.claude'),'settings.json'),d=readJSON(file);d.hooks ||= {};
    const map={UserPromptSubmit:'thinking',PreToolUse:'working',PostToolUse:'thinking',Stop:'done',SessionEnd:'idle',PermissionRequest:'waiting',StopFailure:'error'};
    for(const [event,state] of Object.entries(map)){
      const h=hook(exe,stable,'claude',state);
      // Claude commands use the native shell; env is set inline for Claude compatibility.
      h.command=process.platform==='win32'?'powershell -NoProfile -EncodedCommand '+Buffer.from("$env:ELECTRON_RUN_AS_NODE='1'; "+h.windows,'utf16le').toString('base64'):'ELECTRON_RUN_AS_NODE=1 '+h.command;
      delete h.windows;delete h.env;
      const entries=d.hooks[event]||[];
      // Remove only our own commands and retain every unrelated command/matcher.
      d.hooks[event]=entries.map(group=>({...group,hooks:(group.hooks||[]).filter(x=>!ownsCommand(x.command,stable))})).filter(group=>group.hooks.length);
      d.hooks[event].push({hooks:[h]});
    }
    save(file,d);return {file,message:'Claude Code connecté. Redémarre ses sessions pour charger les hooks.'};
  }
  if(kind==='vscode'){
    if(!project)throw new Error('Choisis le dossier du projet.');
    const file=path.join(project,'.github','hooks','agentibou.json');
    const existing=readJSON(file); if(Object.keys(existing).length&&!existing._agentibou)throw new Error('Un fichier agentibou.json existe déjà et n’appartient pas à Agentibou.');
    const legacyFile=path.join(project,'.github','hooks','avatai.json');
    const legacy=readJSON(legacyFile);
    const hooks={};for(const [event,state] of Object.entries({UserPromptSubmit:'thinking',PreToolUse:'working',PostToolUse:'thinking',Stop:'done'}))hooks[event]=[hook(exe,stable,'copilot',state)];
    save(file,{_agentibou:true,hooks});
    // A non-JSON backup is not loaded as another hook configuration.
    if(legacy._avatai===true)fs.renameSync(legacyFile,legacyFile+'.agentibou-backup-'+Date.now());
    return {file,message:'Hooks VS Code ajoutés au projet. Ouvre le projet en mode Agent sur ce poste.'};
  }
  if(kind==='visualstudio'){
    if(!project)throw new Error('Choisis le dossier de la solution.');
    const file=path.join(project,'.vs','mcp.json'),d=readJSON(file);d.servers ||= {};
    if(d.servers.agentibou && !d.servers.agentibou.args?.includes(stable))throw new Error('Un serveur agentibou existe déjà.');
    if(d.servers.avatai?.args?.includes(stable))delete d.servers.avatai;
    d.servers.agentibou={type:'stdio',command:exe,args:[stable,'mcp'],env:{ELECTRON_RUN_AS_NODE:'1'}};save(file,d);
    return {file,message:'MCP ajouté. Dans Visual Studio, active agentibou_state dans les outils Agent et demande-lui de signaler le début et la fin. Suivi indicatif, dépendant de l’agent.'};
  }
  throw new Error('Intégration inconnue');
}
module.exports={install,command,hook,save,readJSON};
