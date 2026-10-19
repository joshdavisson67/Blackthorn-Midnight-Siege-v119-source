import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {columnSurfaceGeometry} from '../public/game/column-surfaces.mjs';
import {MAUSOLEUM} from '../public/game/graveyard-layout.mjs';
import {PORTICO} from '../public/game/facade.mjs';

const near=(a,b,label,tolerance=.00002)=>assert(Math.abs(a-b)<tolerance,`${label}: ${a} vs ${b}`);
export function verifyColumnSurfaces(qa){
  const texture=new T.Texture();texture.userData.tileMeters=1.8;
  const material=new T.MeshStandardMaterial({map:texture});
  const unit=new T.CylinderGeometry(1,1,1,24),profile=[new T.Vector2(.4,0),new T.Vector2(.25,.6),new T.Vector2(.25,5.9),new T.Vector2(.4,6.42)];
  const lathe=new T.LatheGeometry(profile,32),ring=new T.TorusGeometry(.3,.028,8,32),cone=new T.ConeGeometry(.42,.48,4);
  function unchanged(base,mapped){
    for(const key of ['position','normal'])assert.deepEqual(mapped.attributes[key].array,base.attributes[key].array,'Stone mapping preserves the actual surface');
    assert.deepEqual(mapped.index.array,base.index.array,'Mapping adds no triangles');
    assert.deepEqual(mapped.groups,base.groups,'Mapping preserves cap/shaft face groups');
    assert(mapped.attributes.uv.array.every(Number.isFinite));
  }
  // Both downloaded limestone and the procedural fallback must have equal
  // texture density on a tall shaft, its short base and the slender fluting.
  for(const repeat of [1,4]){
    texture.repeat.set(repeat,repeat);
    for(const [radius,height] of [[.28,4.5],[.32,6.8],[.38,6.8],[.58,.4],[.026,2.86]]){
      const scale=[radius,height,radius],mapped=columnSurfaceGeometry(unit,material,scale),uv=mapped.attributes.uv;
      unchanged(unit,mapped);assert.equal(columnSurfaceGeometry(unit,material,scale),mapped,'Repeated columns reuse the mapped geometry');
      near((uv.getX(24)-uv.getX(0))*repeat,2*Math.PI*radius/1.8,'Circumference keeps physical tile width');
      near((uv.getY(0)-uv.getY(25))*repeat,height/1.8,'Height keeps physical tile height');
      const cap=49+24+1,uvDelta=(uv.getX(cap+1)-uv.getX(cap))*repeat;
      near(uvDelta,(mapped.attributes.position.getX(cap+1)-mapped.attributes.position.getX(cap))*radius/1.8,'Cap stones keep planar scale');
    }
    const carved=columnSurfaceGeometry(lathe,material),c=carved.attributes.uv;
    unchanged(lathe,carved);
    near((c.getY(2)-c.getY(1))*repeat,5.3/1.8,'The long shaft section is not squeezed into one profile UV interval');
    near((c.getX(32*profile.length+1)-c.getX(1))*repeat,2*Math.PI*.25/1.8,'Carved shaft uses the cylindrical stone scale');
    const collar=columnSurfaceGeometry(ring,material),r=collar.attributes.uv;
    unchanged(ring,collar);unchanged(cone,columnSurfaceGeometry(cone,material));
    near((r.getX(32)-r.getX(0))*repeat,2*Math.PI*.3/1.8,'Collar follows its circumference');
    near((r.getY(8*33)-r.getY(0))*repeat,2*Math.PI*.028/1.8,'Collar follows its tube rather than stretching a whole image across it');
  }
  assert.equal(columnSurfaceGeometry(unit,new T.MeshStandardMaterial()),unit,'Untextured metal stays untouched');

  // Inspect the finished, clipped and statically batched game geometry. These
  // checks catch a constructor forgetting the mapping or using another finish.
  const {world}=qa.get();world.updateMatrixWorld(true);
  const opaque=[];world.traverse(o=>{if(o.isMesh&&!o.material.transparent&&!o.userData.dynamic)opaque.push(o);});
  const ray=new T.Raycaster();ray.far=1.1;
  function front(x,y,z){
    ray.set(new T.Vector3(x,y,z+.85),new T.Vector3(0,0,-1));
    const hit=ray.intersectObjects(opaque,false)[0];assert(hit,'Column must retain visible geometry');return hit;
  }
  const portico=PORTICO.columns.map(x=>[x,PORTICO.axisZ]);
  const locations=[[-4.5,7],[4.5,-8],[4.5,7],[-37,-7],[-37,7],[-19,-7],[-19,7],[54,2.5],[54,9.5]];
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4;locations.push([Math.cos(a)*9,-24+Math.sin(a)*8]);}
  const rotundaStart=locations.length;
  for(const side of [-1,1])locations.push([MAUSOLEUM.x+side*2.7,MAUSOLEUM.frontZ+.43]);
  let stone;
  for(const [x,z] of locations){
    const a=front(x,1.1,z),b=front(x,2.1,z),mat=a.object.material;
    stone??=mat;assert.equal(mat,stone,`Column at ${x},${z} shares the same finish`);
    assert.equal(b.object.material,stone);assert.equal(mat.map.name,'stone');
    near(Math.abs(b.uv.y-a.uv.y)*mat.map.repeat.y,1/mat.map.userData.tileMeters,`Finished shaft at ${x},${z} retains metric UVs after clipping and batching`);
  }
  locations.push(...portico);
  for(const [x,z] of locations.slice(0,7).concat(locations.slice(rotundaStart))){
    // Carved hall bases are part of the Lathe rather than separate cylinders.
    const a=front(x,.18,z);assert.equal(a.object.material,stone,'Column bases use matching stone');
  }
  console.log(`PASS: ${locations.length} finished columns share limestone and uniform vertical tile scale, with matching bases; round/carved/cap/collar/fluting UV density, texture fallback, cached geometry and unchanged triangles/normals.`);
}
