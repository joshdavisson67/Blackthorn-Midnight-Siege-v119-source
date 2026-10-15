import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createZombieDogRig,animateZombieDog,DOG_SPEED_MULTIPLIER} from '../public/game/zombie-dog.mjs';
import {beginZombieDeath,updateZombieDeath} from '../public/game/zombies.mjs';
import {waveConfig} from '../public/game/core.mjs';

const rig=createZombieDogRig({rng:()=>.4});rig.speed=1.5;rig.attack=1;
rig.group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(rig.group);
assert(bounds.max.y<1.15&&bounds.max.z-bounds.min.z>1.2,'A dog must have a low, long canine silhouette');assert.equal(rig.legs.length+rig.arms.length,4);
const phase=rig.phase;for(let i=0;i<30;i++)animateZombieDog(rig,1/60,5,0);assert.equal(rig.phase,phase,'Idle dogs do not trot in place');
animateZombieDog(rig,1/60,5,.03);assert(rig.legs[0].pivot.rotation.x*rig.arms[0].pivot.rotation.x<=0,'Diagonal trot pairs alternate front and hind legs');
rig.attack=0;let contacts=0;for(let i=0;i<48;i++){const contact=animateZombieDog(rig,1/60,1.1,0);if(i<17)assert(!contact,'Bite must telegraph');contacts+=+contact;}assert.equal(contacts,1);
const original=rig.pieces.map(p=>p.node.getWorldPosition(new T.Vector3()));beginZombieDeath(rig,{direction:new T.Vector3(1,0,-1),source:'rifle'},()=>.4);
for(let i=0;i<original.length;i++)assert(rig.ragdoll.pieces[i].node.position.distanceTo(original[i])<1e-6,'Dog death preserves its pose');
for(let i=0;i<300;i++){updateZombieDeath(rig,1/60);for(const p of Object.values(rig.ragdoll.points)){assert(p.p.toArray().every(Number.isFinite));assert(p.p.y>=.11+p.radius-1e-6);}}
assert(rig.ragdoll.asleep);console.log('PASS: canine silhouette, quadruped trot, idle/bite timing, continuous ragdoll pose and stable settling.');

export function verifyDogs(qa,frames){
  qa.start();const dog=qa.makeZombie(0,14,false,true),walker=qa.makeZombie(4,14);assert(dog.dog&&!dog.brute);assert.equal(dog.speed,waveConfig(qa.get().wave).speed*DOG_SPEED_MULTIPLIER);assert(dog.speed>walker.speed);
  let meshes=0,triangles=0;dog.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.equal(o.userData.enemy,dog);assert(o.geometry.hasAttribute('color'));}});assert(meshes<45&&triangles<40000);
  for(const limb of [...dog.legs.map(l=>l.pivot),...dog.arms.map(a=>a.pivot)])limb.traverse(o=>{if(o.isMesh)assert.equal(o.userData.part,'leg');});
  dog.group.updateMatrixWorld(true);const origin=new T.Vector3(0,dog.head.getWorldPosition(new T.Vector3()).y,17),ray=new T.Raycaster(origin,new T.Vector3(0,0,-1));const head=ray.intersectObject(dog.group,true)[0];assert(head?.object.userData.head,'The dog head is a real headshot target');
  qa.startWave();for(let i=0;i<5;i++)qa.spawnEnemy();assert(qa.get().zombies.some(e=>e.dog&&e!==dog),'A dog must appear in the regular wave spawn sequence');
  const kills=qa.get().kills;qa.damageEnemy(dog,10000,true);assert.equal(qa.get().kills,kills+1);assert(dog.ragdoll);qa.start();
  qa.setPlayer(0,20);const bite=qa.makeZombie(0,19.3,false,true);bite.attack=0;const hp=qa.get().health;frames(2);assert.equal(qa.get().health,hp);frames(25);assert(qa.get().health<hp,'A dog bite damages the player only at contact');
  qa.start();qa.setPlayer(0,-10.4,4.3);qa.setHealth(10000);const upstairs=qa.makeZombie(0,-10.4,false,true);qa.get().nav.rebuild(0,-10.4,4.3);for(let i=0;i<1800&&upstairs.floorY<4.28;i++)frames(1);assert(upstairs.floorY>4.28,'Dogs can chase upstairs');
  qa.setPlayer(0,0);qa.get().nav.rebuild(0,0);for(let i=0;i<1800&&upstairs.floorY>.02;i++)frames(1);assert(upstairs.floorY<.02,'Dogs can chase downstairs');
  qa.start();console.log(`PASS: dogs spawn in waves, exceed walker speed, bite, award kills, support head/leg hits, climb/descend, and use ${meshes} mesh batches / ${triangles} triangles.`);
}
