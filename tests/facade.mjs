import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {mansionRoofGeometry,dormerRoofGeometry,PORTICO,ATTIC} from '../public/game/facade.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyFacade(qa){
  const state=qa.get(),{facade,world,mainRoof}=state;world.updateMatrixWorld(true);
  assert.equal(state.colliders.length,514,'Only the eight portico pedestals add collision');
  assert.equal(state.colliders.filter(c=>c.portico).length,8);
  assert.equal(facade.faces.length,4);assert.equal(facade.windows.length,65);assert.equal(facade.windows.filter(w=>w.upper).length,13);assert.equal(facade.dormers.length,0,'The pediment replaces the front dormers');assert.equal(facade.drains.length,12);
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
  assert(triangles<50000,`Static facade detail stays within budget (${triangles})`);assert(materials.size<=6,'Reuse the existing finishes');assert(geometries.size<260,'Repeated dimensions reuse metric geometry');
  // Balusters: one shadowless instanced draw, all standing on the roofline.
  const {balusters}=facade,perBaluster=(balusters.geometry.index?.count??balusters.geometry.attributes.position.count)/3;
  assert(balusters.isInstancedMesh&&!balusters.castShadow&&balusters.count>900,'Roofline balustrade is a single instanced draw');
  assert(perBaluster<=84&&perBaluster*balusters.count<80000,`Baluster triangles stay bounded (${perBaluster*balusters.count})`);
  const im=new T.Matrix4(),ip=new T.Vector3();for(let i=0;i<balusters.count;i++){balusters.getMatrixAt(i,im);ip.setFromMatrixPosition(im);assert(ip.y>=7.3,'Balusters stand on the roofline, out of play');}
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
  // Portico: eight giant Ionic columns clear of the door, windows and ammo crate.
  assert.equal(facade.columns.length,8);
  const groundWindows=facade.windows.filter(w=>w.face===facade.faces[0]&&!w.upper);
  for(const c of facade.columns){
    assert(Math.abs(c.x)-PORTICO.pedestal/2>3.2+.5,'Pedestals leave the main door and its open leaves clear');
    for(const w of groundWindows)assert(Math.abs(c.x-w.at)>w.width/2+.23+PORTICO.pedestal/2,`Column ${c.x} clears the window at ${w.at}`);
    assert(Math.abs(c.x+7)>.75+PORTICO.pedestal/2+.3,'The courtyard ammo crate stays reachable');
    const hit=single(trace([c.x,3.5,c.z+1.2],[0,0,-1],1.2),'Column shaft');assert(Math.abs(hit.point.z-(c.z+PORTICO.radius))<.03,'Shaft stands proud of the wall');
    const blocked=state.colliders.find(k=>k.portico&&k.x===c.x);assert(blocked&&blocked.maxY>=6.9);
  }
  // Pediment: tympanum, raking cornice and crest all face the courtyard.
  const [,entTop]=PORTICO.entablature,rise=15*PORTICO.slope;
  const tymp=single(trace([6,entTop+.8,16],[0,0,-1],4),'Tympanum');assert.equal(tymp.object.material.map?.name,'stone');assert(tymp.point.z>12.9&&tymp.point.z<13.2);
  const apexHit=single(trace([0,entTop+rise+3,12.9],[0,-1,0],4),'Raking cornice at the apex');assert(apexHit.point.y>entTop+rise-.1,'The pediment rises above the slate gable');
  const crestHit=trace([0,entTop+rise*.42,16],[0,0,-1],4)[0];assert(crestHit&&crestHit.object.material.map&&crestHit.object.material.map.name!=='stone','The family crest sits in the pediment roundel');
  for(const x of [-12,-6,0,6,12]){const first=trace([x,8+Math.max(0,4.5-Math.abs(x)*.3),17],[0,0,-1],6)[0];assert(first&&first.object.material!==mainRoof.material,`The slate gable is hidden behind the pediment at x=${x}`);}
  // Twelve statues: pediment, roof corners and the attic tower.
  // Groups are emptied by static batching, so measure the recorded parts.
  const boundsOf=prefix=>{const b=new T.Box3();for(const o of facade.parts)if(o.name.startsWith(prefix)){o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.userData.facadeMatrix));}return b;};
  assert.equal(facade.statues.length,12);const figures=boundsOf('facade-statue');assert(!figures.isEmpty()&&figures.min.y>=7.2,'Statues stand above play');
  assert.equal(facade.parts.filter(o=>o.name==='facade-statue-head').length,12);
  // The attic tower rises above the pediment, clear of both chimneys.
  const tower=boundsOf('facade-attic');assert(!tower.isEmpty());assert(tower.min.y>=7.2&&tower.max.y>entTop+rise+1,'The attic tower rises above the pediment');
  for(const [cx,cz] of [[-10,-5],[9,-8]])assert(Math.abs(cx)-.65>ATTIC.w/2+.3||Math.abs(cz-ATTIC.z)>ATTIC.d/2+.75,'Chimneys stand clear of the tower');
  const roof=mansionRoofGeometry(mainRoof.material),normals=roof.attributes.normal;assert(normals.getZ(0)>.999);assert(normals.getZ(3)<-.999);for(let i=6;i<roof.attributes.position.count;i++)assert(normals.getY(i)>0,'The main roof slopes retain outward normals');
  const material=mainRoof.material,metric=dormerRoofGeometry(material),uv=metric.attributes.uv,physical=Math.hypot(1.36,.88);assert(Math.abs(uv.getX(1)*material.map.repeat.x-physical/material.map.userData.tileMeters)<.00001,'Sloped shingles keep metric texture scale');roof.dispose();metric.dispose();
  console.log(`PASS: facade details on all four sides, 65 matched surrounds, an eight-column portico, pediment and crest, a ${facade.balusters.count}-baluster roofline, twelve statues, an attic tower, ${clear} clear doorway/landing rays, ${trim} unambiguous trim rays, metric cached stone/slate UVs; ${triangles} static triangles, existing finishes, no added lights/textures and only pedestal collision.`);
}
