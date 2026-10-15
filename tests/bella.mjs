import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {BELLA} from '../public/game/bella.mjs';
import {UPPER_Y,STAIR,buildVerticalNavigation} from '../public/game/vertical.mjs';
import {indexColliders,isBlocked} from '../public/game/core.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';

export function verifyBella(qa,frames,listeners,elements,document){
  const prepare=()=>{qa.start();qa.startWave();qa.holdSpawns();const s=qa.get(),b=s.bella;qa.setPlayer(b.station.x,b.station.z+1.5,UPPER_Y);qa.setPoints(BELLA.price);qa.interact();return {s,b};};
  const advance=(s,b,seconds,enemies=s.zombies,onBite=(e,damage,direction)=>qa.damageEnemy(e,damage,false,{source:'Bella',part:e.dog?'head':'leg',direction:direction.clone(),force:.45}))=>{
    for(let i=0;i<Math.ceil(seconds/.05);i++)b.update(.05,{player:s.player,yaw:0,enemies,onBite});
  };
  qa.start();let s=qa.get(),b=s.bella;
  assert.equal(b.station.type,'kennel');assert.equal(b.station.price,670);assert.equal(b.station.y,UPPER_Y);assert(!b.unlocked&&b.kennel.doorCollider.disabled!==true);
  assert(!isBlocked(b.station.x,b.station.z+1.5,.32,s.colliders,undefined,UPPER_Y),'Bedroom purchase approach is walkable');
  qa.setPoints(1000);qa.setPlayer(b.station.x,b.station.z+1.5,0);qa.interact();assert(!b.unlocked);assert.equal(qa.get().points,1000,'Purchase cannot happen from the room below');
  qa.setPlayer(b.station.x,b.station.z+1.5,UPPER_Y);qa.setPoints(669);qa.interact();assert(!b.unlocked);assert.equal(qa.get().points,669);assert(elements.get('toast').textContent.includes('1 MORE'));
  qa.setPoints(670);qa.interact();assert(b.unlocked);assert.equal(qa.get().points,0);assert.equal(qa.get().totalScore,0,'Freeing Bella spends essence without reducing earned score');
  assert(b.station.used&&b.kennel.doorCollider.disabled);qa.setPoints(400);qa.interact();assert.equal(qa.get().points,400,'Kennel is purchased only once per run');
  advance(s,b,3,[]);assert(b.pos.z>BELLA.z+1.9,'Bella exits the open gate instead of remaining stuck at her stop radius');assert.equal(b.kennel.progress,1);assert(b.kennel.gate.rotation.y<-1.5);
  assert(!Object.hasOwn(b,'hp')&&!Object.hasOwn(b,'health'));assert(!s.zombies.some(e=>e.group===b.rig.group),'Friendly companion is excluded from hostile counts and targeting');
  console.log('PASS: upstairs-only 670-essence purchase, insufficient funds, one purchase per run, separate earned score and a walkable animated kennel exit.');

  // Use Bella's actual navigation/movement loop across bedroom doors, the
  // landing, both stair directions, the grounds, and the underground armory.
  const follow=(x,z,y,seconds)=>{qa.setPlayer(x,z,y);advance(s,b,seconds,[]);assert(b.pos.distanceTo(s.player)<2.1,`Bella follows to ${x},${z},${y}: ${b.pos.toArray()}`);assert(!isBlocked(b.pos.x,b.pos.z,BELLA.bodyRadius,s.colliders,undefined,b.pos.y,BELLA.height),'Companion ends outside static solids');};
  follow(-33,-6,UPPER_Y,5);follow(STAIR.x,-11,UPPER_Y,18);assert.equal(b.pos.y,UPPER_Y);
  follow(STAIR.x,-1.8,0,12);assert.equal(b.pos.y,0);follow(0,20,0,12);
  follow(STAIR.x,-11,UPPER_Y,18);assert.equal(b.pos.y,UPPER_Y,'Bella climbs instead of teleporting through the floor');
  follow(0,0,0,15);assert.equal(b.pos.y,0,'When the player drops from a balcony, Bella returns by the stairs');
  while(qa.get().wave<10)qa.startWave();qa.holdSpawns();s.cellar.update(2);
  follow(CELLAR.x,CELLAR.topZ-1,0,22);follow(CELLAR.x,CELLAR.bottomZ+3,CELLAR.y,12);assert.equal(b.pos.y,CELLAR.y);
  follow(CELLAR.x,CELLAR.topZ-1,0,12);assert.equal(b.pos.y,0);
  console.log('PASS: companion crosses bedroom doors and the estate, climbs/descends both mansion and cellar stairs, and uses stairs after a balcony drop.');

  // All five hostile types use the normal body-kill damage/reward pipeline.
  const kinds=[['walker',false,false,false,false],['brute',true,false,false,false],['dog',false,true,false,false],['Ashfang',false,true,true,false],['feral',false,false,false,true]];
  for(const [kind,brute,dog,rare,feral] of kinds){
    ({s,b}=prepare());qa.setPlayer(0,20);advance(s,b,25,[]);
    const enemy=qa.makeZombie(2,20,brute,dog,rare,0,feral);enemy.hp=BELLA.damage+1;
    const earned=qa.get().totalScore,points=qa.get().points,kills=qa.get().kills;
    advance(s,b,3);assert(enemy.dead,`Bella attacks ${kind}`);assert.equal(b.attacks,2,'Two telegraphed bites, with cooldown, defeat this test target');
    const reward=brute?110:50;assert.equal(qa.get().points-points,20+reward);assert.equal(qa.get().totalScore-earned,20+reward);assert.equal(qa.get().kills,kills+1);
  }
  console.log('PASS: Bella bites walkers, brutes, both hostile hounds and ferals; kills give normal body-kill rewards, hit essence and shared score.');

  ({s,b}=prepare());qa.setPlayer(0,20);advance(s,b,25,[]);
  const outside=qa.makeZombie(BELLA.radius+.001,20);outside.hp=10000;b.pos.set(BELLA.radius-.1,0,20);advance(s,b,.5,[outside]);assert.equal(outside.hp,10000,'An enemy just beyond 12 yards is not attacked even when beside Bella');
  const boundary=qa.makeZombie(BELLA.radius,20);boundary.hp=10000;b.pos.set(BELLA.radius-.2,0,20);advance(s,b,.5,[boundary]);assert.equal(boundary.hp,10000-BELLA.damage,'Exactly 12 yards is inside the guard radius');
  const wall={x:1,z:20,w:.18,d:6,minY:0,maxY:3};s.colliders.push(wall);indexColliders(s.colliders);b.setNavigation(buildVerticalNavigation(s.colliders,{radius:BELLA.bodyRadius,groundHeight:BELLA.height,upperHeight:BELLA.height}));
  const behindWall=qa.makeZombie(1.4,20);behindWall.hp=10000;b.pos.set(.6,0,20);b.target=null;b.attackTime=-1;b.cooldown=0;qa.setPlayer(-1,20);
  advance(s,b,.4,[behindWall]);assert.equal(behindWall.hp,10000,'A nearby enemy cannot be bitten through a wall');
  advance(s,b,8,[behindWall]);assert(behindWall.hp<10000,'Bella routes around the wall to make a valid bite');
  s.colliders.splice(s.colliders.indexOf(wall),1);indexColliders(s.colliders);
  b.setNavigation(buildVerticalNavigation(s.colliders,{radius:BELLA.bodyRadius,groundHeight:BELLA.height,upperHeight:BELLA.height}));
  const upstairs=qa.makeZombie(-33,-6,false,false,false,UPPER_Y);upstairs.hp=10000;qa.setPlayer(-33,-6,UPPER_Y);b.pos.set(-33,0,-6);b.target=null;b.attackTime=-1;b.cooldown=0;advance(s,b,.4,[upstairs]);assert.equal(upstairs.hp,10000,'Bites cannot pass through a floor');
  console.log('PASS: exact 12-yard boundary, no attacks outside the player radius or through walls/floors, and reachable enemies approached around obstacles.');

  ({s,b}=prepare());qa.setPlayer(0,20);advance(s,b,25,[]);qa.setHealth(10000);
  const near=qa.makeZombie(b.pos.x+.5,b.pos.z);near.hp=10000;
  frames(20);const position=b.pos.clone(),pose=b.rig.head.rotation.x,damage=near.hp,gate=b.kennel.progress;
  document.exitPointerLock();frames(60);assert.equal(qa.get().mode,'paused');assert(b.pos.equals(position));assert.equal(b.rig.head.rotation.x,pose);assert.equal(near.hp,damage);assert.equal(b.kennel.progress,gate,'Pause freezes companion and kennel animations');
  elements.get('resume').onclick();qa.explode(b.rig.group.position.clone());assert(b.unlocked&&b.rig.group.parent===s.world,'Player grenades cannot damage or remove Bella');assert(!b.dead&&!b.enraged);
  const geo=new Set(),mat=new Set();b.rig.group.traverse(o=>{if(o.isMesh){geo.add(o.geometry);mat.add(o.material);assert(o.userData.companion==='Bella'&&!o.userData.enemy);assert(o.matrixAutoUpdate&&o.matrixWorldAutoUpdate,'Articulated parts remain dynamic after static freezing');}});
  const oldGate=b.kennel.gate.rotation.y;qa.start();assert(!b.unlocked&&!b.station.used&&!b.target);assert(!b.kennel.doorCollider.disabled);assert.equal(b.kennel.gate.rotation.y,0);assert(oldGate!==0);assert.equal(b.attackTime,-1);assert(b.pos.distanceTo(new T.Vector3(BELLA.x,BELLA.y+.17,BELLA.z))<.001);
  b.rig.group.traverse(o=>{if(o.isMesh){assert(geo.has(o.geometry)&&mat.has(o.material),'Restarts reuse warmed geometry/materials');}});
  assert(geo.size<32,'The small companion stays below 32 batched meshes');
  assert(elements.get('guideEstate').textContent.includes('670 essence')&&elements.get('guideEstate').textContent.includes('12 yards'));
  assert(!elements.get('powerups').textContent.includes('BELLA'),'New runs remove the companion HUD badge');
  console.log('PASS: pause/resume, grenade immunity, no hostile health/rage membership, dynamic joint transforms, reset/relock, cached batched model and field-guide instructions.');
  qa.start();
}
