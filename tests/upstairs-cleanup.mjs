import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {UPPER_Y,UPPER_HEIGHT,UPPER_CEILING,PREVIOUS_UPPER_HEIGHT,UPPER_ROOMS,moveActor} from '../public/game/vertical.mjs';
export function verifyUpstairsCleanup(qa){
  const s=qa.get(),upper=s.secondFloor; s.world.updateMatrixWorld(true);
  assert.equal(UPPER_HEIGHT/PREVIOUS_UPPER_HEIGHT,1.25);
  assert(Math.abs(UPPER_CEILING-7.2)<1e-9);
  assert(upper.shellReport.clipped>20&&upper.shellReport.removed>50,'Legacy ground-floor trim must be cleared from upstairs');
  const opaque=[];s.world.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
  const ray=new T.Raycaster();
  assert.equal(upper.windowOpenings.length,13);
  for(const w of upper.windowOpenings){
    assert(w.pane.material.transparent&&w.pane.material.opacity<.1&&!w.pane.material.depthWrite);
    assert.equal(w.pane.material.emissiveIntensity,1);assert.equal(w.pane.material.emissive.getHex(),0);
    assert(w.pane.parent,'Transparent panes must remain in scene after static batching');
    const dir=new T.Vector3(w.axis==='z'?w.outward:0,0,w.axis==='x'?w.outward:0);
    for(const offset of [-.8,-.4,.4,.8])for(const y of [5.4,5.98,6.6]){
      const origin=new T.Vector3(w.x+(w.axis==='x'?offset:0),y,w.z+(w.axis==='z'?offset:0)).addScaledVector(dir,-.8);
      ray.set(origin,dir);ray.near=0;ray.far=2.3;const hits=ray.intersectObjects(opaque,false);
      assert.equal(hits.length,0,`Window ${w.x},${w.z} obstructed at ${offset},${y}: ${hits[0]?.point.toArray()}`);
    }
    const p=new T.Vector3(w.x,UPPER_Y,w.z).addScaledVector(dir,-1);
    for(let i=0;i<25;i++)moveActor(p,dir.x*.1,dir.z*.1,s.colliders,{allowFall:false});
    assert(p.clone().sub(new T.Vector3(w.x,UPPER_Y,w.z)).dot(dir)<-.3,'Window collisions must contain the player');
  }
  for(const r of UPPER_ROOMS){
    ray.set(new T.Vector3(r.x+.45,UPPER_Y+1.8,r.z+.35),new T.Vector3(0,1,0));ray.far=3;
    const hit=ray.intersectObjects(opaque,false)[0];
    assert(hit,`${r.name} has a real ceiling`);
    assert(Math.abs(hit.point.y-UPPER_CEILING)<.01,`${r.name} still has an old low ceiling at ${hit.point.y}`);
  }
  for(const d of upper.doors){
    for(const offset of [-.8,0,.8]){
      const direction=new T.Vector3(d.axis==='z'?1:0,0,d.axis==='x'?1:0);
      const origin=new T.Vector3(d.x+(d.axis==='x'?offset:0),UPPER_Y+1.7,d.z+(d.axis==='z'?offset:0)).addScaledVector(direction,-.4);
      ray.set(origin,direction);ray.far=.8;
      assert.equal(ray.intersectObjects(opaque,false).length,0,'Door openings must have no lingering trim or floating plaques at eye height');
    }
  }
  console.log(`PASS: 25% taller physical ceilings, ${upper.windowOpenings.length} clear exterior windows (${upper.windowOpenings.length*12} sightline checks), contained movement and ${upper.doors.length} unobstructed doorways. Cleanup: ${JSON.stringify(upper.shellReport)}`);
}
