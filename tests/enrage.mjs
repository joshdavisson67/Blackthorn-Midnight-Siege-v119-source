import assert from 'node:assert/strict';
import {ENRAGE,enrageNearby} from '../public/game/enrage.mjs';

export function verifyEnrage(qa,frames){
  const actor=(x=0,y=0,z=0)=>({walkPos:{x,y,z},dead:false,enraged:false,speed:2});
  const casualty=actor();casualty.dead=true;
  const boundary=actor(6),outside=actor(6.001),above=actor(0,6.001),corpse=actor();corpse.dead=true;
  const miss=actor(1);let rolls=0;
  assert.equal(enrageNearby(casualty,[casualty,boundary,outside,above,corpse,miss],()=>[.149999,.15][rolls++]),1);
  assert(boundary.enraged);assert.equal(boundary.speed,4);assert(!miss.enraged);assert(!outside.enraged);assert(!above.enraged);assert(!corpse.enraged);assert.equal(rolls,2);
  assert.equal(enrageNearby(casualty,[miss],()=>0),0,'One death cannot be processed twice');
  const next=actor();next.dead=true;enrageNearby(next,[boundary,miss],()=>0);assert(miss.enraged);assert.equal(boundary.speed,4,'Nearby deaths never stack rage');
  let sample=0;const crowd=Array.from({length:100},()=>actor(1)),sampleDeath=actor();sampleDeath.dead=true;
  assert.equal(enrageNearby(sampleDeath,crowd,()=>sample++/100),15);
  console.log('PASS: independent 15% threshold, 6m spherical boundary, repeat opportunities, corpse exclusion and no double-processing/stacking.');

  // The real death pipeline triggers all enemy variants, with isolated shared visuals.
  qa.start();qa.setPlayer(0,23);
  const variants=[[false,false,false],[true,false,false],[false,true,false],[false,true,true]];
  const enemies=variants.map((args,i)=>qa.makeZombie(-3+i*2,18,...args));
  const distant=qa.makeZombie(20,23),distantMaterials=[];distant.group.traverse(o=>{if(o.isMesh)distantMaterials.push([o,o.material]);});
  const speeds=enemies.map(e=>e.speed),victim=qa.makeZombie(0,20);
  const beforeKills=qa.get().kills,originalRandom=Math.random;
  try{Math.random=()=>0;qa.damageEnemy(victim,100000);}finally{Math.random=originalRandom;}
  assert.equal(qa.get().kills,beforeKills+1);assert(victim.enrageTriggered);
  enemies.forEach((e,i)=>{assert(e.enraged);assert.equal(e.speed,speeds[i]*2);let glowing=false;e.group.traverse(o=>{if(o.isMesh&&o.material.emissive?.getHex()===0xb71e0d)glowing=true;});assert(glowing);});
  assert(!distant.enraged);for(const [mesh,material] of distantMaterials)assert.equal(mesh.material,material,'Rage must not recolor ordinary enemies sharing the original material');
  qa.damageEnemy(victim,100000);assert.equal(qa.get().kills,beforeKills+1);
  qa.setHealth(10000);qa.startWave();frames(120);assert(enemies.every(e=>e.enraged),'Time and wave transitions do not clear rage');
  assert(!qa.makeZombie(22,23).enraged,'New spawns start normal');
  const chainTarget=qa.makeZombie(enemies[0].walkPos.x+1,enemies[0].walkPos.z,false,false,false,enemies[0].walkPos.y);
  try{Math.random=()=>0;qa.damageEnemy(enemies[0],100000);}finally{Math.random=originalRandom;}
  assert(enemies[0].dead);assert(chainTarget.enraged,'Killing an enraged enemy can trigger another nearby enemy');
  qa.start();assert.equal(qa.get().zombies.length,0);assert(!qa.makeZombie(0,17).enraged);
  console.log('PASS: real kills enrage all four types, preserve other materials, persist across time/waves, chain on death and clear with the run.');

  function travel(args,rage,frenzy){
    qa.start();qa.startWave();qa.setPlayer(0,23);const e=qa.makeZombie(0,17,...args);e.speed=2;e.flank=0;
    if(rage)enrageNearby({dead:true,walkPos:e.walkPos},[e],()=>0,qa.get().enemyAssets.enrage);
    if(frenzy)qa.triggerFrenzy();frames(12);return e.walkPos.z-17;
  }
  function firstHit(args,rage){
    qa.start();qa.setHealth(10000);qa.setPlayer(0,23);const e=qa.makeZombie(0,22.1,...args);e.attack=0;
    if(rage)enrageNearby({dead:true,walkPos:e.walkPos},[e],()=>0);
    for(let i=0;i<180&&qa.get().health===10000;i++)frames(1);
    const damage=10000-qa.get().health;assert(damage>0,'Attack must make contact');return damage;
  }
  for(const args of variants){
    const normal=travel(args,false,false),rage=travel(args,true,false),combined=travel(args,true,true);
    assert(Math.abs(rage/normal-2)<.01,'Actual movement must double');assert(Math.abs(combined/normal-2.8)<.01,'Rage multiplies the current frenzy speed');
    const base=firstHit(args,false),boosted=firstHit(args,true);assert(Math.abs(boosted/base-1.25)<1e-8,'Actual melee/bite damage must increase by exactly 25%');
  }
  assert.equal(ENRAGE.damageMultiplier,1.25);
  console.log('PASS: actual walker, brute, dog and Ashfang movement doubles; frenzy combines to 2.8x, and each melee/bite hit deals 25% extra damage.');
  qa.start();
}
