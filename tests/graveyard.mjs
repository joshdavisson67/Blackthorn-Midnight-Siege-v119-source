import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {GRAVEYARD,MAUSOLEUM,GRAVEYARD_SPAWNS} from '../public/game/graveyard-layout.mjs';
import {isBlocked} from '../public/game/core.mjs';
import {moveActor} from '../public/game/vertical.mjs';
export function verifyGraveyard(qa,frames,listeners,elements){
  qa.start();qa.setHealth(10000);qa.startWave();let s=qa.get();s.nav.rebuild(0,20);
  assert(s.graveyard.graves.length>=12,'Cemetery needs visible grave rows');
  for(const [x,z] of GRAVEYARD_SPAWNS){assert(!isBlocked(x,z,.4,s.colliders),`Graveyard spawn ${x},${z} is clear`);assert(s.nav.direction(x,z,0).reachable,'New cemetery spawns must connect to the mansion');}
  // Walk the entrance with actual controls, then trace the complete route back.
  qa.setPlayer(47,6);qa.setAim(0,0);qa.setKeys(['KeyD']);frames(300);qa.setKeys([]);assert(qa.get().player.x>63,'D must walk through east gate into the graveyard');assert.equal(qa.get().player.y,0);
  s=qa.get();s.nav.rebuild(47,6);const p=new T.Vector3(76,0,14);let steps=0;
  while(p.distanceTo(new T.Vector3(47,0,6))>.8&&steps++<3000){const next=s.nav.direction(p.x,p.z,0);assert(next?.reachable);const direction=new T.Vector2(next.x-p.x,next.z-p.z).normalize().multiplyScalar(.07);moveActor(p,direction.x,direction.y,s.colliders,{allowFall:false,radius:.34});}
  assert(steps<3000,`Cemetery must have a physically walkable exit: ${p.toArray()}`);
  for(const [x,z] of [[81,6],[66,19],[66,-25],[60,-30],[60,25]])assert(isBlocked(x,z,.32,s.colliders),'New graveyard boundaries must contain actors');
  qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();
  console.log('PASS: expanded cemetery graves, real keyboard entrance, walkable exit, local spawn paths, boundaries and ground map.');

  qa.start();qa.setHealth(10000);for(let i=0;i<19;i++)qa.startWave();assert(!qa.get().graveyard.open);qa.setPlayer(70,-7.5);qa.setAim(0,0);qa.interact();assert(elements.get('toast').textContent.includes('Clear wave 20'));qa.setKeys(['KeyW']);frames(100);qa.setKeys([]);assert(qa.get().player.z>MAUSOLEUM.frontZ,'Sealed doors prevent entry');
  qa.startWave();assert.equal(qa.get().wave,20);assert(!qa.get().graveyard.open,'Reaching wave 20 must not unlock before it is cleared');qa.get().nav.rebuild(70,-7,0);assert(!qa.get().nav.direction(70,-12,0).reachable,'Sealed tomb remains disconnected from enemy navigation');
  let ticks=0;while(qa.get().waveDelay===0&&ticks++<3200){for(const e of qa.get().zombies)if(!e.dead)qa.damageEnemy(e,100000);frames(1);}
  assert(ticks<3200,'Wave 20 must be completable');assert.equal(qa.get().wave,20);assert(qa.get().waveDelay>0);assert(qa.get().graveyard.open,'Clearing wave 20 opens the mausoleum during intermission');assert(qa.get().graveyard.gate.disabled);assert(elements.get('banner').textContent.includes('EAST MAUSOLEUM UNSEALED'));
  frames(110);assert.equal(qa.get().graveyard.progress,1);assert(qa.get().graveyard.doors.every(d=>Math.abs(d.hinge.rotation.y)>1.7),'Both crypt leaves animate open');qa.get().nav.rebuild(70,-7,0);assert(qa.get().nav.direction(70,-12,0).reachable,'Unlock updates tomb navigation immediately');
  qa.setPlayer(70,-7);qa.setKeys(['KeyW']);frames(110);qa.setKeys([]);assert(qa.get().player.z<-11,'Player can enter the unlocked chamber');assert(qa.get().player.z>-14.0,'Sarcophagus blocks walking through the tomb');assert(elements.get('location').textContent.includes('BLACKTHORN MAUSOLEUM'));assert(!qa.get().scene.children.find(o=>o.isPoints)?.visible,'Rain stops inside mausoleum');
  listeners.keydown({code:'Space',preventDefault(){}});let peak=0;for(let i=0;i<70;i++){frames(1);peak=Math.max(peak,qa.get().player.y);}assert(peak+1.8<=MAUSOLEUM.ceiling+.001,'Mausoleum jumping respects its solid ceiling');assert.equal(qa.get().player.y,0);
  qa.setKeys(['KeyS']);frames(110);qa.setKeys([]);assert(qa.get().player.z>-9,'Player can leave the chamber');
  console.log('PASS: locked through wave 20, automatic unlock on actual wave completion, animated twin doors, refreshed navigation, tomb entry/exit and ceiling.');

  qa.start();qa.setHealth(10000);for(let i=0;i<21;i++)qa.startWave();qa.setPlayer(70,-12);qa.get().nav.rebuild(70,-12,0);const e=qa.makeZombie(70,-6);e.speed=2.8;
  for(let i=0;i<250&&e.walkPos.z>-10.5;i++)frames(1);assert(e.walkPos.z<-10.5,'Zombie can chase through the opened mausoleum doorway');
  qa.setPlayer(70,-5);qa.get().nav.rebuild(70,-5,0);for(let i=0;i<250&&e.walkPos.z<-8.5;i++)frames(1);assert(e.walkPos.z>-8.5,'Zombie can leave the mausoleum');
  // Walls block bullet and blast rays; the opened doorway permits them.
  qa.get().scene.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(65,1.5,-12),new T.Vector3(1,0,0),.01,8);assert(ray.intersectObjects(qa.get().world.children,true).some(h=>h.point.x>65.7&&h.point.x<66.3),'Mausoleum side wall is real geometry');
  qa.start();assert(!qa.get().graveyard.open);assert(!qa.get().graveyard.gate.disabled);assert.equal(qa.get().graveyard.progress,0);assert(qa.get().graveyard.doors.every(d=>d.hinge.rotation.y===0));
  console.log('PASS: two-way zombie tomb pursuit, solid wall geometry and fresh-run mausoleum reset.');
}
