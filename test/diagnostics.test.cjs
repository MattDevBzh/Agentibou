'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createDiagnostics}=require('../src/diagnostics.cjs');

test('diagnostic history rotates across restarts and repeated events are suppressed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-log-'));
 try{
  const log=createDiagnostics(root,{maxBytes:300});
  log.log('renderer-gone',{provider:'codex',reason:'crashed'});
  log.log('renderer-gone',{provider:'codex',reason:'crashed'});
  const file=path.join(log.directory,'companions.jsonl');
  assert.equal(fs.readFileSync(file,'utf8').trim().split('\n').length,1);
  for(let i=0;i<20;i++)createDiagnostics(root,{maxBytes:300}).log('pet-retired',{reason:'renderer-timeout',windowId:i});
  assert.equal(fs.readdirSync(log.directory).length,3);
  for(const name of fs.readdirSync(log.directory)){
   const text=fs.readFileSync(path.join(log.directory,name),'utf8');
   assert.ok(Buffer.byteLength(text)<=300);
   for(const line of text.trim().split('\n'))assert.ok(JSON.parse(line).at);
  }
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8').trim().split('\n').at(-1)).windowId,19);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unwritable diagnostic storage cannot stop recovery',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agentibou-log-'));
 try{
  fs.writeFileSync(path.join(root,'logs'),'occupied');
  assert.doesNotThrow(()=>createDiagnostics(root).log('pet-created'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
