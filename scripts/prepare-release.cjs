'use strict';
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const version=require('../package.json').version,tag='v'+version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Stable semantic version required');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==tag)throw Error('Git tag and package version differ');
const repo='MattDevBzh/Agentibou';
let existing;try{existing=JSON.parse(execFileSync('gh',['api',`repos/${repo}/releases/tags/${tag}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch(e){if(!String(e.stderr).includes('404'))throw e;}
if(existing&&!existing.draft)throw Error('Version already published. Increment package.json first.');
if(existing){
 if(existing.target_commitish!==process.env.GITHUB_SHA)throw Error('Existing draft belongs to a different commit. Review it before retrying.');
}else execFileSync('gh',['release','create',tag,'--repo',repo,'--draft','--target',process.env.GITHUB_SHA,'--title','Agentibou '+version,'--notes-file','docs/RELEASE-NOTES.md'],{stdio:'inherit'});
fs.appendFileSync(process.env.GITHUB_OUTPUT,`tag=${tag}\nversion=${version}\n`);
