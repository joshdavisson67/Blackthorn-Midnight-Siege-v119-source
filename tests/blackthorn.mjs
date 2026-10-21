import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {BOSS,WARDEN,bossPhase,dueSummons,lanceVolley,cooldownScale,segmentDistance,wakeStep,WAKE_DURATION} from '../public/game/blackthorn-boss.mjs';
import {SARCOPHAGUS,inMausoleum} from '../public/game/graveyard-layout.mjs';
import {curseWaveConfig,curseReward} from '../public/game/curse.mjs';
import {waveConfig} from '../public/game/core.mjs';
import {BRUTE} from '../public/game/brute.mjs';
import {enemyBody} from '../public/game/crowd.mjs';
import {enrageEnemy} from '../public/game/enrage.mjs';

// Sir Blackthorn (v130): woken by The Last Dawn, he climbs out of the
// sarcophagus, throws grave lances, summons Gravewardens and screams a war cry.
export function verifyBlackthorn(qa,frames,listeners,elements){
  // ---- Decisions ------------------------------------------------------------------
  assert.deepEqual([1,.6,.5,.31,.3,.05].map(bossPhase),['fresh','fresh','wounded','wounded','enraged','enraged']);
  assert.equal(dueSummons(.8,0),0);assert.equal(dueSummons(.75,0),1);assert.equal(dueSummons(.39,0),2,'A big hit can cross both thresholds');assert.equal(dueSummons(.39,1),1);assert.equal(dueSummons(.1,2),0);
  assert.deepEqual([1,.51,.5,.2].map(lanceVolley),[1,1,3,3]);assert.equal(cooldownScale(.5),1);assert.equal(cooldownScale(.3),BOSS.enragedCooldown);
  const stages=[0,BOSS.wakeDelay+.1,BOSS.wakeDelay+BOSS.lidTime+.1,BOSS.wakeDelay+BOSS.lidTime+BOSS.riseTime+.1,WAKE_DURATION+.01].map(t=>wakeStep(t).stage);
  assert.deepEqual(stages,['rumble','lid','rise','step','done'],'The lid slides, he rises, then steps down');
  assert.equal(segmentDistance(new T.Vector3(0,0,0),new T.Vector3(10,0,0),new T.Vector3(5,.5,0)),.5);assert.equal(segmentDistance(new T.Vector3(0,0,0),new T.Vector3(1,0,0),new T.Vector3(4,0,0)),3);

  // ---- Waking ------------------------------------------------------------------------
  const ladder=qa.get().curseLadder,select=elements.get('curseRank');
  select.value=String(ladder.unlocked);select.onchange();const rank=ladder.unlocked;
  qa.start();qa.holdSpawns();qa.setHealth(1e6);
  for(let i=0;i<21;i++)qa.startWave();qa.clearQueuedSpawns();frames(110);
  const graveyard=qa.get().graveyard,s=graveyard.nuke.station,lidZ=()=>graveyard.lidGroup.position.z;
  assert(graveyard.open&&!s.locked);assert.equal(qa.get().boss.stage,'dormant');assert.equal(lidZ(),SARCOPHAGUS.z);
  qa.setPlayer(s.x-1.3,s.z);qa.setPoints(20000);qa.interact();
  assert.equal(qa.get().boss.stage,'waking');assert(s.used);
  frames(Math.ceil((BOSS.wakeDelay+BOSS.lidTime+.1)*60));
  assert(lidZ()<SARCOPHAGUS.z-1.3,'The lid has slid off the tomb');
  const rest=qa.get().colliders.find(c=>c.maxY===1.05&&Math.abs(c.x-SARCOPHAGUS.x)<.01);assert(rest&&!rest.disabled,'The fallen lid is solid');
  const boss=qa.get().boss.enemy;assert(boss?.boss&&boss.waking,'He is rising');
  const hp=boss.hp;qa.damageEnemy(boss,1e6,true,{part:'head'});assert.equal(boss.hp,hp,'He cannot be hurt while rising');assert(!boss.dead);
  assert(boss.group.position.y<1.2,'He rises out of the tomb rather than appearing above it');
  frames(Math.ceil((BOSS.riseTime+BOSS.stepTime)*60)+4);
  assert.equal(qa.get().boss.stage,'active');assert(!boss.waking);
  assert(!elements.get('bossHud').classList.contains('hidden'));assert.equal(elements.get('bossTitle').textContent,'SIR BLACKTHORN · FIRST LORD OF THE ESTATE');
  assert(inMausoleum(boss.walkPos.x,boss.walkPos.z)&&boss.walkPos.z>SARCOPHAGUS.z+SARCOPHAGUS.d/2,'He steps down in front of the tomb');
  // Unique zombie: walker rig at brute size, crowned and armed, brute routes.
  const cfg=curseWaveConfig(qa.get().wave,rank);
  assert(Math.abs(boss.maxHp-cfg.health*BOSS.healthMultiplier)<1e-6);assert(boss.brute&&boss.elite&&boss.noEnrage);
  assert.equal(boss.radius,enemyBody({brute:true}).radius);assert.equal(boss.group.scale.x,BOSS.scale);
  let armor=0;boss.group.traverse(o=>{if(o.userData.armor)armor++;});assert(armor>=15,'Breastplate, pauldrons, crown, cloak and sword');
  assert(!enrageEnemy(boss,qa.get().enemyAssets.enrage),'Ordinary rage chains do not affect him');

  // ---- Spawns hold while he fights -----------------------------------------------------
  // The wave cleared before the nuke, so the next one starts during the fight.
  qa.setPlayer(70,4);for(let i=0;i<60*10&&qa.get().toSpawn===0;i++){qa.setHealth(1e6);frames(1);}
  const queued=qa.get().toSpawn;assert(queued>0,'The next wave is queued');
  frames(120);assert.equal(qa.get().toSpawn,queued,'Regular spawns wait for him');
  assert(elements.get('waveState').textContent.startsWith('SIR BLACKTHORN'));

  // ---- Grave lance -------------------------------------------------------------------------
  // Stand in the open on the cemetery path, in sight, well out of sword reach.
  qa.setPlayer(70,4);boss.walkPos.set(70,0,-6);boss.group.position.set(70,0,-6);
  qa.get().boss.lance=0;qa.get().boss.cry=99;qa.setHealth(1000);
  let launched=0;for(let i=0;i<120&&!launched;i++){frames(1);launched=qa.get().bossFx.activeBolts.length;}
  assert.equal(launched,1,'A healthy Sir Blackthorn throws one lance');
  for(let i=0;i<90&&qa.get().bossFx.activeBolts.length;i++){qa.setPlayer(70,4);frames(1);}
  const lance=waveConfig(qa.get().wave).damage*BOSS.lance.damage;
  assert(Math.abs(1000-qa.get().health-lance)<.5,`A lance on target hits for ${lance} (${(1000-qa.get().health).toFixed(1)})`);
  // Walls stop lances.
  const fx=qa.get().bossFx,from=new T.Vector3(0,1.4,0);fx.launch(from,new T.Vector3(1,0,0));
  let hits=0;fx.update(.1,{hit:()=>{hits++;return false;},blocked:p=>p.x>2});assert.equal(fx.activeBolts.length,1);fx.update(.1,{hit:()=>false,blocked:p=>p.x>2});
  assert.equal(fx.activeBolts.length,0,'A lance that reaches a wall is gone');assert.equal(hits,1);

  // ---- Gravewardens, war cry, enrage ---------------------------------------------------------
  qa.setHealth(1e6);qa.setPlayer(70,6);
  qa.damageEnemy(boss,boss.maxHp*.26,false,{part:'torso'});frames(2);
  const wardens=()=>qa.get().zombies.filter(e=>e.warden&&!e.dead);
  assert.equal(wardens().length,1,'At three-quarters health he summons a Gravewarden');
  const w=wardens()[0];
  const now=curseWaveConfig(qa.get().wave,rank);assert(Math.abs(w.maxHp-now.health*BRUTE.healthMultiplier*WARDEN.healthMultiplier)<1e-6);assert(w.speed<now.speed*.77,'The tank is slower than a brute');
  assert.equal(w.group.scale.x,BRUTE.scale*WARDEN.scale);assert(!enrageEnemy(w,qa.get().enemyAssets.enrage));
  const shieldParts=[];w.group.traverse(o=>{if(o.userData.part==='shield')shieldParts.push(o);});assert(shieldParts.length>=3,'It carries a tower shield');
  const whp=w.hp;qa.damageEnemy(w,100,false,{part:'shield'});assert.equal(whp-w.hp,100*WARDEN.shieldFactor,'Shots into the shield do a quarter damage');
  qa.damageEnemy(w,100,false,{part:'torso'});assert.equal(whp-w.hp,125);
  frames(Math.ceil(WARDEN.emergeTime*60)+2);
  // The cry rouses every undead nearby, including the warden.
  const walker=qa.makeZombie(boss.walkPos.x+3,boss.walkPos.z+2),far=qa.makeZombie(-30,20);
  const original=new Map();walker.group.traverse(o=>{if(o.isMesh)original.set(o,o.material);});
  qa.get().boss.cast=null;qa.get().boss.cry=0;qa.get().boss.lance=99;
  let cried=false;for(let i=0;i<150&&!cried;i++){frames(1);cried=walker.warCry>0;}
  qa.get().boss.cry=99;
  assert(cried,'His war cry reaches nearby undead');assert(walker.warCry>BOSS.cry.duration-.1,'The fury starts at full length');assert(w.warCry>0,'The Gravewarden is roused too');assert(!(far.warCry>0),'Undead far away are not');
  assert([...original].some(([o,m])=>o.material!==m),'Roused undead glow red');
  assert(elements.get('toast').textContent.includes('WAR CRY'));
  for(let i=0;i<60*14&&walker.warCry>0;i++)frames(1);
  qa.damageEnemy(walker,1e6);qa.damageEnemy(far,1e6);
  qa.damageEnemy(boss,boss.hp-boss.maxHp*.38,false,{part:'torso'});frames(2);
  assert.equal(qa.get().boss.summons,2,'A second Gravewarden at two-fifths health');
  const speed=boss.speed;qa.damageEnemy(boss,boss.hp-boss.maxHp*.29,false,{part:'torso'});frames(2);
  assert(boss.furious&&Math.abs(boss.speed-speed*BOSS.enragedSpeed)<1e-9,'Below 30% he is enraged');
  assert(elements.get('bossHud').classList.contains('enraged'));assert(elements.get('bossState').textContent.startsWith('ENRAGED'));

  // Below half health he throws three lances at once.
  for(const e of qa.get().zombies)if(!e.dead&&!e.boss)qa.damageEnemy(e,1e9);
  qa.setPlayer(70,4);boss.walkPos.set(70,0,-6);boss.group.position.set(70,0,-6);qa.get().boss.cast=null;qa.get().boss.lance=0;qa.get().boss.cry=99;
  let volley=0;for(let i=0;i<120&&!volley;i++){qa.setHealth(1e6);frames(1);volley=qa.get().bossFx.activeBolts.length;}
  assert.equal(volley,3,'A wounded Sir Blackthorn throws a three-lance volley');
  // ---- Defeat --------------------------------------------------------------------------------
  const unlockedBefore=ladder.unlocked,score=qa.get().totalScore;
  qa.damageEnemy(boss,1e9,false,{part:'torso'});frames(2);
  assert.equal(qa.get().boss.stage,'defeated');assert(elements.get('bossHud').classList.contains('hidden'));
  assert(qa.get().totalScore-score>=curseReward(BOSS.reward,rank),'He pays his bounty, multiplied by the curse');
  assert.equal(ladder.unlocked,unlockedBefore+1,'Beating him at the highest unlocked rank unlocks the next');
  assert(elements.get('banner').textContent.includes(`CURSE RANK ${unlockedBefore+1} UNLOCKED`));
  assert([...select.querySelectorAll('option')].some(o=>o.textContent.startsWith(`RANK ${unlockedBefore+1} ·`)&&!o.disabled),'The title screen offers the new rank');
  assert(qa.get().pickups.some(p=>p.type==='ammo')||elements.get('toast').textContent.includes('MAX AMMO'),'He drops a Max Ammo');
  assert.equal(qa.get().mode,'playing','The run carries on');
  for(const e of qa.get().zombies)if(!e.dead)qa.damageEnemy(e,1e9);
  const waiting=qa.get().toSpawn;assert(waiting>0);qa.setPlayer(0,20);qa.get().nav.rebuild(0,20,0);frames(240);assert(qa.get().toSpawn<waiting,'Regular spawns resume once he falls');
  // ---- Fresh runs ------------------------------------------------------------------------------
  qa.start();
  assert.equal(qa.get().boss.stage,'dormant');assert.equal(lidZ(),SARCOPHAGUS.z,'A new run closes the tomb');assert(rest.disabled);
  assert(elements.get('bossHud').classList.contains('hidden'));assert.equal(qa.get().bossFx.activeBolts.length,0);
  // Beating him below your highest rank unlocks nothing new.
  select.value='0';select.onchange();qa.start();qa.holdSpawns();qa.setHealth(1e6);
  for(let i=0;i<21;i++)qa.startWave();qa.clearQueuedSpawns();frames(110);
  qa.setPlayer(s.x-1.3,s.z);qa.setPoints(20000);qa.interact();frames(Math.ceil(WAKE_DURATION*60)+6);
  const again=qa.get().boss.enemy,top=ladder.unlocked;assert.equal(qa.get().boss.stage,'active');
  qa.damageEnemy(again,1e9);frames(2);assert.equal(ladder.unlocked,top);assert(elements.get('banner').textContent.includes('THE HOUSE REMEMBERS'));
  qa.start();
  console.log(`PASS: Sir Blackthorn — nuke wakes him even on an empty estate, lid slides off and he rises invulnerable from the sarcophagus, ${armor} armor pieces on a brute-sized walker rig, spawns held, grave lances that hit for ${lance} and stop at walls, three-lance volleys below half, Gravewardens at 75%/40% with quarter-damage tower shields, a war cry that reddens and speeds nearby undead for ${BOSS.cry.duration}s, enrage under 30%, curse-scaled bounty, Max Ammo, rank unlock only at the top rank, and clean resets.`);
}
