import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {MANSION,ESTATE_BOUNDS} from '../public/game/estate-layout.mjs';
import {MAUSOLEUM,SARCOPHAGUS} from '../public/game/graveyard-layout.mjs';
import {isBlocked} from '../public/game/core.mjs';

export function verifyLayoutFixes(qa,frames,listeners,elements){
  qa.start();qa.startWave();qa.holdSpawns();qa.setHealth(10000);qa.setPlayer(0,-80);qa.setAim(0,0);
  qa.setKeys(['KeyW']);frames(380);qa.setKeys([]);
  assert(qa.get().player.z<-100,'The rear mansion doorway and former cellar footprint must be freely traversable');
  assert.equal(qa.get().player.y,0);
  assert(CELLAR.x+CELLAR.stairWidth/2<-3.2,'The entire flight stays left of the rear doorway');
  assert(MANSION.minZ-CELLAR.bottomZ>=7,'Several yards of forecourt separate the stairs and exterior wall');
  assert(CELLAR.topZ-ESTATE_BOUNDS.minZ>=7,'Several yards of flat approach precede the top stair');
  for(let z=CELLAR.topZ-7;z<=CELLAR.topZ-.5;z+=.5)for(const x of [CELLAR.x-1,CELLAR.x,CELLAR.x+1]){
    assert(!isBlocked(x,z,.32,qa.get().colliders),`Clear upper landing at ${x},${z}`);
  }
  qa.setPlayer(CELLAR.x,CELLAR.bottomZ+3);qa.setKeys(['KeyW']);frames(60);qa.setKeys([]);
  assert(qa.get().player.z>CELLAR.bottomZ,'Surface end rail prevents entering the deep end of the stair opening');assert.equal(qa.get().player.y,0);
  for(let i=1;i<10;i++)qa.startWave();qa.holdSpawns();frames(110);
  qa.get().nav.rebuild(CELLAR.x,-76,CELLAR.y);
  assert(!qa.get().nav.blocked[qa.get().nav.cellarTop]&&!qa.get().nav.blocked[qa.get().nav.cellarBottom]);
  qa.setPlayer(CELLAR.x,CELLAR.topZ-1);qa.setKeys(['KeyS']);frames(320);qa.setKeys([]);
  assert(qa.get().player.z>CELLAR.entryZ+1&&qa.get().player.y===CELLAR.y,'Real controls descend, cross the tunnel and enter the original-size armory');
  qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();
  console.log('PASS: rear doorway is unobstructed, both sides of the cellar have seven meters of clearance, landing is flat, end rail prevents drops, and controls reach the armory through its new tunnel.');

  qa.start();qa.setHealth(10000);for(let i=0;i<21;i++)qa.startWave();qa.holdSpawns();frames(110);
  const front=SARCOPHAGUS.z+SARCOPHAGUS.d/2;
  qa.setPlayer(SARCOPHAGUS.x,front+.45);qa.setAim(0,0);qa.setKeys(['KeyW']);listeners.keydown({code:'Space',preventDefault(){}});
  frames(55);qa.setKeys([]);frames(60);
  assert.equal(qa.get().player.y,0,'A normal jump cannot pass through the coffin lid and land inside it');
  assert(!isBlocked(qa.get().player.x,qa.get().player.z,.32,qa.get().colliders,undefined,qa.get().player.y));
  qa.setKeys(['KeyS']);frames(100);qa.setKeys([]);assert(qa.get().player.z>MAUSOLEUM.frontZ,'The formerly trapped jump can walk straight out');
  qa.setPlayer(SARCOPHAGUS.x,SARCOPHAGUS.z,1.5);frames(70);
  assert.equal(qa.get().player.y,SARCOPHAGUS.top,'Falling onto the coffin must land on its lid instead of inside its collision box');

  function walkTo(x,z){
    let ticks=0;
    while(Math.hypot(qa.get().player.x-x,qa.get().player.z-z)>.15&&ticks++<500){
      const p=qa.get().player;qa.setAim(Math.atan2(p.x-x,p.z-z),0);qa.setKeys(['KeyW']);frames(1);
    }
    qa.setKeys([]);assert(ticks<500,`Walkable mausoleum exit toward ${x},${z}: ${qa.get().player.toArray()}`);
  }
  for(const keys of [['KeyD'],['KeyA'],['KeyW'],['KeyS'],['KeyW','KeyD'],['KeyW','KeyA'],['KeyS','KeyD'],['KeyS','KeyA']]){
    qa.setPlayer(SARCOPHAGUS.x,SARCOPHAGUS.z,SARCOPHAGUS.top);qa.setAim(0,0);qa.setKeys(keys);frames(80);qa.setKeys([]);frames(35);
    assert.equal(qa.get().player.y,0,'Each edge and corner must land on the floor');
    assert(!isBlocked(qa.get().player.x,qa.get().player.z,.32,qa.get().colliders),'Stepping off cannot leave the player inside a wall or coffin');
    if(qa.get().player.z<front+.45){
      const side=keys.includes('KeyA')?-1:1,lane=MAUSOLEUM.x+side*2.4;
      if(qa.get().player.z<SARCOPHAGUS.z-SARCOPHAGUS.d/2)walkTo(lane,MAUSOLEUM.z-3.3);
      walkTo(lane,front+.8);walkTo(MAUSOLEUM.x,front+.8);
    }
    walkTo(MAUSOLEUM.x,MAUSOLEUM.frontZ+2);
    assert(qa.get().player.z>MAUSOLEUM.frontZ&&qa.get().grounded);
  }
  qa.get().nav.rebuild(MAUSOLEUM.x,MAUSOLEUM.frontZ+2,0);
  for(const x of [MAUSOLEUM.x-2,MAUSOLEUM.x,MAUSOLEUM.x+2])assert(qa.get().nav.direction(x,-17,0).reachable,'Rear passage is connected around the coffin');
  console.log('PASS: reproduced jump cannot penetrate the coffin, drops land on its lid, all four edges and four corners permit keyboard escape, and the widened rear passage connects to the doorway.');qa.start();
}
