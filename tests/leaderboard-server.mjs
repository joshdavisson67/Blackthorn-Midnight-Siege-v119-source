import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {getLeaderboard,submitScore} from '../server/leaderboard.mjs';
import {open,migrate} from './leaderboard-db.mjs';
import {MAX_CURSE_RANK} from '../public/game/curse.mjs';
const url='https://blackthorn.example/api/leaderboard',get=()=>new Request(url);
const run=(values={})=>({id:crypto.randomUUID(),name:'Josh',score:12000,wave:20,kills:155,duration:615,version:'19',...values});
const post=data=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://blackthorn.example'},body:JSON.stringify(data)});
test('shared persistent scores survive restart and a later game version; duplicate retries insert once',async()=>{const dir=mkdtempSync(join(tmpdir(),'blackthorn-board-')),path=join(dir,'scores.sqlite');let db=open(path);try{migrate(db);const a=run(),b=run({name:'Second player',score:18000,wave:21,version:'20'});assert.equal((await getLeaderboard(get(),db)).status,200);assert.equal((await submitScore(post(a),db)).status,200);await Promise.all([submitScore(post(a),db),submitScore(post(a),db)]);assert.equal((await submitScore(post(b),db)).status,200);db.sqlite.close();db=open(path);const board=await (await getLeaderboard(get(),db)).json();assert.equal(board.entries.length,2);assert.deepEqual(board.entries.map(e=>e.name),['Second player','Josh']);assert.deepEqual(board.entries.map(e=>e.rank),[1,2]);assert.equal(board.entries[1].version,'19');assert.equal((await submitScore(post({...a,score:99000}),db)).status,409);assert.equal((await (await getLeaderboard(get(),db)).json()).entries.length,2);}finally{db.sqlite.close();rmSync(dir,{recursive:true,force:true});}});
test('ranking ties, top 50, name normalization, input limits and origin checks',async()=>{const db=open();try{migrate(db);for(let i=0;i<55;i++)await submitScore(post(run({name:'Player '+i,score:1000+i,wave:i})),db);const best=run({name:'  Test   Player  ',score:20000,wave:20,kills:200});const saved=await (await submitScore(post(best),db)).json();assert.equal(saved.entry.name,'Test Player');await submitScore(post(run({name:'Higher wave',score:20000,wave:21,kills:1})),db);const entries=(await(await getLeaderboard(get(),db)).json()).entries;assert.equal(entries.length,50);assert.equal(entries[0].name,'Higher wave');for(const data of [run({score:-1}),run({score:1.5}),run({name:''}),run({name:'x'.repeat(25)}),run({name:'<script>'}),run({duration:900000}),run({id:'not-a-run'})])assert.equal((await submitScore(post(data),db)).status,400);const cross=new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://elsewhere.example'},body:JSON.stringify(run())});assert.equal((await submitScore(cross,db)).status,403);assert.equal((await submitScore(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(3000)}),db)).status,413);assert.equal((await getLeaderboard(get(),null)).status,503);assert.equal((await submitScore(post(run()),null)).status,503);}finally{db.sqlite.close();}});
test('additive curse migration preserves existing runs and legacy retry IDs; highest rank/title survives restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'blackthorn-curse-')),path=join(dir,'scores.sqlite');let db=open(path);
  try{
    db.sqlite.exec(readFileSync(new URL('../drizzle/0000_graceful_pride.sql',import.meta.url),'utf8'));
    const old=run();db.sqlite.prepare('INSERT INTO leaderboard_scores (id,name,score,wave,kills,duration,version,created_at) VALUES (?,?,?,?,?,?,?,?)').run(old.id,old.name,old.score,old.wave,old.kills,old.duration,old.version,1);
    db.sqlite.exec(readFileSync(new URL('../drizzle/0001_nice_dark_beast.sql',import.meta.url),'utf8'));
    const migrated=(await(await getLeaderboard(get(),db)).json()).entries;assert.equal(migrated.length,1);assert.equal(migrated[0].id,old.id);assert.equal(migrated[0].score,old.score);assert.equal(migrated[0].curse_rank,0);assert.equal(migrated[0].curse_title,'Uncursed');assert.equal((await submitScore(post(old),db)).status,200,'An older exact retry still matches the migrated run');
    const cursed=run({name:'Corrupted survivor',score:30000,wave:31,curseRank:6,curseTitle:'Forged title',version:'95'}),result=await(await submitScore(post(cursed),db)).json();assert.equal(result.entry.curse_rank,6);assert.equal(result.entry.curse_title,'Endless Corruption','Title is derived server-side rather than trusting the supplied title');
    await Promise.all([submitScore(post(cursed),db),submitScore(post(cursed),db)]);db.sqlite.close();db=open(path);
    const entries=(await(await getLeaderboard(get(),db)).json()).entries;assert.equal(entries.length,2);assert.equal(entries[0].curse_rank,6);assert.equal(entries[0].curse_title,'Endless Corruption');assert.equal(entries[1].id,old.id);assert.equal((await submitScore(post({...cursed,curseRank:5}),db)).status,409);
    for(const data of [run({curseRank:-1}),run({curseRank:1.5}),run({curseRank:'1'}),run({curseRank:MAX_CURSE_RANK+1}),run({curseRank:10000})])assert.equal((await submitScore(post(data),db)).status,400);
    for(const [rank,title] of [[1,'The Whispered'],[2,'The Marked'],[3,'The Forsaken'],[4,'The Damned'],[5,"Blackthorn's Chosen"],[6,'Endless Corruption']]){const saved=await(await submitScore(post(run({wave:rank*5,curseRank:rank})),db)).json();assert.equal(saved.entry.curse_title,title);}
  }finally{db.sqlite.close();rmSync(dir,{recursive:true,force:true});}
});
test('a run keeps the curse rank chosen at the start, from its first wave',async()=>{
  const db=open();try{
    migrate(db);
    // The rank is picked on the title screen (v130), so even a wave-1 death can carry it.
    for(const [rank,wave] of [[1,1],[2,3],[3,8],[6,21],[MAX_CURSE_RANK,40]]){
      const score=run({wave,curseRank:rank,version:'130'}),response=await submitScore(post(score),db);assert.equal(response.status,200);
      const saved=await response.json();assert(saved.saved);assert.equal(saved.entry.wave,wave);assert.equal(saved.entry.curse_rank,rank);assert.equal((await submitScore(post(score),db)).status,200,'Retries stay idempotent');
    }
    assert.equal((await submitScore(post(run({wave:5,curseRank:MAX_CURSE_RANK+1,version:'130'})),db)).status,400,'Ranks beyond the ladder are invalid');
    assert.equal((await(await getLeaderboard(get(),db)).json()).entries.length,5,'Only the five actual run IDs are stored');
  }finally{db.sqlite.close();}
});
test('an interrupted confirmation after insertion can retry without losing or duplicating the score',async()=>{
  const db=open();migrate(db);let fail=true;const logs=[],original=console.error;
  const flaky={prepare(sql){if(fail&&sql.startsWith('SELECT rank FROM')){fail=false;throw new Error('Temporary rank lookup outage');}return db.prepare(sql);}};
  const score=run({version:'108',wave:15,curseRank:2});console.error=(...args)=>logs.push(args);
  try{
    assert.equal((await submitScore(post(score),flaky)).status,503);assert.equal(logs.length,1);assert.equal(logs[0][1].stage,'rank');assert(!JSON.stringify(logs).includes(score.name));
    assert.equal((await(await getLeaderboard(get(),db)).json()).entries.length,1,'The insert happened even though acknowledgement failed');
    const retry=await(await submitScore(post(score),flaky)).json();assert(retry.saved);assert.equal(retry.entry.id,score.id);assert.equal(retry.entry.curse_rank,2);assert.equal((await(await getLeaderboard(get(),db)).json()).entries.length,1);
  }finally{console.error=original;db.sqlite.close();}
});
