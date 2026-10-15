import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createZombieDogRig,animateZombieDog,RARE_DOG_SPEED_MULTIPLIER} from '../public/game/zombie-dog.mjs';
import {enemyKind,waveConfig} from '../public/game/core.mjs';
import {beginZombieDeath,updateZombieDeath} from '../public/game/zombies.mjs';

export function verifyAshfang(qa,frames){
  for(let wave=1;wave<=5;wave++)for(let i=0;i<300;i++)assert.notEqual(enemyKind(wave,i),'ashfang','Rare hounds cannot spawn through wave 5');
  for(let wave=6;wave<=40;wave++){const kinds=Array.from({length:waveConfig(wave).count},(_,i)=>enemyKind(wave,i));const rare=kinds.filter(k=>k==='ashfang').length,normal=kinds.filter(k=>k==='dog').length;assert(rare>=1&&rare<normal,'Ashfangs must be rarer than ordinary dogs');for(let i=6;i<kinds.length;i+=7)assert.equal(kinds[i],'brute','Brute spawn priority remains intact');}
  const normal=createZombieDogRig({rng:()=>.4}),model=createZombieDogRig({rng:()=>.4,rare:true});model.speed=2.4;model.attack=1;
  const names=[];model.group.traverse(o=>names.push(o.name));for(const name of ['Ashfang skull mask','Ashfang swept horn','Ashfang dorsal ridge','Ashfang barbed tail','Ashfang red eye'])assert(names.includes(name),`Distinctive geometry missing: ${name}`);
  const baseBounds=new T.Box3().setFromObject(normal.group),rareBounds=new T.Box3().setFromObject(model.group);assert(rareBounds.max.y>baseBounds.max.y+.08,'The rare dog has a distinct, taller silhouette');
  model.phase=.4;animateZombieDog(model,1/60,5,.03);assert(model.arms[0].pivot.rotation.x*model.arms[1].pivot.rotation.x>0,'Ashfang front legs bound together rather than using the normal diagonal trot');
  model.attack=0;let contacts=0;for(let i=0;i<45;i++){const contact=animateZombieDog(model,1/60,1.1,0);if(i<17)assert(!contact);contacts+=+contact;}assert.equal(contacts,1,'Rare bites retain one telegraphed contact');
  beginZombieDeath(model,{direction:new T.Vector3(1,0,-1),force:2,source:'grenade'},()=>.4);for(let i=0;i<360;i++){updateZombieDeath(model,1/60);for(const p of model.ragdoll.pointList){assert(p.p.toArray().every(Number.isFinite));assert(p.p.y>=.11+p.radius-1e-6);}}assert(model.ragdoll.asleep);

  qa.start();for(let wave=1;wave<=6;wave++)qa.startWave();for(let i=0;i<waveConfig(6).count;i++)qa.spawnEnemy();const live=qa.get().zombies,rare=live.filter(e=>e.rareDog);assert.equal(rare.length,1,'Wave 6 must spawn its first rare hound');assert(live.filter(e=>e.dog&&!e.rareDog).length>rare.length);
  const hound=rare[0];assert(hound.dog&&!hound.brute&&hound.style==='ashfang hound');assert.equal(hound.speed,waveConfig(6).speed*RARE_DOG_SPEED_MULTIPLIER);assert.equal(RARE_DOG_SPEED_MULTIPLIER,1.5);
  const cached=qa.get().enemyAssets.templates.find(r=>r.rareDog),cacheGeo=new Set();cached.group.traverse(o=>{if(o.isMesh)cacheGeo.add(o.geometry);});let meshes=0,triangles=0;
  hound.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(cacheGeo.has(o.geometry),'Rare spawns reuse their warmed mesh assets');assert.equal(o.userData.enemy,hound);}});assert(meshes<=48&&triangles<40000,'Rare hounds keep a bounded model budget');
  hound.group.updateMatrixWorld(true);const headY=hound.head.getWorldPosition(new T.Vector3()).y,ray=new T.Raycaster(new T.Vector3(hound.group.position.x,headY,hound.group.position.z+3),new T.Vector3(0,0,-1));assert(ray.intersectObject(hound.group,true)[0]?.object.userData.head,'The skull mask remains a headshot target');
  const kills=qa.get().kills;qa.damageEnemy(hound,10000,true);assert.equal(qa.get().kills,kills+1);assert(hound.ragdoll);
  qa.start();qa.setPlayer(0,-10.4,4.3);qa.setHealth(10000);const chase=qa.makeZombie(0,-10.4,false,true,true);qa.get().nav.rebuild(0,-10.4,4.3);for(let i=0;i<1800&&chase.floorY<4.28;i++)frames(1);assert(chase.floorY>4.28,'Rare hounds can chase upstairs');qa.setPlayer(0,0);qa.get().nav.rebuild(0,0);for(let i=0;i<1800&&chase.floorY>.02;i++)frames(1);assert(chase.floorY<.02,'Rare hounds can descend');
  // Spawn stats must follow the same wave curve, including its late-wave cap.
  qa.start();let previousBase=0,previousDog=0,previousRare=0;
  for(let wave=1;wave<=40;wave++){
    qa.startWave();const base=waveConfig(wave),dog=qa.makeZombie(-8,20,false,true),ashfang=qa.makeZombie(8,20,false,true,true);
    assert.equal(dog.speed,base.speed*1.25);assert.equal(ashfang.speed,base.speed*1.5);
    assert.equal(ashfang.maxHp,dog.maxHp*2,'Ashfang durability is twice standard dog health at every wave');
    assert.equal(ashfang.hp,ashfang.maxHp);assert.equal(dog.hp,dog.maxHp);
    if(wave>1){assert(Math.abs((dog.speed-previousDog)-(base.speed-previousBase)*1.25)<1e-12);assert(Math.abs((ashfang.speed-previousRare)-(base.speed-previousBase)*1.5)<1e-12);if(base.speed>previousBase){assert(dog.speed>previousDog);assert(ashfang.speed>previousRare);}}
    previousBase=base.speed;previousDog=dog.speed;previousRare=ashfang.speed;
    if(wave===6){const lethalToDog=dog.hp;qa.damageEnemy(dog,lethalToDog);qa.damageEnemy(ashfang,lethalToDog);assert(dog.dead);assert(!ashfang.dead);assert.equal(ashfang.hp,ashfang.maxHp/2,'The same lethal dog hit leaves an Ashfang at half health');qa.damageEnemy(ashfang,lethalToDog);assert(ashfang.dead);}
  }
  qa.start();console.log('PASS: both dog speed curves track zombie scaling through wave 40; Ashfang health is exactly 2× a standard dog, including real damage/death checks.');
  qa.start();console.log(`PASS: Ashfang wave-6 gate, rarity/brute priority, 1.5× speed, distinct model/bounding gait, bite timing, cached assets, headshots, ragdoll settling and stairs (${meshes} meshes / ${triangles} triangles).`);
}
