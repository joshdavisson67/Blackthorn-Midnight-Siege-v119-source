import * as T from './three.module.js';
import {MANSION,ESTATE_BOUNDS} from './estate-layout.mjs?v=28';
import {GRAVEYARD,MAUSOLEUM,GRAVE_PLOTS} from './graveyard-layout.mjs?v=28';
import {CELLAR} from './cellar-layout.mjs?v=28';
import {SHED,SHED_PATH} from './shed-layout.mjs?v=76';
import {EXTERIOR_STAIRS} from './vertical.mjs?v=116';

// Shared by the paving meshes and foliage placement so grass cannot cover a path.
export const ESTATE_PATHS=[
  {x:0,z:21,w:7,d:18,y:-.01},
  ...[-47,47].map(x=>({x,z:-39,w:3,d:102,y:-.01})),
  {x:0,z:-88.5,w:98,d:5,y:-.01},
  {x:0,z:-85.5,w:6,d:3,y:-.01},
  {x:CELLAR.x,z:CELLAR.topZ-3.5,w:5,d:6,y:-.01},
  SHED_PATH,
];
// Keep the logical path continuous for foliage and floor effects, but remove
// actual stone boxes wherever a metal stair apron occupies the same surface.
function withoutApron(path,apron){
  const x0=path.x-path.w/2,x1=path.x+path.w/2,z0=path.z-path.d/2,z1=path.z+path.d/2;
  const left=Math.max(x0,apron.x-apron.w/2),right=Math.min(x1,apron.x+apron.w/2);
  const back=Math.max(z0,apron.z-apron.d/2),front=Math.min(z1,apron.z+apron.d/2);
  if(left>=right||back>=front)return [path];
  const pieces=[];
  function add(a,b,c,d){if(b-a>1e-6&&d-c>1e-6)pieces.push({...path,x:(a+b)/2,z:(c+d)/2,w:b-a,d:d-c});}
  add(x0,left,z0,z1);add(right,x1,z0,z1);add(left,right,z0,back);add(left,right,front,z1);
  return pieces;
}
export const ESTATE_PAVING=EXTERIOR_STAIRS.reduce((paths,{apron})=>paths.flatMap(path=>withoutApron(path,apron)),ESTATE_PATHS);
export const CEMETERY_PATHS=[
  {x:59,z:6,w:24,d:3.4,y:.025},
  {x:70,z:-1.5,w:3.4,d:18.4,y:.025},
];
const within=(x,z,rect,r=0)=>Math.abs(x-rect.x)<=rect.w/2+r&&Math.abs(z-rect.z)<=rect.d/2+r;
const stonePaths=[...ESTATE_PATHS,...CEMETERY_PATHS];
export function isStonePath(x,z,r=0){return stonePaths.some(path=>within(x,z,path,r));}
export function isLawn(x,z,r=.45){
  const estate=x>=-53.4+r&&x<=53.4-r&&z>=ESTATE_BOUNDS.minZ+r&&z<=29.4-r;
  const cemetery=x>=GRAVEYARD.minX+r&&x<=GRAVEYARD.maxX-r&&z>=GRAVEYARD.minZ+r&&z<=GRAVEYARD.maxZ-r;
  if(!estate&&!cemetery)return false;
  if(x>=MANSION.minX-r&&x<=MANSION.maxX+r&&z>=MANSION.minZ-r&&z<=MANSION.maxZ+r)return false;
  if(isStonePath(x,z,r+.3))return false;
  if(EXTERIOR_STAIRS.some(({apron})=>within(x,z,apron,r+.3)))return false;
  if(within(x,z,{x:CELLAR.x,z:(CELLAR.topZ+CELLAR.bottomZ)/2,w:CELLAR.stairWidth,d:CELLAR.bottomZ-CELLAR.topZ},r))return false;
  if(within(x,z,{x:MAUSOLEUM.x,z:MAUSOLEUM.z,w:MAUSOLEUM.w+.9,d:MAUSOLEUM.d+1.5},r))return false;
  if(within(x,z,SHED,r+.35))return false;
  return !GRAVE_PLOTS.some(plot=>within(x,z,{...plot,w:1.35,d:2.4},r));
}

export function createGrassMaterial(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');let seed=87123;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Periodic meadow colors tile without a seam or baked directional shadows.
  for(let z=0;z<512;z+=4)for(let x=0;x<512;x+=4){
    const u=x/512*Math.PI*2,v=z/512*Math.PI*2;
    const variation=Math.sin(u+Math.sin(v))*.5+Math.cos(v*2-u)*.3+Math.sin(u*3+v*2)*.2;
    const grain=(random()-.5)*8;
    ctx.fillStyle=`rgb(${Math.round(65+variation*10+grain)},${Math.round(86+variation*13+grain)},${Math.round(43+variation*6+grain*.5)})`;
    ctx.fillRect(x,z,4,4);
  }
  // Short overlapping blades provide readable turf rather than a flat green slab.
  ctx.lineWidth=.9;ctx.lineCap='round';
  for(let i=0;i<12000;i++){
    const x=random()*512,z=random()*512,angle=random()*Math.PI*2,length=2+random()*7;
    ctx.strokeStyle=i%3===0?'rgba(142,157,81,.22)':i%3===1?'rgba(31,58,25,.3)':'rgba(107,133,63,.3)';
    for(const dx of [-512,0,512])for(const dz of [-512,0,512]){
      if(x+dx< -10||x+dx>522||z+dz< -10||z+dz>522)continue;
      ctx.beginPath();ctx.moveTo(x+dx,z+dz);ctx.lineTo(x+dx+Math.cos(angle)*length,z+dz+Math.sin(angle)*length);ctx.stroke();
    }
  }
  const map=new T.CanvasTexture(canvas);map.name='estate-grass';map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=16;
  map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;
  map.userData.tileMeters=3.2;
  const material=new T.MeshStandardMaterial({name:'estate-grass',color:0xd4deca,map,bumpMap:map,bumpScale:.012,roughness:1});
  return material;
}

export function alignGrassPatch(mesh){
  // Adjacent terrain pieces share world coordinates, including the cemetery edge.
  const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,tile=mesh.material.map.userData.tileMeters;
  for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)*mesh.scale.x+mesh.position.x)/tile,(p.getZ(i)*mesh.scale.z+mesh.position.z)/tile);
  uv.needsUpdate=true;return mesh;
}

export function scatterGrass(random,count=900,blocked=()=>false){
  const positions=[];
  for(let attempt=0;positions.length<count&&attempt<count*80;attempt++){
    const x=-53.4+random()*133.4,z=ESTATE_BOUNDS.minZ+random()*(29.4-ESTATE_BOUNDS.minZ);
    if(isLawn(x,z)&&!blocked(x,z))positions.push({x,z});
  }
  return positions;
}

export function crossedGrassGeometry(){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([-.35,0,0,.35,0,0,.35,.4,0,-.35,.4,0,0,0,-.35,0,0,.35,0,.4,.35,0,.4,-.35],3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
  geometry.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);geometry.computeVertexNormals();return geometry;
}
