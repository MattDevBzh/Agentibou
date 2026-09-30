'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {pathToFileURL}=require('node:url');
const PROVIDERS=['codex','claude','copilot','copilot-cli','visualstudio'];
const BUILTINS=[
 {id:'vic',name:'Vic',file:'vic.webp'},
 {id:'600ddd0f-4e99-482f-bc26-5f23d165e82d',name:'Paprika',legacyName:'Toktokette',file:'toktokette.png'},
 {id:'f2080ac5-c137-4964-803e-6470a8613b99',name:'Basil',legacyName:'Toktok',file:'basil.png'},
 {id:'061b51cc-6f7a-48c8-8c54-34d97647deea',name:'Tempo',legacyName:'Bastien',file:'tempo.png'},
 {id:'e475d119-61d9-4b5e-9cd4-5f2a5b7fd982',name:'Mochi',legacyName:'Chaton',file:'mochi.png'}
];
const validId=id=>typeof id==='string'&&/^[0-9a-f-]{36}$/.test(id);
function cleanName(name){if(typeof name!=='string')throw new Error('Donne un nom au compagnon.');const n=name.replace(/[\x00-\x1f]/g,'').trim();if(!n||n.length>40)throw new Error('Le nom doit contenir de 1 à 40 caractères.');return n;}
function imageType(bytes){if(bytes.length>20*1024*1024)throw new Error('L’image ne doit pas dépasser 20 Mo.');if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';throw new Error('Choisis une image PNG ou WebP.');}
function cleanSelection(value,catalog){const ids=new Set(catalog.map(p=>p.id));const source=value&&typeof value==='object'?value:{};const defaultId=ids.has(source.defaultId)?source.defaultId:'vic';const assignments={};for(const p of PROVIDERS)if(ids.has(source.assignments?.[p]))assignments[p]=source.assignments[p];return {mode:source.mode==='per-tool'?'per-tool':'shared',defaultId,assignments};}
function selectedCompanion(selection,catalog,provider){const s=cleanSelection(selection,catalog);const id=s.mode==='per-tool'?(s.assignments[provider]||s.defaultId):s.defaultId;return catalog.find(p=>p.id===id)||catalog[0];}
function visibleProviders(conversations,selection,keepAssignedVisible=true){const wanted=PROVIDERS.filter(provider=>conversations.some(e=>e.provider===provider)||(keepAssignedVisible&&selection.mode==='per-tool'&&!!selection.assignments[provider]));return wanted.length?wanted:['idle'];}
class CompanionLibrary{
 constructor(root,builtin){
  this.root=path.join(root,'companions');this.file=path.join(this.root,'library.json');this.namesFile=path.join(this.root,'names.json');this.builtin=builtin;this.entries=[];this.names={};
  try{const entries=JSON.parse(fs.readFileSync(this.file,'utf8'));if(Array.isArray(entries))for(const e of entries.slice(0,100)){
   if(!e||!validId(e.id)||!['png','webp'].includes(e.type))continue;
   try{const name=cleanName(e.name),included=BUILTINS.find(p=>p.id===e.id);
    // Keep IDs/assignments when a previously imported companion becomes bundled.
    if(included){if(name!==included.legacyName&&name!==included.name)this.names[e.id]=name;}
    else if(fs.existsSync(this.asset(e))&&!this.entries.some(p=>p.id===e.id))this.entries.push({id:e.id,type:e.type,name});
   }catch{}
  }}catch{}
  try{const names=JSON.parse(fs.readFileSync(this.namesFile,'utf8'));if(names&&typeof names==='object'&&!Array.isArray(names))for(const [id,name] of Object.entries(names)){
   if(!BUILTINS.some(p=>p.id===id)&&!this.entries.some(p=>p.id===id))continue;
   try{this.names[id]=cleanName(name);}catch{}
  }}catch{}
 }
 asset(e){return path.join(this.root,e.id,'atlas.'+e.type);}
 list(){return [...BUILTINS.map(p=>({id:p.id,name:p.name,builtin:true,imageUrl:pathToFileURL(p.id==='vic'?this.builtin:path.join(path.dirname(this.builtin),p.file)).href})),...this.entries.map(e=>({id:e.id,name:e.name,builtin:false,imageUrl:pathToFileURL(this.asset(e)).href}))].map(p=>({...p,name:this.names[p.id]||p.name}));}
 rename(id,name){
  if(!this.list().some(p=>p.id===id))throw new Error('Compagnon indisponible.');
  const names={...this.names,[id]:cleanName(name)};
  this.saveNames(names);this.names=names;
  return this.list().find(p=>p.id===id);
 }
 saveNames(names=this.names){fs.mkdirSync(this.root,{recursive:true,mode:0o700});const tmp=this.namesFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(names,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,this.namesFile);
 }
 save(){this.saveNames();fs.mkdirSync(this.root,{recursive:true,mode:0o700});const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(this.entries,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,this.file);}
 add(name,bytes,type){name=cleanName(name);if(type!==imageType(bytes))throw new Error('Format incohérent.');if(this.entries.length>=100)throw new Error('La bibliothèque contient déjà 100 compagnons.');const entry={id:crypto.randomUUID(),name,type};const dir=path.dirname(this.asset(entry));fs.mkdirSync(dir,{recursive:true,mode:0o700});try{fs.writeFileSync(this.asset(entry),bytes,{mode:0o600});this.entries.push(entry);this.save();}catch(e){this.entries=this.entries.filter(p=>p.id!==entry.id);fs.rmSync(dir,{recursive:true,force:true});throw e;}return this.list().find(p=>p.id===entry.id);}
}
module.exports={BUILTINS,visibleProviders,CompanionLibrary,PROVIDERS,cleanSelection,selectedCompanion,cleanName,imageType};
