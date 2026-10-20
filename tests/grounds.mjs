import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {GRAVEYARD} from '../public/game/graveyard-layout.mjs';
import {estateLocation} from '../public/game/estate-layout.mjs';
import {GRASS_TUFTS,lawnCharacter,lawnTint,LAWN} from '../public/game/grounds.mjs';

export function verifyGrounds(qa){
  const {world}=qa.get();world.updateMatrixWorld(true);
  const turf=[],paving=[],headstones=[];
  world.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh)return;
    if(mesh.material.name==='estate-grass')turf.push(mesh);
    if(mesh.material.name==='wet-stone')paving.push(mesh);
    if(mesh.material.name==='cemetery-headstone')headstones.push(mesh);
  });
  assert(turf.length&&headstones.length);
  const ray=new T.Raycaster(),direction=new T.Vector3(0,-1,0);
  const groundAt=(x,z)=>{
    ray.set(new T.Vector3(x,.2,z),direction);ray.far=1;
    return ray.intersectObjects([...turf,...paving]).find(h=>h.face.normal.y>.9);
  };
  const lawnSamples=[[-20,20],[20,20],[-44,-20],[44,-20],[-30,-94],[30,-94],[0,-94],[0,-100],[60,-8.5],[78,10],[55.5,-1],[56.5,-1]];
  for(const [x,z] of lawnSamples){
    const hit=groundAt(x,z);assert.equal(hit?.object.material.name,'estate-grass',`Grass surface at ${x},${z}`);
    assert(Math.abs(hit.point.y+.07)<.001,'Grass stays at the existing walking surface');
    assert(Math.abs(hit.uv.x-x/3.2)<.0001&&Math.abs(hit.uv.y-z/3.2)<.0001,'Terrain UVs join at a consistent world scale');
  }
  for(const [x,z] of [[0,21],[-47,-36],[47,-36],[-20,-90],[20,-90],[51,6],[62,6],[70,-4]]){
    const hit=groundAt(x,z);assert.equal(hit?.object.material.name,'wet-stone',`Clear paved path at ${x},${z}`);
    assert(hit.point.y>=.039,'Path remains visibly above the turf');
  }
  ray.set(new T.Vector3(CELLAR.x,.2,(CELLAR.topZ+CELLAR.bottomZ)/2),direction);ray.far=1;
  assert.equal(ray.intersectObjects(turf).length,0,'Grass must not fill the storm cellar stair opening');
  const material=turf[0].material;
  assert(material.map.isCanvasTexture&&material.map.image.width===512);
  assert.equal(material.map.minFilter,T.LinearMipmapLinearFilter);assert(material.map.anisotropy>=8);assert.equal(material.roughness,1);

  const grass=world.getObjectByName('estate-grass-tufts'),matrix=new T.Matrix4(),root=new T.Vector3();
  assert(grass.isInstancedMesh&&grass.count===GRASS_TUFTS,'Foliage remains one fixed-size instanced draw');
  const coverage={front:0,west:0,east:0,north:0,cemetery:0};
  for(let i=0;i<grass.count;i++){
    grass.getMatrixAt(i,matrix);root.setFromMatrixPosition(matrix);
    assert.equal(groundAt(root.x,root.z)?.object.material.name,'estate-grass','Tufts must stand on real turf, clear of paving and grave slabs');
    assert(root.y<0&&root.y>-.07,'Tufts are rooted in the ground');
    if(root.x>54)coverage.cemetery++;else if(root.z>12)coverage.front++;else if(root.z<-84)coverage.north++;else if(root.x<0)coverage.west++;else coverage.east++;
  }
  for(const [region,count] of Object.entries(coverage))assert(count>20,`${region} lawn should have grass coverage`);

  // Lawn character: the turf is tinted by worn, dry, mossy and shaded patches
  // rather than one flat green, and the tufts vary in height and colour.
  const tints=[];for(let x=LAWN.minX;x<=LAWN.maxX;x+=3)for(let z=LAWN.minZ;z<=LAWN.maxZ;z+=3){const t=lawnTint(lawnCharacter(x,z));tints.push(t);assert(t.every(v=>v>0&&v<=LAWN.range),'Lawn tint stays inside the encoded range');}
  const greens=tints.map(t=>t[1]);assert(Math.max(...greens)-Math.min(...greens)>.45,'The lawn has visibly lighter and darker patches');
  assert(tints.some(t=>t[0]>t[1]*.95)&&tints.some(t=>t[1]>t[0]*1.15),'Straw-coloured dry patches sit beside lush green ones');
  const tree={x:-20,z:20},under=lawnCharacter(tree.x+1,tree.z,[tree]),open=lawnCharacter(tree.x+1,tree.z,[]);
  assert(under.shade>open.shade+.3,'Tree canopies shade the turf beneath them');
  assert(lawnCharacter(0,19.4).mud>lawnCharacter(-20,26).mud,'Turf wears thin beside the paths');
  const heights=[],shades=new Set();
  for(let i=0;i<grass.count;i+=37){grass.getMatrixAt(i,matrix);heights.push(new T.Vector3().setFromMatrixScale(matrix).y);const c=new T.Color();grass.getColorAt(i,c);shades.add(c.getHexString());}
  assert(Math.max(...heights)>Math.min(...heights)*1.8,'Tufts range from short to long');assert(shades.size>=4,'Tufts are not all one colour');
  assert(grass.material.customProgramCacheKey().includes('tufts')&&material.customProgramCacheKey().includes('lawn'),'Wind sway and lawn tint shaders are installed');
  for(const headstone of headstones){
    const bounds=new T.Box3().setFromObject(headstone);
    assert(bounds.min.x>=GRAVEYARD.minX&&bounds.max.x<=GRAVEYARD.maxX&&bounds.min.z>=GRAVEYARD.minZ&&bounds.max.z<=GRAVEYARD.maxZ,'Every rendered headstone remains within the cemetery fence');
  }
  assert.equal(qa.get().graveyard.graves.length,14);
  assert.equal(estateLocation(47,-20),'EAST GROUNDS');assert.equal(estateLocation(60,-20),'FAMILY CEMETERY');
  console.log(`PASS: textured grass across every lawn, continuous ground UVs, clear stone paths, lawn wear/dry/moss/shade patches, ${GRASS_TUFTS} varied, correctly rooted tufts, cellar opening and cemetery-only headstones.`);
}
