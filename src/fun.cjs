'use strict';
const fs=require('node:fs');
const jokes=require('./jokes.json');
const minute=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
function funSettings(value={}){return {enabled:value?.enabled===true,count:Number.isInteger(value?.count)?Math.max(1,Math.min(24,value.count)):3,start:minute(value?.start)!==null?value.start:'09:00',end:minute(value?.end)!==null?value.end:'18:00'};}
function validFun(value){return value&&typeof value.enabled==='boolean'&&Number.isInteger(value.count)&&value.count>=1&&value.count<=24&&minute(value.start)!==null&&minute(value.end)!==null&&minute(value.end)>minute(value.start);}
function dayKey(date){return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');}
function atMinute(date,n){return new Date(date.getFullYear(),date.getMonth(),date.getDate(),Math.floor(n/60),n%60).getTime();}
class FunScheduler{
 constructor(file,{random=Math.random}={}){this.file=file;this.random=random;this.state={};this.current=null;try{this.state=JSON.parse(fs.readFileSync(file,'utf8'))||{};}catch{}}
 save(){const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(this.state));fs.renameSync(tmp,this.file);}
 tick(settings,eligible,now=Date.now()){
  const cfg=funSettings(settings),date=new Date(now),day=dayKey(date),signature=JSON.stringify(cfg);
  if(this.state.day!==day){this.state={day,count:0,last:0,lastJoke:this.state.lastJoke,bag:Array.isArray(this.state.bag)?this.state.bag:[]};this.current=null;}
  if(!cfg.enabled||minute(cfg.end)<=minute(cfg.start)){this.current=null;return;}
  const start=atMinute(date,minute(cfg.start)),end=atMinute(date,minute(cfg.end));
  if(this.state.signature!==signature){
   this.state.signature=signature;const left=Math.max(0,cfg.count-(this.state.count||0)),from=Math.max(start,now);
   // Reserve spacing before randomizing so an always-idle day can show every scheduled joke.
   const count=from<end?Math.min(left,Math.ceil((end-from)/300000)):0,free=Math.max(0,end-from-(count-1)*300000);
   this.state.slots=Array.from({length:count},()=>this.random()*free).sort((a,b)=>a-b).map((offset,i)=>Math.floor(from+offset+i*300000));
   this.save();
  }
  if(this.current&&(now>=this.current.until||now<start||now>=end||!eligible.includes(this.current.provider)))this.current=null;
  if(this.current||now<start||now>=end||!eligible.length||!this.state.slots?.length||now<this.state.slots[0]||now-(this.state.last||0)<300000)return;
  let bag=(this.state.bag||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<jokes.length);
  if(!bag.length){bag=Array.from({length:jokes.length},(_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===this.state.lastJoke)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];}
  const index=bag.pop();this.state.bag=bag;this.state.lastJoke=index;this.state.count=(this.state.count||0)+1;this.state.last=now;this.state.slots.shift();this.save();
  this.current={provider:eligible[Math.floor(this.random()*eligible.length)],text:jokes[index],until:now+20000};
 }
 forProvider(provider){return this.current?.provider===provider?this.current.text:null;}
 dismiss(){this.current=null;}
}
module.exports={FunScheduler,funSettings,validFun,dayKey};
