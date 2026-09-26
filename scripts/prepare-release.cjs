'use strict';
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const version=require('../package.json').version,tag='v'+version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Stable semantic version required');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==tag)throw Error('Git tag and package version differ');
const repo='MattDevBzh/Agentibou';
// Drafts without a created tag are absent from the release-by-tag endpoint.
const pages=JSON.parse(execFileSync('gh',['api',`repos/${repo}/releases?per_page=100`,'--paginate','--slurp'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const existing=pages.flat().find(release=>release.tag_name===tag);
if(existing&&!existing.draft)throw Error('Version already published. Increment package.json first.');
if(existing){
 if(existing.target_commitish!==process.env.GITHUB_SHA)throw Error('Existing draft belongs to a different commit. Review it before retrying.');
}else execFileSync('gh',['release','create',tag,'--repo',repo,'--draft','--target',process.env.GITHUB_SHA,'--title','Agentibou '+version,'--notes-file','docs/RELEASE-NOTES.md'],{stdio:'inherit'});
fs.appendFileSync(process.env.GITHUB_OUTPUT,`tag=${tag}\nversion=${version}\n`);
