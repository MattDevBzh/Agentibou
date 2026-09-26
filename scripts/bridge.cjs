#!/usr/bin/env node
'use strict';
// No prompt, code, tool argument or response is ever persisted by this bridge.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
// Keep existing installations on the same store as their already-installed hooks.
function dataRoot(env = process.env, home = os.homedir()) {
  if (env.AGENTIBOU_HOME || env.AVATAI_HOME) return env.AGENTIBOU_HOME || env.AVATAI_HOME;
  const legacy = path.join(home, '.avatai');
  return fs.existsSync(legacy) ? legacy : path.join(home, '.agentibou');
}
const ROOT = dataRoot();
const STATES = new Set(['idle', 'thinking', 'working', 'done', 'waiting', 'error']);
function normalize(provider, state, input = {}) {
  if (!['claude', 'codex', 'copilot', 'visualstudio'].includes(provider) || !STATES.has(state)) throw new Error('Invalid event');
  const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();
  const session = input.session_id || input.sessionId || input['thread-id'] || input.session || cwd;
  return { provider, state, session: String(session).slice(0, 250), project: path.basename(cwd).slice(0, 100), cwd, at: Date.now() };
}
function emit(event) {
  const dir = path.join(ROOT, 'events');
  fs.mkdirSync(dir, {recursive:true, mode:0o700});
  const id = crypto.createHash('sha256').update(event.provider + ':' + event.session).digest('hex');
  const file = path.join(dir, id + '.json');
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(event), {mode:0o600});
  fs.renameSync(temp, file);
}
function rpc(msg, session) {
  const ok = result => ({jsonrpc:'2.0', id:msg.id, result});
  if (msg.id === undefined) return null;
  if (msg.method === 'initialize') return ok({protocolVersion:'2024-11-05', capabilities:{tools:{}}, serverInfo:{name:'agentibou',version:'0.2.0'}, instructions:'Call agentibou_state with thinking while reasoning, working while executing tools, and done immediately before the final response. Use waiting if user input is needed and error on failure. This only animates a local companion.'});
  if (msg.method === 'ping') return ok({});
  if (msg.method === 'tools/list') return ok({tools:[{name:'agentibou_state',description:'Update the local desktop companion: thinking at task start, done before final response, waiting for user input, error on failure.',inputSchema:{type:'object',properties:{state:{type:'string',enum:[...STATES]}},required:['state'],additionalProperties:false}}]});
  if (msg.method === 'tools/call' && ['agentibou_state', 'avatai_state'].includes(msg.params?.name)) {
    try { emit(normalize('visualstudio', msg.params.arguments?.state, {session_id:session})); return ok({content:[{type:'text',text:'Companion updated.'}]}); }
    catch { return ok({isError:true,content:[{type:'text',text:'Unable to update companion.'}]}); }
  }
  return {jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}};
}
if (require.main === module) {
  if (process.argv[2] === 'mcp') {
    const session = crypto.randomUUID();
    const rl = readline.createInterface({input:process.stdin});
    rl.on('line', line => {
      try { const result = rpc(JSON.parse(line),session); if(result) process.stdout.write(JSON.stringify(result)+'\n'); }
      catch { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}})+'\n'); }
    });
  } else {
    let input = '';
    const timer = setTimeout(() => process.exit(0), 1500); timer.unref();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { input += chunk; if(input.length > 1048576) process.exit(0); });
    process.stdin.on('end', () => {
      try { emit(normalize(process.argv[2],process.argv[3],input.trim()?JSON.parse(input):{})); } catch {}
      // Observational hooks must never block the coding agent.
      clearTimeout(timer);
    });
  }
}
module.exports = {normalize, emit, rpc, dataRoot};
