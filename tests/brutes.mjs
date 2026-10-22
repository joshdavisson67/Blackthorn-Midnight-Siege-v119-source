import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {waveConfig,isBlocked} from '../public/game/core.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';
import {MAUSOLEUM} from '../public/game/graveyard-layout.mjs';
import {animateZombie} from '../public/game/zombies.mjs';

const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-8,message);
export function verifyBrutes(qa,frames){
  for(const wave of [5,7,15,40]){
    qa.start();qa.holdSpawns();for(let i=0;i<wave;i++)qa.startWave();qa.holdSpawns();
    const cfg=waveConfig(wave),brute=qa.makeZombie(0,19,true);
    close(brute.hp,cfg.health*2.4*1.33,'Brutes gain exactly 33% health at every wave');
    close(brute.maxHp,brute.hp,'Current and maximum health use the new durability');
    close(brute.group.scale.x,1.24*1.33,'Uniform 33% model enlargement');
    close(brute.group.scale.y,brute.group.scale.x);close(brute.group.scale.z,brute.group.scale.x);
    close(brute.radius,.43*1.33,'Crowd and wall collision match the wider body');
    close(brute.bodyHeight,2.1*1.33,'Standing collision height grows with the model');
    close(brute.speed,cfg.speed*.77,'Movement speed retains its existing wave progression');
    const walker=qa.makeZombie(4,19),dog=qa.makeZombie(8,19,false,true),ashfang=qa.makeZombie(12,19,false,true,true),feral=qa.makeZombie(16,19,false,false,false,0,true);
    close(walker.maxHp,cfg.health);close(dog.maxHp,cfg.health*.85);close(ashfang.maxHp,cfg.health*.85*2);close(feral.maxHp,cfg.health);
    brute.group.scale.setScalar(1.24);
    const before=new T.Box3().setFromObject(brute.group).getSize(new T.Vector3());
    brute.group.scale.setScalar(1.24*1.33);
    const after=new T.Box3().setFromObject(brute.group).getSize(new T.Vector3());
    for(const axis of ['x','y','z'])close(after[axis]/before[axis],1.33,'Rendered dimensions scale exactly once');
    const second=qa.makeZombie(20,19,true),geometry=new Set();brute.group.traverse(o=>{if(o.isMesh)geometry.add(o.geometry);});second.group.traverse(o=>{if(o.isMesh)assert(geometry.has(o.geometry),'Larger models still reuse cached GPU geometry');});
    const kills=qa.get().kills;qa.damageEnemy(brute,cfg.health*2.4);assert(!brute.dead&&brute.hp>0,'Old lethal damage no longer kills a full-health brute');
    const points=qa.get().points;qa.damageEnemy(brute,brute.hp+1);assert(brute.dead);assert.equal(qa.get().kills,kills+1);assert.equal(qa.get().points-points,120,'Existing 10-point hit plus 110-point brute kill reward');
    const headshotPoints=qa.get().points;qa.damageEnemy(second,second.hp+1,true);assert(second.dead);assert.equal(qa.get().points-headshotPoints,210,'Brute headshots award a 200-point kill bonus plus the separate 10-point hit');
    qa.damageEnemy(second,100,true);assert.equal(qa.get().points-headshotPoints,210,'Dead brutes cannot award another headshot bonus');
    const walkerPoints=qa.get().points;qa.damageEnemy(walker,walker.hp+1,true);assert.equal(qa.get().points-walkerPoints,85,'Other headshot kills retain their 75-point bonus plus the 10-point hit');
  }
  console.log('PASS: all-wave brute health and rendered dimensions increase 33%, matching body collision and shared GPU assets; brute headshots award 200 while body kills and other headshots retain existing rewards.');

  // A standing brute is taller than upstairs headers. Its crouch must provide
  // real clearance without shrinking its model or leaving upper spawns trapped.
  let posed;
  for(const style of ['slammer','grabber']){
  qa.start();qa.holdSpawns();posed=qa.makeZombie(0,-10.4,true,false,false,UPPER_Y);posed.speed=4;posed.attack=0;posed.crouch=1;posed.flinch=.26;posed.gait={...posed.gait,attack:style};
  for(let i=0;i<120;i++){
    animateZombie(posed,1/60,1.3,i<60?.02:0);
    const bounds=new T.Box3().setFromObject(posed.group);
    assert(bounds.max.y-UPPER_Y<2.34,`Crouched head/arms clear an upstairs doorway during walking, flinch and attack (${style})`);
  }
  }
  close(posed.group.scale.y,1.24*1.33,'Crouching articulates the larger body rather than shrinking it');

  qa.start();qa.startWave();qa.holdSpawns();qa.setHealth(10000);qa.setPlayer(0,-10.4,UPPER_Y);
  const climber=qa.makeZombie(0,-10.4,true);qa.get().nav.rebuild(0,-10.4,UPPER_Y);
  for(let i=0;i<2400&&climber.floorY<UPPER_Y-.02;i++)frames(1);
  assert(climber.floorY>UPPER_Y-.02,`Larger brute climbs the main stairs: ${climber.walkPos.toArray()}`);
  assert(climber.crouch>.95);qa.setPlayer(0,0);qa.get().nav.rebuild(0,0);
  for(let i=0;i<2400&&climber.floorY>.02;i++)frames(1);
  assert(climber.floorY<.02,`Larger brute descends the main stairs: ${climber.walkPos.toArray()}`);

  for(const [x,z] of [[-33,-6],[33,-6],[-10,2.5],[10,2.5]]){
    qa.start();qa.startWave();qa.holdSpawns();qa.setHealth(10000);qa.setPlayer(0,-10.4,UPPER_Y);
    const e=qa.makeZombie(x,z,true,false,false,UPPER_Y);qa.get().nav.rebuild(0,-10.4,UPPER_Y);
    for(let i=0;i<4800&&e.walkPos.distanceTo(qa.get().player)>2;i++)frames(1);
    assert(e.walkPos.distanceTo(qa.get().player)<2,`Upper-room brute can pass doorways and hallways from ${x},${z}: ${e.walkPos.toArray()}`);
    assert(!isBlocked(e.walkPos.x,e.walkPos.z,e.radius,qa.get().colliders,undefined,e.floorY,e.bodyHeight));
    qa.setPlayer(0,0);qa.get().nav.rebuild(0,0);
    for(let i=0;i<2400&&e.floorY>.02;i++)frames(1);
    assert(e.floorY<.02,'Upper-room brute can return to the ground floor');
  }
  qa.start();qa.setHealth(10000);for(let i=0;i<21;i++)qa.startWave();qa.holdSpawns();
  qa.setPlayer(MAUSOLEUM.x,MAUSOLEUM.frontZ-2.8);qa.get().nav.rebuild(qa.get().player.x,qa.get().player.z);
  const tombBrute=qa.makeZombie(MAUSOLEUM.x,MAUSOLEUM.frontZ+3);
  for(let i=0;i<500&&tombBrute.walkPos.z>MAUSOLEUM.frontZ-1;i++){
    frames(1);
    if(Math.abs(tombBrute.walkPos.z-MAUSOLEUM.frontZ)<.6)assert(new T.Box3().setFromObject(tombBrute.group).max.y<2.8,'Crouched brute clears the mausoleum header');
  }
  assert(tombBrute.walkPos.z<MAUSOLEUM.frontZ-1,'Larger brute can enter the unlocked mausoleum');
  qa.setPlayer(MAUSOLEUM.x,MAUSOLEUM.frontZ+4);qa.get().nav.rebuild(qa.get().player.x,qa.get().player.z);
  for(let i=0;i<500&&tombBrute.walkPos.z<MAUSOLEUM.frontZ+1;i++)frames(1);
  assert(tombBrute.walkPos.z>MAUSOLEUM.frontZ+1,'Larger brute can leave the mausoleum');
  qa.start();
  console.log('PASS: crouched brute animation clears upstairs headers; larger brutes climb/descend, escape four upper rooms, navigate hallways and enter/leave the mausoleum without resizing.');
}
