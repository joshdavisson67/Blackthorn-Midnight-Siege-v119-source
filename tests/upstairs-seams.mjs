import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {UPPER_Y,UPPER_TILES,STAIR,hasUpperFloor} from '../public/game/vertical.mjs';
import {UPPER_SLAB_BOTTOM} from '../public/game/upper-shell.mjs';

export function verifyUpstairsSeams(qa){
  const {world,colliders}=qa.get();world.updateMatrixWorld(true);
  const opaque=[];world.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&!o.userData.dynamic)opaque.push(o);});
  const ray=new T.Raycaster();ray.far=1.65;let dividerRays=0,perimeterRays=0,joinRays=0,floorRays=0;
  function nearest(origin,direction){ray.set(new T.Vector3(...origin),new T.Vector3(...direction).normalize());return ray.intersectObjects(opaque,false)[0];}
  function wallSurface(origin,direction,axis,plane){
    ray.set(new T.Vector3(...origin),new T.Vector3(...direction).normalize());
    // The new exterior moldings project in front of the wall. Require the
    // actual plaster face behind them, so trim cannot conceal a real slit.
    const hits=ray.intersectObjects(opaque,false),wall=hits.find(hit=>Math.abs(hit.point[axis]-plane)<.003&&hit.object.material.map?.name==='plaster');
    assert(wall,`Missing structural wall behind facade at ${origin}: ${hits[0]?.point.toArray()}`);
    assert(!hits.some(hit=>hit!==wall&&Math.abs(hit.distance-wall.distance)<.0001),'The underlying wall has no competing coplanar faces');return wall;
  }
  // These 42 low traces were completely open before the fix: divider walls
  // stopped at 3.90m, leaving a 16cm slit beneath the 4.06m slab underside.
  // Trace the finished batches from both sides, including oblique views.
  for(const side of [-1,1])for(const z of [-11.2,-9.4,-6.25,-3.9,6.4,8.8,10.9])for(const y of [3.92,3.98,4.045,4.09,4.17,4.27])for(const roomSide of [false,true]){
    const origin=[side*(roomSide?6.4:4.8),y,z],direction=[side*(roomSide?-1:1),.003,0];
    const hit=nearest(origin,direction);
    assert(hit&&hit.distance<1,`Open wall/floor seam at side ${side}, z ${z}, y ${y}, room view ${roomSide}`);
    assert(Math.abs(Math.abs(hit.point.x)-5.6)<.21,'The actual wall or slab must close the slit, rather than distant furniture');dividerRays++;
  }
  for(const side of [-1,1])for(const z of [-11.2,-9.4,-6.25,-3.9,6.4,8.8,10.9]){
    const hit=nearest([side*5.45,4.075,z],[0,-1,0]);
    assert(hit&&Math.abs(hit.point.y-4.06)<.003,'Exposed wall tops need a closed cap under the floor junction');
  }
  // The floor stops at the wall center. Its vertical edge must not be the
  // only visible surface across the slab band outside the building.
  for(const y of [4.075,4.14,4.25]){
    for(const x of [-38,-28,-18,-8,0,8,18,28,38])for(const side of [-1,1]){
      const hit=wallSurface([x,y,side*12.7],[0,.006,-side],'z',side*12.24);
      assert(Math.abs(hit.point.z-side*12.24)<.003,`Missing exterior wall base at ${x}, ${side*12}, ${y}: ${hit.point.toArray()}`);perimeterRays++;
    }
    for(const side of [-1,1])for(const z of [-9,-5,-2.1,4,9]){
      const hit=wallSurface([side*42.7,y,z],[-side,.006,0],'x',side*42.24);
      assert(Math.abs(hit.point.x-side*42.24)<.003,`Missing wing wall base at ${side*42}, ${z}, ${y}`);perimeterRays++;
    }
  }
  // A buried vertical overlap would put two exterior faces on the same plane
  // immediately below the slab. Require one surface on each side of the join.
  const joins=[];
  for(const side of [-1,1]){
    for(const x of [-35.137,35.137])joins.push({origin:[x,0,side*12.7],direction:[0,0,-side],axis:'z',plane:side*12.24});
    for(const z of [-5.173,4.193])joins.push({origin:[side*42.7,0,z],direction:[-side,0,0],axis:'x',plane:side*42.24});
  }
  for(const probe of joins)for(const y of [4.035,4.05,4.075]){
    const origin=[...probe.origin];origin[1]=y;
    const first=wallSurface(origin,probe.direction,probe.axis,probe.plane);
    assert(first&&Math.abs(first.point[probe.axis]-probe.plane)<.003,'The exterior wall must cover both sides of the slab join');
    joinRays++;
  }
  // Finished floor panels retain their original walking plane, including
  // joints between galleries and wings; the intentional atrium remains open.
  for(const tile of UPPER_TILES)for(const dx of [-tile.w/2+.013,0,tile.w/2-.013])for(const dz of [-tile.d/2+.013,0,tile.d/2-.013]){
    const x=tile.x+dx,z=tile.z+dz;
    if(colliders.some(c=>!c.disabled&&c.minY<UPPER_Y+.04&&c.maxY>UPPER_Y+.04&&Math.abs(x-c.x)<c.w/2+.02&&Math.abs(z-c.z)<c.d/2+.02))continue;
    ray.set(new T.Vector3(x,UPPER_Y+.045,z),new T.Vector3(0,-1,0));
    // Rugs sit slightly above the floor; still require a real slab beneath them.
    assert(ray.intersectObjects(opaque,false).some(hit=>Math.abs(hit.point.y-UPPER_Y)<.003),`Unsupported visible floor edge at ${x}, ${z}`);floorRays++;
  }
  for(const [x,z] of [[0,0],[0,-6],[2.8,0],[-2.8,0]]){
    assert(!hasUpperFloor(x,z));ray.far=3;
    assert(!nearest([x,UPPER_Y+.02,z],[0,-1,0]),'The intentional hall opening must remain open');
  }
  assert(!hasUpperFloor(STAIR.x,(STAIR.topZ+STAIR.bottomZ)/2),'Do not add a floor across the staircase');
  console.log(`PASS: ${dividerRays} two-sided hall/wall seam traces, ${perimeterRays} exterior slab-band traces, ${joinRays} unambiguous exterior joins, ${floorRays} floor edge/joint checks, and preserved open atrium/stairwell.`);
}

// Upstairs partitions sit over open rooms downstairs. Their bottom caps must
// never compete with the slab underside, even when viewed at a grazing angle.
export function verifyUpstairsCeiling(qa){
  const {world}=qa.get();world.updateMatrixWorld(true);
  const opaque=[];world.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&!o.userData.dynamic)opaque.push(o);});
  const ray=new T.Raycaster();ray.far=.5;
  const trace=(x,z,direction)=>{
    const d=new T.Vector3(...direction).normalize(),rise=.21;
    ray.set(new T.Vector3(x-d.x/d.y*rise,UPPER_SLAB_BOTTOM-rise,z-d.z/d.y*rise),d);
    return ray.intersectObjects(opaque,false);
  };
  const floorMaterial=trace(30.613,.473,[0,1,0])[0]?.object.material;
  assert(floorMaterial,'The downstairs ceiling needs a visible floor slab');
  const probes=[];
  for(const side of [-1,1]){
    for(const x of [16.313,18.271,24.131,30.183,32.913,37.173,40.313])for(const z of [-2,2])for(const offset of [-.073,.013,.071])probes.push([side*x,z+offset]);
    for(const z of [-11.213,-8.531,-5.173,-3.417])for(const offset of [-.073,.013,.071])probes.push([side*28+offset,z]);
    // Ground-floor wing doorways expose the exterior wall caps from below.
    for(const z of [-12,12])for(const inset of [.011,.077])probes.push([side*28+.137,z-Math.sign(z)*inset]);
  }
  let traces=0;
  for(const [x,z] of probes)for(const direction of [[0,1,0],[.85,1,.37],[-.85,1,-.37]]){
    const hits=trace(x,z,direction),first=hits[0];
    assert(first&&Math.abs(first.point.y-UPPER_SLAB_BOTTOM)<.001,`Continuous downstairs ceiling under upstairs wall at ${x}, ${z}`);
    assert.equal(first.object.material,floorMaterial,'The floor slab must cover the upstairs wall caps');
    const normal=first.face.normal.clone().transformDirection(first.object.matrixWorld);
    assert(normal.y<-.99,'The visible ceiling must be the slab underside');
    assert(!hits.some(hit=>hit!==first&&Math.abs(hit.distance-first.distance)<.015),`Competing wall/ceiling faces at ${x}, ${z}, direction ${direction}`);traces++;
  }
  console.log(`PASS: ${traces} downstairs ceiling traces across both wings and upstairs room partitions, with clean slab faces at vertical and oblique angles.`);
}
