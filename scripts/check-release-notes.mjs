import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {RELEASES,CURRENT_VERSION as ARCHIVED_VERSION} from '../public/game/changelog-data.mjs';
import {CURRENT_VERSION} from '../public/game/version.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function validateReleaseHistory(releases,previous=[]){
  assert(Array.isArray(releases)&&releases.length,'Preserve the archived release history');
  const latest=releases[0].version;
  assert.equal(releases.length,latest,'Keep every version from v1 through the current release');
  for(const [index,r] of releases.entries()){
    assert.equal(r.version,latest-index,'Release versions must be unique, consecutive and newest first');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(Date.parse(r.date)),`v${r.version} needs a release date`);
    assert(typeof r.title==='string'&&r.title.trim(),`v${r.version} needs a title`);
    assert(Array.isArray(r.tags)&&r.tags.length&&r.tags.every(t=>typeof t==='string'&&t.trim()),`v${r.version} needs a category`);
    assert(Array.isArray(r.changes)&&r.changes.length&&r.changes.every(c=>typeof c==='string'&&c.trim().length>=12),`v${r.version} needs meaningful change notes`);
  }
  if(previous.length)assert.deepEqual(releases.filter(r=>r.version<=previous[0].version),previous,'Append a new release; preserve previously published notes');
}
export function releaseFingerprint(directory=root){
  const files=[];
  function walk(path){if(!existsSync(path))return;for(const item of readdirSync(path,{withFileTypes:true})){const full=resolve(path,item.name);if(item.isDirectory())walk(full);else if(item.isFile())files.push(full);}}
  for(const folder of ['public','app','server','db','drizzle'])walk(resolve(directory,folder));
  const manifest=resolve(directory,'.openai/hosting.json');if(existsSync(manifest))files.push(manifest);
  const hash=createHash('sha256');
  for(const path of files.sort()){
    const name=relative(directory,path).replaceAll('\\','/');
    if(name==='public/game/changelog-data.mjs')continue;
    hash.update(name).update('\0').update(readFileSync(path)).update('\0');
  }
  return 'sha256:'+hash.digest('hex');
}
function previousHistory(){
  let source;
  try{source=execFileSync('git',['show','HEAD:public/game/changelog-data.mjs'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']});}
  catch{return [];}
  const json=/export const RELEASES=([\s\S]*?);\s*export const CURRENT_VERSION/.exec(source)?.[1];
  assert(json,'The previous release history must remain readable');return JSON.parse(json);
}
function previousGameVersion(fallback){
  let source;
  try{source=execFileSync('git',['show','HEAD:public/game/version.mjs'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']});}
  catch{return fallback;}
  const version=/export const CURRENT_VERSION=(\d+);/.exec(source)?.[1];
  assert(version,'The previous game version must remain readable');return Number(version);
}
function validateCacheVersions(){
  const checks={
    'public/game/boot.js':[`game.js?v=${CURRENT_VERSION}`],
    'public/game/index.html':[`boot.js?v=${CURRENT_VERSION}`,`style.css?v=${CURRENT_VERSION}`,`changelog.css?v=${CURRENT_VERSION}`],
    'public/game/game.js':[`leaderboard.mjs?v=${CURRENT_VERSION}`,`changelog.mjs?v=${CURRENT_VERSION}`],
    'public/game/leaderboard.mjs':[`version.mjs?v=${CURRENT_VERSION}`],
    'public/game/changelog.mjs':[`changelog-data.mjs?v=${ARCHIVED_VERSION}`]
  };
  for(const [file,values] of Object.entries(checks)){const source=readFileSync(resolve(root,file),'utf8');for(const value of values)assert(source.includes(value),`Update ${file} to load ${value}`);}
}
export function checkReleaseNotes({seal=false}={}){
  const previous=previousHistory();validateReleaseHistory(RELEASES,previous);validateCacheVersions();
  if(previous.length)assert.deepEqual(RELEASES,previous,'The retired Change Log must remain unchanged');
  assert(Number.isSafeInteger(CURRENT_VERSION)&&CURRENT_VERSION>=ARCHIVED_VERSION,'Use a valid current game version independently of the archived history');
  const path=resolve(root,'.openai/release-state.json'),fingerprint=releaseFingerprint();
  const state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
  if(seal){
    if(state?.fingerprint!==fingerprint&&previous.length)assert(CURRENT_VERSION>previousGameVersion(previous[0].version),'Game source changed: increment version.mjs and update cache versions before sealing it');
    writeFileSync(path,JSON.stringify({version:CURRENT_VERSION,fingerprint},null,2)+'\n');
  }else{
    assert(state,'Run npm run release:seal before testing or publishing');
    assert.equal(state.version,CURRENT_VERSION,'Seal the current game version with npm run release:seal');
    assert.equal(state.fingerprint,fingerprint,'Game source changed after sealing. Update the game/cache versions as needed and run npm run release:seal');
  }
  console.log(`PASS: game v${CURRENT_VERSION}, unchanged archived history v1–v${ARCHIVED_VERSION}, current asset versions and matching game source.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)checkReleaseNotes({seal:process.argv.includes('--seal')});
