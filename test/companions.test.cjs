'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {fileURLToPath}=require('node:url');
const {BUILTINS,CompanionLibrary,cleanSelection}=require('../src/companions.cjs');
const builtin=path.resolve('src/assets/vic.webp');
function root(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-library-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('five bundled companions ship on a fresh install with their original stable IDs',t=>{
 const lib=new CompanionLibrary(root(t),builtin),items=lib.list();assert.deepEqual(items.map(p=>p.name),['Vic','Paprika','Basil','Tempo','Mochi']);assert.equal(new Set(items.map(p=>p.id)).size,5);
 for(const item of items){assert.equal(item.builtin,true);assert.ok(fs.statSync(fileURLToPath(item.imageUrl)).size>0);}
});
test('promoted library entries keep assignments without duplicates or deleting original images',t=>{
 const dir=root(t),local=path.join(dir,'companions');fs.mkdirSync(local);const entries=BUILTINS.slice(1).map(p=>({id:p.id,type:'png',name:p.legacyName}));
 entries[2].name='Mon codeur';
 for(const e of entries){fs.mkdirSync(path.join(local,e.id));fs.writeFileSync(path.join(local,e.id,'atlas.png'),'original untouched');}
 fs.writeFileSync(path.join(local,'library.json'),JSON.stringify(entries));let lib=new CompanionLibrary(dir,builtin);
 assert.equal(lib.list().length,5);assert.equal(lib.list()[2].name,'Basil');assert.equal(lib.list()[3].name,'Mon codeur');
 const selection={mode:'per-tool',defaultId:entries[0].id,assignments:{codex:entries[1].id,claude:entries[2].id,'copilot-cli':entries[3].id}};assert.deepEqual(cleanSelection(selection,lib.list()),selection);
 lib.add('Import',fs.readFileSync(builtin),'webp');lib=new CompanionLibrary(dir,builtin);assert.equal(lib.list()[3].name,'Mon codeur');assert.deepEqual(cleanSelection(selection,lib.list()),selection);
 for(const e of entries)assert.equal(fs.readFileSync(path.join(local,e.id,'atlas.png'),'utf8'),'original untouched');
});
test('renaming bundled and imported companions persists without changing IDs, selections or images',t=>{
 const dir=root(t);let lib=new CompanionLibrary(dir,builtin);const added=lib.add('Pixel',fs.readFileSync(builtin),'webp');
 lib.rename('vic','  Victor  ');lib.rename(added.id,'Étoile <3');lib.rename(BUILTINS[4].id,'Nuage');lib=new CompanionLibrary(dir,builtin);
 assert.equal(lib.list()[0].name,'Victor');assert.equal(lib.list().find(p=>p.id===added.id).name,'Étoile <3');assert.equal(lib.list()[4].name,'Nuage');assert.equal(lib.list().find(p=>p.id===added.id).imageUrl,added.imageUrl);
 for(const bad of ['', '  ', 'x'.repeat(41), null, {}])assert.throws(()=>lib.rename('vic',bad));assert.throws(()=>lib.rename('../elsewhere','Bad'));assert.equal(lib.list()[0].name,'Victor');
});
test('failed rename does not update the displayed name',t=>{
 const dir=root(t),lib=new CompanionLibrary(dir,builtin);lib.rename('vic','Victor');fs.mkdirSync(lib.namesFile+'.tmp');assert.throws(()=>lib.rename('vic','Lost'));assert.equal(lib.list()[0].name,'Victor');assert.equal(new CompanionLibrary(dir,builtin).list()[0].name,'Victor');
});
