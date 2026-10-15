import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {PLAYER_RADIUS} from '../public/game/crowd.mjs';
import {isBlocked,colliderTop} from '../public/game/core.mjs';
import {UPPER_Y,moveActor} from '../public/game/vertical.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {MAUSOLEUM,GRAVEYARD} from '../public/game/graveyard-layout.mjs';

export function verifyDoorways(qa,frames){
  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.holdSpawns();
  const s=qa.get();s.cellar.update(2);s.graveyard.unlock();s.graveyard.update(2);
  const doors=[
    ...[...s.groundDoors,...s.expansion.doors].map(d=>({...d,y:0,approach:3})),
    ...s.secondFloor.doors.map(d=>({...d,y:UPPER_Y,approach:2})),
    {x:CELLAR.x,z:CELLAR.entryZ,axis:'x',width:CELLAR.stairWidth,y:CELLAR.y,approach:3},
    {x:MAUSOLEUM.x,z:MAUSOLEUM.frontZ,axis:'x',width:MAUSOLEUM.doorWidth,y:0,approach:3},
    {x:GRAVEYARD.entryX,z:GRAVEYARD.entryZ,axis:'z',width:GRAVEYARD.entryWidth-.85,y:0,approach:3}
  ];
  assert.equal(doors.length,42,'Audit every mansion doorway, including both exterior wing exits, plus cellar, mausoleum and cemetery entrances');
  s.world.updateMatrixWorld(true);const opaque=[];
  s.world.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o.material.alphaTest>0)return;
    for(let p=o;p;p=p.parent)if(!p.visible)return;
    opaque.push(o);
  });
  const ray=new T.Raycaster();let crossings=0,sightlines=0;
  for(const d of doors){
    const name=`Door ${d.x},${d.z} on floor ${d.y}`,width=d.width-.4;
    // This catches low tables/chairs as well as tall shelves and machines,
    // including objects a few metres back from the actual wall opening.
    for(const c of s.colliders){
      if(c.disabled||(c.maxY??3.8)<=d.y+.12||(c.minY??0)>=d.y+1.9)continue;
      // Add an end margin for room objects. Balcony guards can sit just past
      // the approach where the floor ends; walking must still clear them.
      const reach=d.approach+(c.railing?0:.4),zone={x:d.x,z:d.z,w:d.axis==='x'?width:reach*2,d:d.axis==='x'?reach*2:width};
      const overlapX=(zone.w+c.w)/2-Math.abs(zone.x-c.x),overlapZ=(zone.d+c.d)/2-Math.abs(zone.z-c.z);
      // The high end of a sloped banister is above this ground-floor route;
      // evaluate its local bottom, rather than its full-flight AABB.
      if(c.slope!==undefined&&overlapZ>0){
        const a=colliderTop(c,Math.max(c.z-c.d/2,zone.z-zone.d/2)),b=colliderTop(c,Math.min(c.z+c.d/2,zone.z+zone.d/2));
        if(Math.min(a,b)-c.topY+c.baseY-.25>=d.y+1.9||Math.max(a,b)<=d.y+.12)continue;
      }
      assert(overlapX<=.01||overlapZ<=.01,`${name}: ${c.furnishing||'solid element'} obstructs the approach at ${c.x},${c.z}`);
    }
    // Decorative meshes can obstruct the view even without a collision box.
    const dir=new T.Vector3(d.axis==='z'?1:0,0,d.axis==='x'?1:0);
    for(const fraction of [-1,-.75,-.5,-.25,0,.25,.5,.75,1])for(const dy of [.18,.65,1.2,1.8]){
      const off=fraction*width/2;
      const origin=new T.Vector3(d.x+(d.axis==='x'?off:0),d.y+dy,d.z+(d.axis==='z'?off:0)).addScaledVector(dir,-d.approach);
      ray.set(origin,dir);ray.near=0;ray.far=d.approach*2;
      const hit=ray.intersectObjects(opaque,false)[0];
      assert(!hit,`${name}: visual obstruction at ${hit?.point.toArray()} (${hit?.object.name})`);sightlines++;
    }
    const lane=width/2-PLAYER_RADIUS-.10;
    for(const fraction of [-1,-.5,0,.5,1])for(const sign of [-1,1]){
      const off=fraction*lane;
      const p=new T.Vector3(d.x+(d.axis==='x'?off:0),d.y,d.z+(d.axis==='z'?off:0)).addScaledVector(dir,-sign*d.approach);
      assert(!isBlocked(p.x,p.z,PLAYER_RADIUS,s.colliders,undefined,d.y),`${name}: approach lane starts blocked`);
      for(let i=0;i<Math.round(d.approach*2/.05);i++)moveActor(p,dir.x*sign*.05,dir.z*sign*.05,s.colliders,{radius:PLAYER_RADIUS,allowFall:false});
      const progress=(p.x-d.x)*dir.x+(p.z-d.z)*dir.z;
      assert(Math.abs(progress-sign*d.approach)<.01,`${name}: actor gets stuck crossing lane ${off}, direction ${sign}`);
      assert(Math.abs(p.y-d.y)<.01,`${name}: actor falls while crossing`);crossings++;
    }
  }
  // Use the actual keyboard movement loop for the formerly crowded dining
  // route in both directions, rather than only testing isolated door planes.
  for(const [x,key] of [[4,'KeyD'],[16,'KeyA']]){
    qa.setPlayer(x,0);qa.setAim(0,0);qa.setKeys([key]);frames(220);qa.setKeys([]);
    assert(key==='KeyD'?qa.get().player.x>15.5:qa.get().player.x<4.5,'Dining room has a continuous keyboard-walkable through route');
  }
  const forge=s.interactables.find(v=>v.type==='upgrade'&&v.y===0);
  assert(!isBlocked(forge.x,forge.z+1.6,PLAYER_RADIUS,s.colliders),'Moved Soul Forge has a clear purchase approach');
  qa.setPoints(10000);qa.setPlayer(forge.x,forge.z+1.6);qa.interact();assert(qa.get().inventory.glock.forgeRank===1,'Moved Soul Forge remains usable');
  console.log(`PASS: ${doors.length} full doorway approaches, ${sightlines} low/eye-height sightlines, ${crossings} bidirectional actor crossings, keyboard movement through the dining room, and usable relocated Soul Forge.`);
  qa.start();
}
