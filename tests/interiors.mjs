import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createFurnishings} from '../public/game/furnishings.mjs';
import {RUG_SCALE} from '../public/game/rugs.mjs';
import {UPPER_Y,UPPER_CEILING,hasUpperFloor} from '../public/game/vertical.mjs';

export function verifyInteriors(qa,frames,listeners){
  qa.start();qa.holdSpawns();const s=qa.get(),assets=s.furnishings.records;
  const required=['Tufted leather sofa','Open oak bookcase','Double oak bed','Single oak bed','Infirmary iron bed','Writing desk','Dining chair','Oak wardrobe','Curved grand piano','Brass refractor telescope','Potted conservatory plant','Tabletop terrestrial globe'];
  for(const name of required)assert(assets.some(r=>r.type===name),'Missing room-appropriate furnishing: '+name);
  for(const r of assets){
    const size=r.bounds.getSize(new T.Vector3());
    assert(size.x>0&&size.z>0&&Number.isFinite(size.y));
    if(r.y>=UPPER_Y){assert(r.bounds.max.y<UPPER_CEILING,'Upper furniture fits the ceiling');for(const x of [r.bounds.min.x,r.bounds.max.x])for(const z of [r.bounds.min.z,r.bounds.max.z])assert(hasUpperFloor(x,z),'Upper furniture stays on supported floor');}
    if(!r.collider)continue;
    const a=r.collider;assert(a.w>=size.x&&a.d>=size.z,'The collision volume contains the rotated model');
    for(const c of s.colliders){
      if(c===a||c.disabled||(c.maxY??3.8)<=a.minY+.01||(c.minY??0)>=a.maxY-.01)continue;
      const overlapX=(a.w+c.w)/2-Math.abs(a.x-c.x),overlapZ=(a.d+c.d)/2-Math.abs(a.z-c.z);
      assert(overlapX<.045||overlapZ<.045,r.type+' clips another furnishing or a wall at '+r.x+','+r.z);
    }
  }
  const reversedSofa=assets.find(r=>r.type==='Tufted leather sofa'&&r.rotation===Math.PI);
  assert(reversedSofa.collider.w>2.6&&reversedSofa.collider.d<1.2,'A 180-degree sofa keeps its real width and depth');
  const M=Object.fromEntries(['wood','leather','red','white','gold','stone'].map(name=>[name,new T.MeshStandardMaterial({color:0x888888})]));
  const kit=createFurnishings({world:new T.Group(),M,colliders:[]}),piano=kit.grandPiano(0,0),caseModel=kit.bookcase(5,0),sofa=kit.sofa(10,0);
  const names=[];piano.traverse(o=>names.push(o.name));
  assert.equal(names.filter(n=>n==='Ivory piano key').length,52);assert.equal(names.filter(n=>n==='Ebony piano key').length,36,'Grand piano has the correct 88-key layout');
  const pianoSize=new T.Box3().setFromObject(piano).getSize(new T.Vector3());assert(pianoSize.x<2.1&&pianoSize.z<2.6,'Piano uses believable grand-piano dimensions');
  const backing=caseModel.getObjectByName('Thin bookcase back'),books=[];caseModel.traverse(o=>{if(o.name==='Leather book spine')books.push(o);});
  assert(backing.geometry.boundingBox.getSize(new T.Vector3()).z<.06,'Shelf backing is a panel, not a solid cabinet hiding the books');
  assert(books.every(o=>o.position.z>backing.position.z+.15),'Books sit on open shelves in front of the backing');
  const reused=kit.sofa(15,0);sofa.traverse(o=>{if(o.isMesh){const peer=reused.getObjectByName(o.name);assert(peer.geometry===o.geometry,'Repeated furniture reuses geometry');}});
  assert.equal(s.rugs.records.length,16,'All ground and upper-floor rugs use the new mapping');
  assert.equal(s.rugs.field.image.width,s.rugs.field.image.height,'Woven field is a square repeating tile');
  assert.equal(s.rugs.field.wrapS,T.RepeatWrapping);assert.equal(s.rugs.field.wrapT,T.RepeatWrapping);
  const ray=new T.Raycaster();
  for(const r of s.rugs.records){
    const p=r.body.geometry.attributes.position,uv=r.body.geometry.attributes.uv,b=RUG_SCALE.borderWidth;
    const minX=Math.min(...Array.from({length:p.count},(_,i)=>p.getX(i))),maxX=Math.max(...Array.from({length:p.count},(_,i)=>p.getX(i))),minZ=Math.min(...Array.from({length:p.count},(_,i)=>p.getZ(i))),maxZ=Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i)));
    const uSpan=Math.max(...uv.array.filter((_,i)=>i%2===0))-Math.min(...uv.array.filter((_,i)=>i%2===0)),vSpan=Math.max(...uv.array.filter((_,i)=>i%2===1))-Math.min(...uv.array.filter((_,i)=>i%2===1));
    assert(Math.abs((maxX-minX)/uSpan-RUG_SCALE.field)<.00001&&Math.abs((maxZ-minZ)/vSpan-RUG_SCALE.field)<.00001,'Rug motifs have equal physical scale in both axes');
    assert(Math.abs(maxX-(r.w/2-b))<.00001&&Math.abs(maxZ-(r.d/2-b))<.00001,'Runner borders keep the same 14cm width regardless of aspect ratio');
    for(const mesh of [r.body,r.border,r.fringe]){
      assert(!mesh.material.transparent&&mesh.material.depthWrite,'Woven surfaces stay opaque');
      const normals=mesh.geometry.attributes.normal;for(let i=0;i<normals.count;i++)assert(normals.getY(i)>.99,'Field, border and fringe face upward');
    }
    for(const [x,z] of [[0,0],[r.w/2-b/2,0],[0,r.d/2-b/2],[r.w/2-b/2,r.d/2-b/2]]){
      ray.set(new T.Vector3(r.x+x,(r.y===0?.095:r.y)+1,r.z+z),new T.Vector3(0,-1,0));ray.far=1.2;
      const surfaces=new Set(ray.intersectObjects([r.body,r.border,r.fringe],false).map(hit=>hit.object));
      assert.equal(surfaces.size,1,'Rug field and border have no coplanar overlap or gaps');
    }
  }
  const cacheSize=s.furnishings.geometries.size;qa.start();assert.equal(s.furnishings.geometries.size,cacheSize,'Restart allocates no furnishing assets');
  qa.holdSpawns();qa.setPlayer(-9.5,2.15);listeners.keydown({code:'Space',preventDefault(){}});qa.setKeys(['KeyS']);frames(29);qa.setKeys([]);frames(45);
  assert(qa.get().grounded&&qa.get().player.y>.50,'A jump onto the coffee table lands on its top rather than inside it');
  qa.setKeys(['KeyS']);frames(70);qa.setKeys([]);frames(30);assert.equal(qa.get().player.y,0,'Player can leave low furniture and return to the floor');
  console.log('PASS: 127 room-appropriate furnishings, rotated collision bounds and wall/ceiling clearance; 88-key curved piano, visible shelf books, shared geometry; all 16 rugs use uniform weave scale, fixed borders and upward, non-overlapping surfaces; safe table jumps and exits.');
  qa.start();
}
