import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createZombieRig,animateZombie,reactToHit,beginZombieDeath,updateZombieDeath} from '../public/game/zombies.mjs';

let seed=4312;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const styles=new Set(),deaths=new Set(),endpoints=[];
function make(brute=false){const e=createZombieRig({rng,brute});e.speed=1.6;e.attack=1;return e;}
for(let i=0;i<24;i++){
  const e=make(i===23);styles.add(e.style);e.group.position.set(7,0,-12);e.group.rotation.y=.8;
  for(let t=0;t<60;t++)animateZombie(e,1/60,5,.021);
  const before=e.pieces.map(p=>({pos:p.node.getWorldPosition(new T.Vector3()),quat:p.node.getWorldQuaternion(new T.Quaternion())}));
  const impact={direction:new T.Vector3(Math.sin(i),0,Math.cos(i)),point:new T.Vector3(7.16,1.35,-12),force:i===22?3:1,source:i===22?'grenade':'rifle',part:i===21?'leg':i%3?'torso':'head'};
  beginZombieDeath(e,impact,rng);deaths.add(e.ragdoll.type);
  for(let j=0;j<before.length;j++){
    assert(e.ragdoll.pieces[j].node.position.distanceTo(before[j].pos)<1e-6,'Death must preserve the animated pose without a pop');
    assert(Math.abs(e.ragdoll.pieces[j].node.quaternion.dot(before[j].quat))>1-1e-6);
  }
  let expired=false;
  for(let t=0;t<300;t++){
    expired=updateZombieDeath(e,t%2?1/120:1/40);
    for(const p of Object.values(e.ragdoll.points)){
      assert(p.p.toArray().every(Number.isFinite),'Ragdoll coordinates stay finite');
      assert(p.p.y>=p.radius+.11-1e-7,'Collision particles must stay above the floor');
    }
  }
  assert(!expired,'A corpse remains visible after its fall');assert(e.ragdoll.asleep,'Ragdoll must come to rest');
  assert(Math.max(...Object.values(e.ragdoll.points).map(p=>p.p.y))<.8,'A corpse must fall completely to the floor');
  for(const c of e.ragdoll.constraints){const len=e.ragdoll.points[c.a].p.distanceTo(e.ragdoll.points[c.b].p);assert(len<=c.length+.035,'Bones must not stretch apart');}
  endpoints.push(e.ragdoll.points.skull.p.clone().sub(e.ragdoll.points.pelvis.p).normalize());
  while(!expired)expired=updateZombieDeath(e,.05);
  assert(e.death<=10.06,'Corpse lifetime is bounded');
}
assert.equal(styles.size,5,'Four estate variants plus the brute');assert.equal(deaths.size,7,'Recoil, stumble, two shoulder falls, twist, knee buckle and blast');
assert(endpoints.some(a=>endpoints.some(b=>a.dot(b)<-.7)),'Deaths must produce visibly different final orientations');
console.log('PASS: five zombie designs and seven fall profiles; pose continuity, variable-step physics, floor contacts, finite bones, settling and lifetime.');

// The same deterministic launch must stay close at different render rates.
function simulate(dt){const e=make();e.group.rotation.y=.6;beginZombieDeath(e,{direction:new T.Vector3(0,0,-1),force:2},()=>.1);for(let t=0;t<3-1e-7;t+=dt)updateZombieDeath(e,dt);return e.ragdoll.points.pelvis.p;}
const saved=seed,slow=simulate(1/30);seed=saved;const fast=simulate(1/120);assert(slow.distanceTo(fast)<.025);
// A narrow solid wall must stop a corpse launched toward it.
const wall=make();wall.group.position.z=.85;beginZombieDeath(wall,{direction:new T.Vector3(0,0,-1),force:3,source:'grenade'},()=>.4);
const blocked=(x,z,r)=>Math.abs(z)<.1+r;
for(let t=0;t<360;t++){updateZombieDeath(wall,1/120,blocked);for(const p of Object.values(wall.ragdoll.points))assert(p.p.z>=.1+p.radius-1e-6,'Corpse must not tunnel through a wall');}
console.log('PASS: fixed-step ragdolls are stable across frame rates and collide with walls.');

const idle=make(),phase=idle.phase;for(let i=0;i<120;i++)animateZombie(idle,1/60,8,0);assert.equal(idle.phase,phase,'Blocked/idle enemies cannot walk in place');
const walk=make();animateZombie(walk,.016,5,.04);const stride=walk.legs[0].pivot.rotation.x;animateZombie(walk,.016,5,.18);assert.notEqual(walk.legs[0].pivot.rotation.x,stride);
reactToHit(walk,{part:'leg',direction:new T.Vector3(1,0,0)});assert(walk.legHit>0&&walk.flinch>0);
const attack=make();attack.attack=0;let contacts=0;for(let i=0;i<60;i++){const contact=animateZombie(attack,1/60,1.1,0);if(i<19)assert(!contact,'Attack cannot hit during wind-up');contacts+=+contact;}assert.equal(contacts,1,'One strike causes exactly one contact');
console.log('PASS: distance-based strides, idle poses, leg-shot reactions and telegraphed single-contact attacks.');

export function verifyZombieIntegration(qa,frames){
  qa.start();const e=qa.makeZombie(2,19);let draws=0,triangles=0;
  e.group.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(o.geometry.hasAttribute('color'),'Batching must retain the organic surface colors');assert.equal(o.userData.enemy,e);assert(['torso','leg','arm','head'].includes(o.userData.part));});
  assert(draws<85&&triangles<40000,`Enemy mesh budget exceeded: ${draws} draws, ${triangles} triangles`);
  let headMeshes=0;e.head.traverse(o=>{if(o.isMesh){headMeshes++;assert(o.userData.head);}});assert(headMeshes>0);
  const geometries=new Set(),materials=new Set();e.group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
  let disposedGeometry=0,disposedMaterial=0;for(const g of geometries)g.addEventListener('dispose',()=>disposedGeometry++);for(const m of materials)m.addEventListener('dispose',()=>disposedMaterial++);
  qa.damageEnemy(e,10000);const kills=qa.get().kills;qa.damageEnemy(e,10000);assert.equal(qa.get().kills,kills,'A corpse cannot award a second kill');
  for(let i=0;i<18;i++)qa.damageEnemy(qa.makeZombie(8+i*.1,22),10000);
  frames(1);assert(qa.get().zombies.filter(e=>e.dead).length<=14,'Only fourteen corpses may remain after cleanup');
  qa.start();assert.equal(disposedGeometry,0,'Removing one enemy must retain shared cached geometry');assert.equal(disposedMaterial,0,'Removing one enemy must retain shared cached materials');assert(e.sharedAssets);
  console.log(`PASS: merged zombie colors/hit regions, ${draws} mesh batches / ${triangles} triangles, corpse budget, no duplicate rewards, and resource cleanup.`);
}
