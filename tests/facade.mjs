import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {mansionRoofGeometry,dormerRoofGeometry} from '../public/game/facade.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyFacade(qa){
  const state=qa.get(),{facade,world,mainRoof}=state;world.updateMatrixWorld(true);
  assert.equal(state.colliders.length,506,'Exterior ornament does not change collision or navigation');
  assert.equal(facade.faces.length,4);assert.equal(facade.windows.length,65);assert.equal(facade.windows.filter(w=>w.upper).length,13);assert.equal(facade.dormers.length,2);assert.equal(facade.drains.length,12);
  let triangles=0;const materials=new Set(),geometries=new Set();
  for(const o of facade.parts){
    assert(!o.userData.dynamic,'All ornament must remain static');assert(!o.isInstancedMesh);
    const matrix=o.userData.facadeMatrix;assert(matrix.elements.every(Number.isFinite));o.geometry.computeBoundingBox();
    const bounds=o.geometry.boundingBox.clone().applyMatrix4(matrix);assert(bounds.min.toArray().every(Number.isFinite));
    assert(bounds.min.x>=41.70||bounds.max.x<=-41.70||bounds.min.z>=11.70||bounds.max.z<=-83.70||bounds.min.y>=7.20,'Facade detail stays outside playable rooms');
    assert(o.geometry.attributes.uv.array.every(Number.isFinite));triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material);geometries.add(o.geometry);
    if(o.material.map?.name==='stone'){
      const uv=o.geometry.attributes.uv,position=o.geometry.attributes.position,repeat=o.material.map.repeat,tile=o.material.map.userData.tileMeters;
      // Box faces use world dimensions, including small relief blocks.
      if(o.geometry.index?.count===36&&o.geometry.attributes.position.count===24){assert(Math.abs(Math.abs(uv.getY(0)-uv.getY(2))*repeat.y-o.scale.y/tile)<.00001,'Box stonework retains physical texture height');assert(position.array.every(Number.isFinite));}
    }
  }
  assert(triangles<14000,'Keep facade detail below two percent of the previous scene triangle count');assert.equal(materials.size,6,'Reuse the existing six finishes');assert(geometries.size<180,'Repeated dimensions reuse metric geometry');
  const opaque=[];world.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&!o.userData.dynamic)opaque.push(o);});
  const ray=new T.Raycaster();
  function trace(origin,direction,far=2){ray.set(new T.Vector3(...origin),new T.Vector3(...direction));ray.near=0;ray.far=far;return ray.intersectObjects(opaque,false);}
  function single(hits,label){assert(hits.length,label);assert(!hits.some(h=>h!==hits[0]&&Math.abs(h.distance-hits[0].distance)<.0001),label+' has no competing coplanar face');return hits[0];}
  let clear=0,trim=0;
  for(const f of facade.faces){
    const dir=f.axis==='x'?[0,0,-f.outward]:[-f.outward,0,0];
    for(const door of f.doors)for(const offset of [-door.width/2+.5,0,door.width/2-.5])for(const y of [.3,1.68,3.2]){
      const at=door.at+offset,origin=f.axis==='x'?[at,y,f.fixed+f.outward*.8]:[f.fixed+f.outward*.8,y,at];assert.equal(trace(origin,dir,1.1).length,0,'Doorways retain clear player/brute-sized approaches');clear++;
    }
  }
  for(const w of facade.windows){
    const {face:f,at,sill,head,width}=w,dir=f.axis==='x'?[0,0,-f.outward]:[-f.outward,0,0];
    for(const side of [-1,1]){
      const along=at+side*(width/2+.13)+.011,y=(sill+head)/2+.017,origin=f.axis==='x'?[along,y,f.fixed+f.outward*1.3]:[f.fixed+f.outward*1.3,y,along];
      single(trace(origin,dir,1.5),'Window stone jamb');trim++;
    }
  }
  for(const xs of [-1,1])for(const zs of [-1,1])for(let row=0;row<14;row++){
    const z=zs>0?12:-84,y=.36+row*.48+.013;
    single(trace([xs*41.90,y,z+zs*1.3],[0,0,-zs],1.5),'Bonded corner front');
    single(trace([xs*43.30,y,z+zs*.301],[-xs,0,0],1.5),'Bonded corner return');trim+=2;
  }
  for(const side of [-1,1])for(const offset of [-.65,0,.65])for(const y of [UPPER_Y+.3,UPPER_Y+1.68,UPPER_Y+2.2]){
    assert.equal(trace([side*43,y,offset],[-side,0,0],1.6).length,0,'The upper exterior exits retain their entire landing approach');clear++;
  }
  assert.equal(facade.dormers[0].roof.geometry,facade.dormers[1].roof.geometry,'Both properly pitched caps share geometry');
  for(const d of facade.dormers){
    const matrix=d.roof.userData.facadeMatrix,p=d.roof.geometry.attributes.position,n=d.roof.geometry.attributes.normal;
    assert.equal(p.count/3,20,'Each closed roof has only twenty triangles');
    const edges=new Map(),vertex=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(6)).join(',');
    for(let i=0;i<p.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const key=[vertex(a),vertex(b)].sort().join('/');edges.set(key,(edges.get(key)??0)+1);}
    assert([...edges.values()].every(count=>count===2),'The cap is watertight, including both mitered ridge and eaves');
    for(let i=0;i<12;i++)assert(n.getY(i)>0,'Both roof slopes face outward and upward');
    for(const x of [-1.05,-.53,.53,1.05]){
      const hit=single(trace([d.x+x,13,13.21],[0,-1,0],4),'Dormer roof slope'),height=d.eave+d.rise*(1-Math.abs(x)/(d.width/2));assert(Math.abs(hit.point.y-height)<.00001,'Both roof halves meet their intended pitch without skew or floating corners');
    }
    const bounds=new T.Box3().setFromBufferAttribute(p).applyMatrix4(matrix);assert(Math.abs(bounds.max.y-(d.eave+d.rise))<.00001);assert(bounds.min.x<d.x-1.12&&bounds.max.x>d.x+1.12,'Eaves cover the stone cheeks');
    for(const x of [-.44,.44])for(const y of [8.60,9.70]){const hit=single(trace([d.x+x,y,15],[0,0,-1],2),'Dormer pane');assert.equal(hit.object.material,d.pane.material,'Stone and roof trim do not cover the glass');}
  }
  const roof=mansionRoofGeometry(mainRoof.material),normals=roof.attributes.normal;assert(normals.getZ(0)>.999);assert(normals.getZ(3)<-.999);for(let i=6;i<roof.attributes.position.count;i++)assert(normals.getY(i)>0,'The main roof slopes retain outward normals');
  const material=mainRoof.material,metric=dormerRoofGeometry(material),uv=metric.attributes.uv,physical=Math.hypot(1.36,.88);assert(Math.abs(uv.getX(1)*material.map.repeat.x-physical/material.map.userData.tileMeters)<.00001,'Sloped shingles keep metric texture scale');roof.dispose();metric.dispose();
  console.log(`PASS: facade details on all four sides, 65 matched surrounds, two closed pitched dormers, ${clear} clear doorway/landing rays, ${trim} unambiguous trim rays, metric cached stone/slate UVs; ${triangles} static triangles, six existing finishes and no added lights/textures/collision.`);
}
