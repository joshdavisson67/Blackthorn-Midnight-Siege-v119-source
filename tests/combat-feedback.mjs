import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {COMBAT,createWeaponRecoil,staggerLimits,registerStagger,advanceStagger,damageBearing,createCombatHud} from '../public/game/combat-feedback.mjs';
import {createZombieRig,tagZombie,reactToHit,animateZombie,beginZombieDeath} from '../public/game/zombies.mjs';
import {createZombieDogRig,animateZombieDog} from '../public/game/zombie-dog.mjs';

export function verifyReloadProgress(qa,frames,listeners,elements){
  const track=elements.get('reloadProgress'),fill=elements.get('reloadProgressFill');
  const visible=()=>!track.classList.contains('hidden');
  const progress=()=>Number(fill.style.transform.match(/^scaleX\((.+)\)$/)[1]);
  function start(){qa.start();qa.startWave();qa.holdSpawns();qa.setPlayer(0,20);qa.setHealth(10000);}
  assert.equal(track.getAttribute('role'),'progressbar');
  for(const [i,weapon] of Object.keys(COMBAT).entries()){
    start();assert(!visible(),'A new run has no reload indicator');
    const inv=qa.get().inventory[weapon];inv.owned=true;inv.forgeRank=i%4;inv.ammo=0;inv.reserve=2000;
    if(i%2)qa.get().perkOwned.add('quick');
    qa.selectWeapon(weapon);qa.reload();const duration=qa.get().reloadDuration;
    assert(visible(),'Reloading immediately shows the bar');assert.equal(progress(),0);
    const fps=[30,60,144][i%3];frames(Math.floor(duration*fps*.4),1000/fps);
    assert(progress()>0&&progress()<1,'The fill advances before ammo transfers');assert.equal(inv.ammo,0);
    assert(!/RELOADING|\d+%/.test(elements.get('reloadStatus').textContent),'The bottom-right HUD contains no reload percentage');
    assert(elements.get('reloadStatus').textContent.includes('G GRENADE 3'),'Grenade inventory stays readable during reload');
    frames(Math.ceil(duration*fps),1000/fps);assert.equal(qa.get().reloadLeft,0);assert(inv.ammo>0);assert(!visible(),'The bar disappears on completion');
    qa.reload();assert(!visible(),'A full magazine does not show a progress bar');
  }

  start();let inv=qa.get().inventory.glock;inv.ammo=0;
  listeners.keydown({code:'KeyR'});frames(12);const remaining=qa.get().reloadLeft,before=progress();
  listeners.keydown({code:'Escape'});frames(90);assert.equal(qa.get().reloadLeft,remaining);assert.equal(progress(),before,'Pause freezes the fill with the reload timer');
  elements.get('resume').onclick();frames(1);assert(progress()>before);
  qa.openMap();const mapProgress=progress();frames(60);assert.equal(progress(),mapProgress,'Reading the map cannot complete a reload');qa.closeMap();
  const beforeRefill=qa.get().reloadLeft;
  qa.dropPickup(0,20,'ammo');frames(8);assert(qa.get().reloadLeft>0&&qa.get().reloadLeft<beforeRefill);assert(visible(),'Max Ammo preserves the ongoing reload');assert.equal(inv.ammo,0);
  frames(Math.ceil(qa.get().reloadLeft*60)+1);assert(!visible(),'The preserved reload bar disappears at normal completion');assert.deepEqual([inv.ammo,inv.reserve],[13,78]);

  inv.ammo=0;qa.reload();assert(visible());
  const station=qa.get().interactables.find(s=>s.type==='shotgun'&&s.y===0);
  qa.setPoints(10000);qa.setPlayer(station.x+Math.sin(station.rotation||0)*1.5,station.z+Math.cos(station.rotation||0)*1.5,station.y);qa.interact();
  assert.equal(qa.get().weapon,'shotgun');assert(!visible(),'Acquiring a weapon clears the cancelled reload');

  start();inv=qa.get().inventory.glock;inv.ammo=0;inv.reserve=0;qa.reload();assert(!visible(),'No reserve means no reload bar');
  inv.reserve=78;qa.reload();assert(visible());qa.hurtPlayer(20000);frames(1);assert(!visible(),'Death hides an unfinished reload');
  qa.start();assert(!visible());assert.equal(progress(),0,'A fresh run clears old progress');
  console.log('PASS: reticle reload bar for all six weapons at 30/60/144 Hz, forged/Quickhands timing, ammo transfer, grenade visibility, pause/map freeze, invalid reloads, refill progress preservation, weapon-purchase cancellation, death and restart.');
}

const actor=(flags={})=>({hp:10000,speed:2,attack:0,attackTime:.2,dead:false,...flags});
const hit=(source,part='torso',shotId)=>({source,part,shotId});
let e=actor();
assert(!registerStagger(e,hit('glock')));assert(!registerStagger(e,hit('glock')));
assert(registerStagger(e,hit('glock')),'Three ordinary Glock hits accumulate an interrupt');
assert.equal(e.attackTime,-1);assert.equal(e.speed,2);
for(let i=0;i<20;i++)assert(!registerStagger(e,hit('bushmaster','head')),'Recovery prevents permanent stagger');
advanceStagger(e,2);assert(registerStagger(e,hit('glock','head')),'A well-placed Glock head hit interrupts an ordinary survivor');
e=actor({brute:true});
assert(!registerStagger(e,hit('bushmaster','head')));assert(registerStagger(e,hit('bushmaster','head')),'Two heavy head hits can stagger a brute');
e=actor({brute:true});let hits=0;
while(!e.staggerLeft&&hits<12){registerStagger(e,hit('lmg'));hits++;advanceStagger(e,.09);}
assert.equal(hits,7,'A sustained LMG burst can stagger a brute');
e=actor({brute:true});for(let i=0;i<8;i++)assert(!registerStagger(e,hit('shotgun','head',41)));
assert.equal(e.staggerMeter,135,'One shotgun shell does not count as eight heavy hits');
assert(registerStagger(e,hit('shotgun','head',42)));
e=actor();registerStagger(e,hit('shotgun','torso',1));registerStagger(e,hit('shotgun','head',1));assert(e.staggerLeft>0);
e=actor();registerStagger(e,hit('glock'));advanceStagger(e,4);assert.equal(e.staggerMeter,0,'Unfollowed hits decay');
for(const flags of [{},{brute:true},{feral:true},{dog:true},{dog:true,rareDog:true}]){
  e=actor(flags);for(let i=0;i<25;i++)registerStagger(e,hit('Bella','leg'));assert(!e.staggerLeft&&!e.staggerMeter,'Bella cannot stun-lock targets');
  e.staggerProfile=staggerLimits(e);let count=0;while(!e.staggerLeft&&count++<8)registerStagger(e,hit('bushmaster','head'));
  assert(e.staggerLeft>0);assert.equal(e.attackTime,-1);assert.equal(e.speed,2);e.dead=true;assert(!registerStagger(e,hit('bushmaster','head')));
}
console.log('PASS: location-weighted stagger, heavy-hit brute thresholds, decay, bounded interrupts and recovery, all undead, shell budgets and Bella exclusion.');

// Each hit moves the affected existing joint; the wrong arm/leg stays at its gait pose.
for(const flags of [{},{brute:true},{feral:true},{dog:true},{dog:true,rare:true}])for(const part of ['head','torso','arm','leg']){
  if(flags.dog&&part==='arm')continue;
  const make=()=>{const rig=flags.dog?createZombieDogRig({...flags,rng:()=>.31}):createZombieRig({...flags,rng:()=>.31});rig.speed=2;rig.attack=1;return rig;};
  const rig=make(),baseline=make(),animate=flags.dog?animateZombieDog:animateZombie;
  tagZombie(rig,rig);reactToHit(rig,{part,side:1,limb:'front',direction:new T.Vector3(0,0,-1),force:.85});
  if(part==='head'){rig.hp=10000;registerStagger(rig,hit('bushmaster','head'));registerStagger(rig,hit('bushmaster','head'));assert(rig.staggerLeft>0);}
  animate(rig,.02,8,0);animate(baseline,.02,8,0);
  if(part==='head'){
    const kick=baseline.head.rotation.x-rig.head.rotation.x;assert(kick>.08&&kick<.3,'Head hits give a small backward neck snap');
    assert.equal(rig.root.position.y,baseline.root.position.y,'A headshot stagger must not crouch');
    assert.equal(rig.spine.rotation.x,baseline.spine.rotation.x,'Headshot feedback must not fold the torso');
  }
  if(part==='torso')assert(Math.abs(rig.spine.rotation.x-baseline.spine.rotation.x)>.08,'Torso hit recoils the spine');
  if(part==='arm'){
    assert(Math.abs(rig.arms[1].pivot.rotation.x-baseline.arms[1].pivot.rotation.x)>.12);
    assert.equal(rig.arms[0].pivot.rotation.x,baseline.arms[0].pivot.rotation.x);
  }
  if(part==='leg'){
    const joints=flags.dog?'arms':'legs';assert(Math.abs(rig[joints][1].pivot.rotation.x-baseline[joints][1].pivot.rotation.x)>.07);
    assert.equal(rig[joints][0].pivot.rotation.x,baseline[joints][0].pivot.rotation.x);
  }
  rig.arms[1].pivot.traverse(o=>{if(o.isMesh){assert.equal(o.userData.side,1);assert.equal(o.userData.limb,'front');}});
  for(let i=0;i<30;i++)animate(rig,.02,8,0);assert.equal(rig.flinch,0,'The visual reaction recovers');
  for(const r of [rig,baseline]){for(const g of r.resources.geometries)g.dispose();for(const m of r.resources.materials)m.dispose();}
}
const death=(part)=>{
  const rig=createZombieRig({rng:()=>.31});rig.speed=2;rig.attack=1;animateZombie(rig,.016,8,0);
  beginZombieDeath(rig,{part,direction:new T.Vector3(0,0,-1),source:'bushmaster',force:1.65},()=>.9);return rig.ragdoll;
};
const head=death('head'),body=death('torso'),velocity=r=>r.points.skull.p.clone().sub(r.points.skull.prev).multiplyScalar(120);
assert(velocity(head).dot(new T.Vector3(0,0,-1))>velocity(body).dot(new T.Vector3(0,0,-1))+2,'Headshot deaths have a stronger skull reaction');
console.log('PASS: different head/torso/arm/leg reactions, correct side and front/rear dog joints, all five variants, recovery and stronger headshot death impulses.');

const kicks=new Set(),recoveries=new Set();
for(const [key,profile] of Object.entries(COMBAT)){
  const recoil=createWeaponRecoil();recoil.fire(key);kicks.add(recoil.pitch);recoveries.add(profile.recovery);const peak=recoil.pitch;
  recoil.update(.08);assert(recoil.pitch>0&&recoil.pitch<peak);
  const reduced=createWeaponRecoil();reduced.fire(key,true);assert(reduced.pitch<peak,'Aiming reduces kick');
  const slow=createWeaponRecoil(),fast=createWeaponRecoil();slow.fire(key);fast.fire(key);
  for(let i=0;i<15;i++)slow.update(1/30);for(let i=0;i<72;i++)fast.update(1/144);
  assert(Math.abs(slow.pitch-fast.pitch)<1e-8,'Recovery is independent of frame rate');
  for(let i=0;i<100;i++)recoil.fire(key);assert(recoil.pitch<=.14&&Math.abs(recoil.yaw)<=.035&&recoil.back<=.13);
  recoil.update(3);assert.equal(recoil.pitch,0);assert.equal(recoil.back,0);recoil.fire(key);recoil.reset();assert.equal(recoil.pitch,0);
}
assert.equal(kicks.size,6);assert.equal(recoveries.size,6);
assert.equal(damageBearing({x:0,z:0},{x:0,z:-1},0),0);
assert(Math.abs(damageBearing({x:0,z:0},{x:1,z:0},0)-Math.PI/2)<1e-8);
assert(Math.abs(damageBearing({x:0,z:0},{x:-1,z:0},Math.PI/2))<1e-8);
console.log('PASS: six weapon kick/recovery profiles, controlled stacking, reduced ADS kick, 30/144 FPS recovery equivalence and camera-relative damage bearings.');

export function verifyCombatFeedback(qa,frames,listeners,canvas,elements,document){
  const originalStorage=globalThis.localStorage,stored=new Map();
  globalThis.localStorage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)};
  try{
    const makeHud=()=>{const hit=document.createElement('div'),headshot=document.createElement('div'),directions=document.createElement('div'),toggle=document.createElement('button');toggle.innerHTML='<span data-headshot-setting></span>';return {hit,headshot,directions,toggle,hud:createCombatHud({hit,headshot,directions,toggle})};};
    const h=makeHud();assert(h.hud.hit(true),'Head hits cue audio before the target dies');assert(!h.hud.hit(true),'Pellets cannot multiply the audio cue');
    h.hud.hit(true,1);h.hud.hit(false,1);assert.equal(h.hit.getAttribute('data-headshot'),'true','A shell keeps its headshot hit mark');h.hud.hit(false,2);assert.equal(h.hit.getAttribute('data-headshot'),'false','The next body shot has an ordinary hit mark');
    h.hud.update(.06,{x:0,z:0},0);assert(h.hud.hit(true));h.toggle.onclick();assert.equal(h.headshot.style.opacity,'0');
    const restored=makeHud();assert.equal(restored.toggle.getAttribute('aria-checked'),'false','The optional label setting persists');restored.hud.reset();assert.equal(restored.toggle.getAttribute('aria-checked'),'false');
    for(let i=0;i<30;i++)h.hud.hurt({x:0,z:0},{x:Math.sin(i)*3,z:-Math.cos(i)*3},0);
    assert.equal(h.directions.children.length,4,'Damage feedback reuses four DOM nodes under a crowd');
    h.hud.update(.1,{x:0,z:0},Math.PI/2);assert(h.hud.markers.some(m=>m.opacity===1));h.hud.update(1,{x:0,z:0},0);assert(h.hud.markers.every(m=>m.node.style.opacity==='0'));
  }finally{globalThis.localStorage=originalStorage;}

  function start(){qa.start();qa.startWave();qa.holdSpawns();qa.setPlayer(0,23);qa.setHealth(10000);}
  start();let enemy=qa.makeZombie(0,17);enemy.hp=10000;const score=qa.get().totalScore;
  qa.damageEnemy(enemy,1,true,{source:'glock',direction:new T.Vector3(0,0,-1)});
  assert(!enemy.dead&&enemy.staggerLeft>0);assert.equal(qa.get().totalScore,score+10);assert.equal(elements.get('hit').getAttribute('data-headshot'),'true');assert(Number(elements.get('headshotIndicator').style.opacity)>0);
  const position=enemy.walkPos.clone();frames(10);assert(Math.hypot(enemy.walkPos.x-position.x,enemy.walkPos.z-position.z)<1e-8,'Stagger interrupts movement');
  listeners.keydown({code:'Escape'});const frozen=enemy.staggerLeft;frames(60);assert.equal(enemy.staggerLeft,frozen,'Pause freezes gameplay stagger timers');
  elements.get('resume').onclick();frames(45);assert.equal(enemy.staggerLeft,0);assert(enemy.walkPos.z>position.z,'Movement resumes after stagger');
  assert.equal(elements.get('headshotIndicator').style.opacity,'0');

  for(const args of [[false,false,false,0,false],[true,false,false,0,false],[false,false,false,0,true],[false,true,false,0,false],[false,true,true,0,false]]){
    start();enemy=qa.makeZombie(0,22.1,...args);enemy.hp=10000;enemy.attack=0;frames(10);const baseSpeed=enemy.speed;
    let count=0;while(!enemy.staggerLeft&&count++<8)qa.damageEnemy(enemy,1,true,{source:'bushmaster',direction:new T.Vector3(0,0,-1)});
    assert(enemy.staggerLeft>0);assert.equal(enemy.attackTime,-1);frames(6);assert.equal(qa.get().health,10000,'An interrupted wind-up does not hit the player');assert.equal(enemy.speed,baseSpeed);
    for(let i=0;i<180&&qa.get().health===10000;i++)frames(1);
    assert(qa.get().health<10000,'The enemy can attack again after its interrupt');
    assert(qa.get().combatHud.markers.some(m=>m.left>0),'Real melee and bites identify their source');
  }

  for(const weapon of Object.keys(COMBAT)){
    start();qa.get().inventory[weapon].owned=true;qa.selectWeapon(weapon);qa.setAim(0,0);
    canvas.events.mousedown({button:2});frames(140);const neutral=qa.get().lookPitch;qa.shoot();frames(1);
    const state=qa.get();assert.equal(state.lookPitch,neutral,'Recoil does not overwrite mouse aim');assert(state.weaponRecoil.pitch>0);
    assert(Math.abs(state.camera.rotation.x-neutral-state.weaponRecoil.pitch)<1e-8);
    const optic=state.gunGroups[weapon].userData.optic;
    if(optic){
      const center=optic.dot.getWorldPosition(new T.Vector3()).project(state.viewCamera);assert(Math.hypot(center.x,center.y)<.004,'The reticle stays aligned during recoil');
      const ray=new T.Raycaster(state.viewCamera.position,new T.Vector3(0,0,-1).applyQuaternion(state.viewCamera.quaternion));
      assert.equal(ray.intersectObject(state.gunGroups[weapon],true).filter(h=>h.object.visible&&!h.object.material.transparent&&!h.object.userData.reticle).length,0,'Recoil preserves the open scope bore');
    }
    listeners.mouseup({button:2});frames(190);assert.equal(qa.get().weaponRecoil.pitch,0);
  }

  start();qa.hurtPlayer(12,{x:3,z:23});frames(1);let marker=qa.get().combatHud.markers.find(m=>m.left>0);assert(marker);assert(Math.abs(marker.angle-Math.PI/2)<1e-8);
  qa.setAim(Math.PI/2,0);frames(1);assert(Math.abs(Math.abs(marker.angle)-Math.PI)<1e-8,'An indicator rotates when the player turns');
  frames(55);assert.equal(marker.node.style.opacity,'0');
  start();const station=qa.get().interactables.find(s=>s.type==='armor'&&s.y>2);qa.setPoints(2500);qa.setPlayer(station.x+Math.sin(station.rotation||0)*1.5,station.z+Math.cos(station.rotation||0)*1.5,station.y);qa.interact();assert(qa.get().armor>0);
  qa.hurtPlayer(12,{x:qa.get().player.x+3,z:qa.get().player.z});frames(1);marker=qa.get().combatHud.markers.find(m=>m.left>0);assert.equal(marker.node.getAttribute('data-shielded'),'true');assert.equal(qa.get().health,10000);
  listeners.keydown({code:'Escape'});elements.get('headshotToggle').onclick();assert.equal(qa.get().mode,'paused');elements.get('headshotToggle').onclick();
  qa.start();assert.equal(qa.get().weaponRecoil.pitch,0);assert(qa.get().combatHud.markers.every(m=>m.left===0));assert.equal(qa.get().hitTime,0);
  console.log('PASS: live nonlethal headshot feedback, all five interrupted attacks and resumption, paused stagger, recoil-aligned open optics, health/shield source arrows, pooled UI, persisted option and clean run reset.');
}
