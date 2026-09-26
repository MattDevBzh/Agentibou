'use strict';
const fs=require('node:fs');const path=require('node:path');
const {codexEvent}=require('./state.cjs');
class Watcher {
  constructor(store, root, codexRoot,usage=null){this.usage=usage;this.store=store;this.root=root;this.codexRoot=codexRoot;this.files=new Map();this.lastScan=0;this.status={codex:'Recherche des sessions locales…',hooks:'En attente de signal'};}
  poll(){
    this.usage?.poll();
    const dir=path.join(this.root,'events');
    try {for(const name of fs.readdirSync(dir)){if(!name.endsWith('.json'))continue;const file=path.join(dir,name);try{const e=JSON.parse(fs.readFileSync(file,'utf8'));if(Date.now()-e.at>86400000){fs.unlinkSync(file);continue;}this.store.accept(e);}catch{}}}catch{}
    if(Date.now()-this.lastScan>10000){this.scan();this.lastScan=Date.now();}
    for(const [file,entry] of this.files){try{
      const stat=fs.statSync(file);if(stat.size===entry.offset)continue;
      if(stat.size<entry.offset){entry.offset=0;entry.partial='';entry.meta={};entry.decoder=null;}
      const fd=fs.openSync(file,'r');
      try{const len=Math.min(stat.size-entry.offset,2*1024*1024);const buf=Buffer.alloc(len);const n=fs.readSync(fd,buf,0,len,entry.offset);entry.offset+=n;
      const {StringDecoder}=require('node:string_decoder');entry.decoder ||= new StringDecoder('utf8');
      const lines=(entry.partial+entry.decoder.write(buf.subarray(0,n))).split('\n');entry.partial=lines.pop();
      if(entry.partial.length>8*1024*1024)entry.partial='';
      for(const line of lines){const e=codexEvent(line,entry.meta);if(e)this.store.accept(e);this.usage?.observeCodex(line,entry.meta);}}
      finally{fs.closeSync(fd);}
    }catch{this.files.delete(file);}}
  }
  scan(){
    // Only discover the last two days; keep already-followed files through midnight.
    let found=false;
    for(let ago=0;ago<2;ago++){
      const d=new Date(Date.now()-ago*86400000);
      const parts=[String(d.getFullYear()),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')];
      const dir=path.join(this.codexRoot,'sessions',...parts);
      try{for(const n of fs.readdirSync(dir)){if(!n.endsWith('.jsonl'))continue;found=true;const file=path.join(dir,n);if(this.files.has(file))continue;
        const stat=fs.statSync(file);if(Date.now()-stat.mtimeMs>86400000)continue;
        const meta={};const fd=fs.openSync(file,'r');
        try{const b=Buffer.alloc(Math.min(stat.size,256*1024));fs.readSync(fd,b,0,b.length,0);codexEvent(b.toString('utf8').split('\n')[0],meta);}finally{fs.closeSync(fd);}
        const start=Math.max(0,stat.size-2*1024*1024);
        this.files.set(file,{offset:start,partial:'',meta});
      }}catch{}
    }
    this.status.codex=found?'Journaux locaux détectés':'Aucune session locale détectée';
    for(const [file] of this.files){try{if(Date.now()-fs.statSync(file).mtimeMs>86400000)this.files.delete(file);}catch{this.files.delete(file);}}
  }
}
module.exports={Watcher};
