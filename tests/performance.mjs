import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {isBlocked} from '../public/game/core.mjs';
import {UPPER_Y,STAIR} from '../public/game/vertical.mjs';
export function verifyPerformance(qa,frames,listeners){
  qa.start();const s=qa.get();
  assert.deepEqual(s.renderer.compileCalls,[1,2],'Both camera lighting configurations prepare before entry');
  assert(s.enemyAssets.templates.every(t=>!t.group.parent),'Prepared model templates stay out of gameplay');
  const signature=()=>{const ids=[];s.scene.traverseVisible(o=>{if(o.isLight)ids.push(o.uuid+':'+o.layers.mask+':'+o.type);});return ids.sort();};
  const lights=signature();
  for(let i=0;i<12;i++)qa.dropPickup(-8+i,19,i%2?'ammo':'double');
  qa.explode(new T.Vector3(10,1,20));frames(1);
  assert.deepEqual(signature(),lights,'Pickups and explosions must not change shader light counts');
  assert(s.combatLights.lights.some(l=>l.intensity>0),'The fixed pool must still illuminate combat effects');
  listeners.keydown({code:'KeyF'});assert.equal(s.flashlight.intensity,0);assert(s.flashlight.visible);
  assert.deepEqual(signature(),lights,'Turning the flashlight off must not rebuild lighting shaders');
  listeners.keydown({code:'KeyF'});assert.equal(s.flashlight.intensity,24);
  for(const p of s.pickups)p.life=.01;frames(35);
  assert.deepEqual(signature(),lights,'Expiring effects must preserve the shader signature');
  qa.start();assert(s.combatLights.lights.every(l=>l.intensity===0));assert.deepEqual(signature(),lights);

  const cacheGeo=new Set(),cacheMat=new Set();for(const r of s.enemyAssets.templates)r.group.traverse(o=>{if(o.isMesh){cacheGeo.add(o.geometry);cacheMat.add(o.material);}});
  const owners=new Set(),styles=new Set();let a,b;
  for(let i=0;i<64;i++){
    const e=qa.makeZombie(i%8*2-8,18+Math.floor(i/8),i%7===0,i%5===0);styles.add(e.style);
    e.group.traverse(o=>{assert(!owners.has(o),'Live skeletons must never share nodes');owners.add(o);if(o.isMesh){assert(cacheGeo.has(o.geometry)&&cacheMat.has(o.material),'Spawning must allocate no new geometry or material');assert.equal(o.userData.enemy,e);}});
    if(i===0)a=e;if(i===1)b=e;
  }
  assert(styles.has('zombie dog')&&styles.has('estate brute')&&styles.size>=5);
  const before=b.root.position.clone(),bParent=b.root.parent;qa.damageEnemy(a,10000);
  assert.equal(b.root.parent,bParent);assert(b.root.position.equals(before),'One death cannot disturb another enemy rig');
  qa.start();assert.equal(s.zombies.length,0);assert(s.enemyAssets.templates.every(r=>r.root.parent),'Death/reset cannot dismantle the cached rig');

  const linear=[...s.colliders];let seed=3128;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<6000;i++){const x=random()*108-54,z=random()*126-96,r=.04+random()*.5,y=i%3?0:UPPER_Y;assert.equal(isBlocked(x,z,r,s.colliders,undefined,y),isBlocked(x,z,r,linear,undefined,y),'Fast collision broad phase must match exact collision checks');}
  s.nav.rebuild(0,0,0);const next=s.nav.direction(STAIR.x,STAIR.topZ-.48,UPPER_Y);assert(next.y===0&&next.z>STAIR.topZ,'Descending AI must cross the landing-to-stair grid seam');
  console.log(`PASS: stable combat/flashlight light signature, shader warmup lifecycle, 64 independent enemies sharing ${cacheGeo.size} cached geometries, collision equivalence and stair seam.`);
}
