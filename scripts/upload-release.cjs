'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const tag=process.env.RELEASE_TAG;if(!/^v\d+\.\d+\.\d+$/.test(tag))throw Error('Invalid release tag');
const files=fs.readdirSync('dist').filter(f=>/^Agentibou-[\d.]+-(?:win|mac)-(?:x64|arm64)\.(?:exe|zip|dmg)(?:\.blockmap)?$/.test(f)||/^latest(?:-mac)?\.yml$/.test(f));
if(files.length<2)throw Error('Missing packages or update metadata');
execFileSync('gh',['release','upload',tag,'--repo','MattDevBzh/Agentibou',...files.map(f=>path.join('dist',f)),'--clobber'],{stdio:'inherit'});
