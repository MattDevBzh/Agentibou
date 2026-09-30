'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'website'),out=path.join(root,'output','site'),dist=path.join(root,'dist');
const remote=process.argv.includes('--remote'),repo='MattDevBzh/Agentibou',base='https://github.com/'+repo;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pattern=/^Agentibou-(\d+\.\d+\.\d+)-(win|mac)-(x64|arm64)\.(exe|dmg|zip)$/;
const size=bytes=>(bytes/1024/1024).toFixed(1).replace('.',',')+' Mio';
function parse(file,bytes,url,sha256=null){const m=pattern.exec(file);if(!m||!((m[2]==='win'&&m[3]==='x64')||(m[2]==='mac'&&m[3]==='arm64')))return null;return {version:m[1],platform:m[2],architecture:m[3],format:m[4].toUpperCase(),file,bytes,size:size(bytes),url,sha256};}
function compare(a,b){const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return y[i]-x[i];return (a.format==='ZIP'?1:0)-(b.format==='ZIP'?1:0);}
async function getReleases(){
 if(remote){
  const response=await fetch('https://api.github.com/repos/'+repo+'/releases?per_page=100',{headers:{Accept:'application/vnd.github+json',...(process.env.GH_TOKEN?{Authorization:'Bearer '+process.env.GH_TOKEN}:{})},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Release catalog unavailable: HTTP '+response.status);
  const releases=await response.json();return releases.filter(r=>!r.draft&&!r.prerelease&&/^v\d+\.\d+\.\d+$/.test(r.tag_name)).flatMap(r=>r.assets.map(a=>{
   const entry=parse(a.name,a.size,`${base}/releases/download/${r.tag_name}/${encodeURIComponent(a.name)}`,a.digest?.startsWith('sha256:')?a.digest.slice(7):null);
   if(!entry||'v'+entry.version!==r.tag_name)return null;entry.checksumUrl=r.assets.some(a=>a.name==='SHA256SUMS.txt')?`${base}/releases/download/${r.tag_name}/SHA256SUMS.txt`:null;return entry;
  }).filter(Boolean));
 }
 const files=fs.existsSync(dist)?fs.readdirSync(dist):[],releases=[];
 for(const file of files){if(!pattern.test(file))continue;const hash=crypto.createHash('sha256');for await(const c of fs.createReadStream(path.join(dist,file)))hash.update(c);const entry=parse(file,fs.statSync(path.join(dist,file)).size,'downloads/'+file,hash.digest('hex'));if(entry)releases.push(entry);}
 return releases;
}
(async()=>{
 const releases=(await getReleases()).sort(compare),win=releases.find(r=>r.platform==='win'),mac=releases.find(r=>r.platform==='mac');
 // output/site is generated only; source assets and release archives live elsewhere.
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'assets'),{recursive:true});
 for(const file of ['vic.webp','toktokette.png','favicon.svg'])fs.copyFileSync(path.join(source,'assets',file),path.join(out,'assets',file));
 for(const file of ['style.css','app.js'])fs.copyFileSync(path.join(source,file),path.join(out,file));
 fs.copyFileSync(path.join(root,'src/companion-prompt.js'),path.join(out,'companion-prompt.js'));
 const checksum=(win?.checksumUrl||mac?.checksumUrl)||(remote?base+'/releases':'downloads/SHA256SUMS.txt');
 const tokens={RELEASE_ROWS:releases.filter(r=>r!==win&&r!==mac).map(r=>`<tr><td>${esc(r.version)}</td><td>${r.platform==='win'?'Windows x64':'Mac Apple Silicon'}</td><td>${esc(r.size)}</td><td><a href="${esc(r.url)}" download>${r.format} ↓</a></td></tr>`).join('')||'<tr><td colspan="4">Les prochaines versions apparaîtront ici.</td></tr>',CHECKSUM_URL:checksum};
 for(const [key,r] of [['WIN',win],['MAC',mac]]){tokens[key+'_URL']=r?.url||base+'/releases';tokens[key+'_VERSION']=r?.version||'à venir';tokens[key+'_SIZE']=r?.size||'publication en préparation';tokens[key+'_FORMAT']=r?.format||'—';}
 let html=fs.readFileSync(path.join(source,'atelier.html'),'utf8').replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in tokens))throw Error('Unknown template token '+key);return tokens[key];});
 for(const [r,label] of [[win,'Windows'],[mac,'Mac']])if(!r)html=html.replace(`Télécharger pour ${label} <span`,`Suivre la première version <span`);
 fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'atelier.html'),html);
 fs.writeFileSync(path.join(out,'releases.json'),JSON.stringify({releases},null,2)+'\n');
 fs.writeFileSync(path.join(out,'.nojekyll'),'');
 if(!remote){fs.mkdirSync(path.join(out,'downloads'));for(const r of releases)fs.copyFileSync(path.join(dist,r.file),path.join(out,r.url),fs.constants.COPYFILE_FICLONE);fs.writeFileSync(path.join(out,'downloads/SHA256SUMS.txt'),releases.map(r=>r.sha256+'  '+r.file).join('\n')+'\n');}
 fs.copyFileSync(path.join(root,'docs/INSTALLER-WINDOWS.txt'),path.join(out,'installer-windows.txt'));
 fs.copyFileSync(path.join(root,'docs/CREER-UN-COMPAGNON.md'),path.join(out,'guide-compagnon.md'));
 console.log(`Agentibou Atelier: ${releases.length} release assets, ${remote?'GitHub Releases links':'local downloads'}; output/site`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
