'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),YAML=require('yaml');
(async()=>{
 const dir=path.resolve(process.argv[2]||'dist'),version=require('../package.json').version;
 const needed=[`Agentibou-${version}-win-x64.exe`,`Agentibou-${version}-mac-arm64.dmg`,`Agentibou-${version}-mac-arm64.zip`,'latest.yml','latest-mac.yml'];
 for(const file of needed)assert.ok(fs.statSync(path.join(dir,file)).size>0,'Missing '+file);
 const checksums=[];
 for(const file of fs.readdirSync(dir).filter(f=>/\.(exe|dmg|zip|yml|blockmap)$/.test(f))){
  const sha256=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(path.join(dir,file)))sha256.update(chunk);checksums.push(sha256.digest('hex')+'  '+file);
 }
 for(const file of ['latest.yml','latest-mac.yml']){
  const metadata=YAML.parse(fs.readFileSync(path.join(dir,file),'utf8'));assert.equal(metadata.version,version);assert.ok(metadata.files?.length);
  for(const entry of metadata.files){const name=decodeURIComponent(entry.url);assert.equal(name,path.basename(name));assert.ok(needed.includes(name),'Unexpected update package '+name);const hash=crypto.createHash('sha512');for await(const chunk of fs.createReadStream(path.join(dir,name)))hash.update(chunk);assert.equal(hash.digest('base64'),entry.sha512,'Update checksum mismatch: '+name);}
 }
 fs.writeFileSync(path.join(dir,'SHA256SUMS.txt'),checksums.sort().join('\n')+'\n');console.log('Verified Windows installer, Mac DMG + ZIP, both update feeds and SHA-512 checksums for '+version);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
