import assert from 'node:assert/strict';
import {FERAL,chooseEnemyKind} from '../public/game/feral.mjs';
import {waveConfig} from '../public/game/core.mjs';
import {enrageNearby} from '../public/game/enrage.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyFeral(qa,frames){
  const make=(x,z,y=0)=>qa.makeZombie(x,z,false,false,false,y,true);
  for(let wave=1;wave<7;wave++)for(let slot=0;slot<140;slot++)assert.notEqual(chooseEnemyKind(wave,slot,0),'feral');
  assert.equal(chooseEnemyKind(7,0,0),'feral');
  let ferals=0;
  for(let slot=0;slot<140;slot++)for(let n=0;n<1000;n++){
    const kind=chooseEnemyKind(7,slot,(n+.5)/1000);
    if(slot%7===6)assert.equal(kind,'brute');
    else if(slot%20===19)assert.equal(kind,'ashfang');
    if(kind==='feral')ferals++;
  }
  assert(Math.abs(ferals/140000-1/8)<.001,'Whole spawn population remains roughly 1 in 8 feral');
  // A real spawn at the wave boundary, including placement and the asset cache.
  for(const wave of [6,7]){
    qa.start();for(let i=0;i<wave;i++)qa.startWave();qa.setSeed(2000);
    const before=qa.get().toSpawn;assert(qa.spawnEnemy());const e=qa.get().zombies[0];
    assert.equal(!!e.feral,wave===7);assert.equal(qa.get().toSpawn,before-1);
    if(e.feral){assert.equal(e.speed,waveConfig(wave).speed*3);assert.equal(e.hp,waveConfig(wave).health);}
  }
  console.log('PASS: actual wave-7 unlock, ~12.5% total rarity and retained brute/Ashfang slots.');

  qa.start();for(let wave=1;wave<=40;wave++){
    qa.startWave();const e=make(0,17);assert.equal(e.speed,waveConfig(wave).speed*3);
    qa.get().world.remove(e.group);qa.get().zombies.splice(qa.get().zombies.indexOf(e),1);
  }
  qa.start();const feral=make(0,17),normal=qa.makeZombie(8,17),feral2=make(-8,17);
  assert.equal(feral.style,'feral stalker');assert(!feral.dog&&!feral.brute);assert(feral.sharedAssets);
  assert(feral.group.getObjectByName('feral ribcage'));assert(!normal.group.getObjectByName('feral ribcage'));
  const cache=new Set();feral.group.traverse(o=>{if(o.isMesh)cache.add(o.geometry);});feral2.group.traverse(o=>{if(o.isMesh)assert(cache.has(o.geometry));});
  let red=false,headshot=false;feral.head.traverse(o=>{if(o.isMesh){red||=o.material.userData.enemyEyes&&o.material.emissive?.r>o.material.emissive?.g*10;headshot||=o.userData.head;}});assert(red&&headshot);
  frames(10);assert(feral.root.rotation.x>normal.root.rotation.x+.1,'Feral has a distinct forward sprint posture');
  const kills=qa.get().kills;qa.damageEnemy(feral,100000,true);assert.equal(qa.get().kills,kills+1);assert(feral.dead&&feral.ragdoll);frames(180);
  for(const point of Object.values(feral.ragdoll.points))assert(point.p.toArray().every(Number.isFinite));
  console.log('PASS: distinct gaunt ribbed model, claws/red eyes, running posture, cached assets, headshots and dynamic death.');

  function travel(isFeral,rage=false){
    qa.start();for(let i=0;i<7;i++)qa.startWave();qa.setPlayer(0,23);
    const e=isFeral?make(0,17):qa.makeZombie(0,17);e.flank=0;if(!isFeral)e.speed=waveConfig(7).speed;
    if(rage)enrageNearby({dead:true,walkPos:e.walkPos},[e],()=>0,qa.get().enemyAssets.enrage);
    frames(10);return e.walkPos.z-17;
  }
  const baseTravel=travel(false);assert(Math.abs(travel(true)/baseTravel-3)<.01);assert(Math.abs(travel(true,true)/baseTravel-6)<.01);
  function hit(isFeral,rage=false){
    qa.start();for(let i=0;i<7;i++)qa.startWave();qa.setHealth(10000);qa.setPlayer(0,23);
    const e=isFeral?make(0,22.1):qa.makeZombie(0,22.1);e.attack=0;
    if(rage)enrageNearby({dead:true,walkPos:e.walkPos},[e],()=>0);
    for(let i=0;i<180&&qa.get().health===10000;i++)frames(1);
    return 10000-qa.get().health;
  }
  const baseHit=hit(false);assert(baseHit>0);assert.equal(hit(true),baseHit*2);assert.equal(hit(true,true),baseHit*2.5);
  qa.start();qa.setHealth(10000);qa.setPlayer(0,-10.4,UPPER_Y);const stair=make(0,-10.4);qa.get().nav.rebuild(0,-10.4,UPPER_Y);
  for(let i=0;i<1500&&stair.floorY<UPPER_Y-.02;i++)frames(1);assert(stair.floorY>UPPER_Y-.02,'Feral climbs stairs at its actual speed');
  qa.setPlayer(0,0);qa.get().nav.rebuild(0,0);for(let i=0;i<1500&&stair.floorY>.02;i++)frames(1);assert(stair.floorY<.02,'Feral descends safely');
  assert.equal(FERAL.speedMultiplier,3);qa.start();
  console.log('PASS: actual 3x travel, 2x melee damage, 6x/2.5x Blood Rage, wave scaling and two-way stair pursuit.');
}
