import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {MAUSOLEUM,inMausoleum} from '../public/game/graveyard-layout.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {UPPER_Y,moveActor} from '../public/game/vertical.mjs';
import {isBlocked} from '../public/game/core.mjs';
import {enrageEnemy} from '../public/game/enrage.mjs';

export function verifyNuke(qa,frames,listeners,elements){
  qa.start();const device=qa.get().graveyard.nuke,s=device.station;
  assert.equal(s.price,20000);assert(inMausoleum(s.x,s.z));assert(s.locked&&!s.used);
  assert(!device.group.visible&&device.collider.disabled,'Device is absent until the tomb opens');
  device.group.traverse(o=>assert(o.userData.dynamic,'Whole device retains its unlock/used visibility after world batching'));
  assert(device.parts.length<=14,'Casing details use a small number of batched draw calls');
  const geometry=device.parts.map(p=>p.geometry),materials=device.parts.map(p=>p.material);
  assert(device.details.some(p=>p.name==='Radiation warning emblem'));assert(device.details.some(p=>p.name==='Red activation button'));
  qa.setPoints(30000);qa.setPlayer(s.x-1.3,s.z);qa.interact();
  assert.equal(qa.get().points,30000);assert(!qa.activateMausoleumNuke());assert(!s.used,'Teleporting into the locked tomb cannot activate its device');
  for(let i=0;i<20;i++)qa.startWave();qa.holdSpawns();assert(s.locked,'The device remains locked during wave 20');

  qa.startWave();qa.holdSpawns();qa.setHealth(10000);frames(110);
  assert(qa.get().graveyard.open&&!s.locked);assert(device.group.visible&&!device.collider.disabled);
  assert(new T.Box3().setFromObject(device.group).max.y<MAUSOLEUM.ceiling,'Bomb stays below the chamber ceiling');
  const lightIds=[];qa.get().scene.traverse(o=>{if(o.isLight)lightIds.push(o.uuid);});
  // Walk to the console, then check both side passages and the rear route.
  qa.setPlayer(MAUSOLEUM.x,MAUSOLEUM.frontZ+1.5);qa.setAim(0,0);qa.setKeys(['KeyW']);frames(65);qa.setKeys([]);
  assert(qa.get().player.z<MAUSOLEUM.frontZ);qa.setKeys(['KeyD']);frames(42);qa.setKeys([]);
  assert(qa.get().player.x>MAUSOLEUM.x+2);assert(!isBlocked(qa.get().player.x,qa.get().player.z,.32,qa.get().colliders));
  for(const x of [MAUSOLEUM.x-2.4,MAUSOLEUM.x+2.4]){
    const p=new T.Vector3(x,0,-17.3);
    for(let i=0;i<90;i++)moveActor(p,0,.055,qa.get().colliders,{radius:.32,allowFall:false});
    assert(p.z>-12.5,'Nuke placement preserves both full walking lanes around the coffin');
    const dx=x<MAUSOLEUM.x?.055:-.055;
    for(let i=0;i<44;i++)moveActor(p,dx,0,qa.get().colliders,{radius:.32,allowFall:false});
    for(let i=0;i<100;i++)moveActor(p,0,.055,qa.get().colliders,{radius:.32,allowFall:false});
    assert(p.z>MAUSOLEUM.frontZ,'Both side lanes still lead through the central doorway');
  }
  qa.get().nav.rebuild(MAUSOLEUM.x,MAUSOLEUM.frontZ+2);
  for(const x of [MAUSOLEUM.x-2,MAUSOLEUM.x,MAUSOLEUM.x+2])assert(qa.get().nav.direction(x,-17,0).reachable,'Rear tomb passage stays connected');

  const walker=qa.makeZombie(0,20);qa.setPlayer(s.x+1.3,s.z);qa.setPoints(20000);qa.interact();
  assert(!s.used&&!walker.dead);assert.equal(qa.get().points,20000,'The console cannot be triggered through an exterior tomb wall');
  qa.setPlayer(s.x-1.3,s.z);qa.setPoints(19999);frames(1);assert(elements.get('interaction').innerHTML.includes('20,000 ESSENCE'));
  qa.interact();assert.equal(qa.get().points,19999);assert(!s.used&&!walker.dead);assert.equal(elements.get('toast').textContent,'NEED 1 MORE ESSENCE');
  qa.damageEnemy(walker,100000);qa.setPoints(20000);qa.interact();
  assert(!s.used);assert.equal(qa.get().points,20000,'An empty estate does not waste the charge');
  assert(elements.get('toast').textContent.includes('NUKE REMAINS ARMED'));
  const victims=[
    qa.makeZombie(-20,-60),
    qa.makeZombie(20,-60,true),
    qa.makeZombie(30,18,false,true),
    qa.makeZombie(21,-7,false,true,true,UPPER_Y),
    qa.makeZombie(-33,-7,false,false,false,UPPER_Y,true),
    qa.makeZombie(CELLAR.x,CELLAR.z,false,false,false,CELLAR.y)
  ];
  for(const e of victims)e.hp=e.maxHp=100000;
  enrageEnemy(victims[1],qa.get().enemyAssets.enrage);enrageEnemy(victims[3],qa.get().enemyAssets.enrage);
  const before=qa.get(),queue=before.toSpawn,kills=before.kills,score=before.totalScore,health=before.health,armor=before.armor;
  listeners.keydown({code:'KeyE',repeat:false});
  assert(s.used&&device.group.visible,'Used casing stays visible and can never be repurchased');
  assert(victims.every(e=>e.dead&&e.hp===0&&e.ragdoll.type==='blast'),'Every type dies immediately on every floor regardless of health, walls or rage');
  assert.equal(qa.get().points,360,'Only five 50-essence body bounties and one 110-essence brute bounty are paid');
  assert.equal(qa.get().totalScore-score,360,'The same bounties contribute to the shared leaderboard score');
  assert.equal(qa.get().kills-kills,6,'Already-dead corpses are excluded from kills and payouts');assert.equal(qa.get().toSpawn,queue,'Unspawned wave enemies retain their queued slots');
  assert.equal(qa.get().health,health);assert.equal(qa.get().armor,armor,'Atomic purge damages enemies only');
  assert(device.parts.find(p=>p.name==='Spent display').visible);assert(!device.parts.find(p=>p.name==='Armed display').visible);
  assert(qa.get().nukeFlashTime>0);assert(elements.get('toast').textContent.includes('+360 ESSENCE'));
  const late=qa.makeZombie(-10,20),after=qa.get();qa.interact();assert(!qa.activateMausoleumNuke());
  assert.equal(qa.get().points,after.points);assert.equal(qa.get().totalScore,after.totalScore);assert.equal(qa.get().kills,after.kills);assert(!late.dead,'Later spawns cannot receive a second detonation');
  frames(100);assert.equal(qa.get().nukeFlashTime,0);assert.equal(Number(elements.get('nukeFlash').style.opacity),0);
  const afterLights=[];qa.get().scene.traverse(o=>{if(o.isLight)afterLights.push(o.uuid);});assert.deepEqual(afterLights,lightIds,'Device and blast add no changing lights');
  qa.startWave();assert(s.used,'A later wave does not rearm the device');

  qa.start();assert(s.locked&&!s.used);assert(!device.group.visible&&device.collider.disabled);assert.equal(qa.get().nukeFlashTime,0);
  assert(device.parts.every((p,i)=>p.geometry===geometry[i]&&p.material===materials[i]),'Fresh runs reuse the exact device GPU assets');
  for(let i=0;i<21;i++)qa.startWave();qa.holdSpawns();qa.setPlayer(s.x-1.3,s.z);qa.setPoints(20000);const fresh=qa.makeZombie(0,20);qa.interact();
  assert(s.used&&fresh.dead);assert.equal(qa.get().points,50,'A new run has its own single-use charge');qa.start();
  console.log('PASS: post-wave-20 mausoleum nuke, clear tomb passages, 20,000-essence affordability, single-use activation, map-wide kills of all types/rage/floors, exact body bounties/shared score, untouched spawn queue/player, bounded models/lights and reusable fresh-run reset.');
}
