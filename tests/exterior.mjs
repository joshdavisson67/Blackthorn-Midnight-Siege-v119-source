import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';

// Trace the finished static batches: coplanar trim and obsolete ceiling panels
// used to give two competing visible surfaces at these exact exterior spots.
export function verifyExterior(qa){
  const {world}=qa.get();world.updateMatrixWorld(true);
  const opaque=[];world.traverse(o=>{if(o.isMesh&&!o.material.transparent&&!o.userData.dynamic)opaque.push(o);});
  const ray=new T.Raycaster();ray.far=2;
  const trace=(origin,direction)=>{ray.set(new T.Vector3(...origin),new T.Vector3(...direction));return ray.intersectObjects(opaque,false);};
  function singleSurface(hits,label){
    assert(hits.length,label+' must have visible geometry');
    const nearest=hits[0];
    assert(!hits.some(h=>h!==nearest&&Math.abs(h.distance-nearest.distance)<.0001),label+' must not have competing coplanar surfaces, including within one static batch');
    return nearest;
  }
  let doorwayRays=0;
  for(const side of [-1,1])for(const jamb of [-3.11,3.11]){
    const h=singleSurface(trace([side*43,2.07,-48+jamb],[-side,0,0]),'Side doorway');
    assert(Math.abs(h.point.x-side*42.31)<.001,'Side trim must project beyond the wall');doorwayRays++;
  }
  for(const x of [-28,28])for(const jamb of [-3.11,3.11]){
    const h=singleSurface(trace([x+jamb,2.07,13],[0,0,-1]),'Front doorway');
    assert(Math.abs(h.point.z-12.31)<.001,'Front trim must project beyond the wall');doorwayRays++;
  }
  for(const jamb of [-3.11,3.11]){
    const h=singleSurface(trace([jamb,2.07,-85],[0,0,1]),'North doorway');
    assert(Math.abs(h.point.z+84.31)<.001,'North trim must project beyond the wall');doorwayRays++;
  }
  let joinRays=0;
  for(const side of [-1,1])for(const y of [6.88,6.96,7.03])for(const z of [-12.067,-12.139]){
    const h=singleSurface(trace([side*43,y,z],[-side,0,0]),'Rear upper-wing roof join');
    assert(Math.abs(h.point.x-side*42)<.001,'Rear wall remains intact ahead of the recessed ceiling cap');joinRays++;
  }
  let windowRays=0;
  for(const x of [-10,-7,7,10])for(const dx of [-.0093,.0093]){
    const h=singleSurface(trace([x+dx,3.4111,13],[0,0,-1]),'Front window crossbar');
    assert(Math.abs(h.point.z-12.435)<.001,'Window mullions remain in front of the glass');windowRays++;
  }
  ray.far=.15;let ceilingRays=0;
  for(const x of [-2.7,0,2.7])for(const z of [-8,-4,0,4,8]){
    const h=singleSurface(trace([x+.13,7.47,z+.17],[0,-1,0]),'Roof slab');
    assert(Math.abs(h.point.y-7.44)<.001,'The upper slab must remain intact');ceilingRays++;
  }
  console.log(`PASS: ${doorwayRays} exterior doorway rays, ${joinRays} rear roof-join rays, ${windowRays} window-crossbar rays and ${ceilingRays} former coffer positions have separated, unambiguous surfaces after static batching.`);
}
