import * as T from './three.module.js';
import {MANSION,ESTATE_BOUNDS} from './estate-layout.mjs?v=28';
import {GRAVEYARD,MAUSOLEUM,GRAVE_PLOTS} from './graveyard-layout.mjs?v=28';
import {CELLAR} from './cellar-layout.mjs?v=28';
import {SHED,SHED_PATH} from './shed-layout.mjs?v=76';
import {EXTERIOR_STAIRS} from './vertical.mjs?v=131';

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

// ---- Lawn character (v126) ------------------------------------------------
// One baked, estate-wide map gives the lawn its history: lush and dry patches,
// mud where feet leave the paths, damp moss along walls and the house, and bare
// ground under the trees. The same field decides where tufts grow and how.
export const LAWN=Object.freeze({minX:-56,maxX:82,minZ:-112,maxZ:32,range:1.7});
export const GRASS_TUFTS=8000;
const fract=v=>v-Math.floor(v);
function lattice(x,z){return fract(Math.sin(x*127.1+z*311.7)*43758.5453);}
function valueNoise(x,z){
  const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
  const a=lattice(xi,zi),b=lattice(xi+1,zi),c=lattice(xi,zi+1),d=lattice(xi+1,zi+1);
  return a+(b-a)*sx+(c-a)*sz+(a-b-c+d)*sx*sz;
}
function fbm(x,z){return .55*valueNoise(x,z)+.3*valueNoise(x*2.03+17,z*2.03-9)+.15*valueNoise(x*4.1-5,z*4.1+23);}
const smooth=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
// Paths and grave slabs as centre/half-extent rectangles, built once.
let wornEdges=null;
function pathDistance(x,z){
  wornEdges??=[...stonePaths.map(p=>[p.x,p.z,p.w/2,p.d/2]),...GRAVE_PLOTS.map(p=>[p.x,p.z,.625,1.125])];
  let best=Infinity;
  for(const [cx,cz,hx,hz] of wornEdges){const dx=Math.max(Math.abs(x-cx)-hx,0),dz=Math.max(Math.abs(z-cz)-hz,0),q=dx*dx+dz*dz;if(q<best)best=q;}
  return Math.sqrt(best);
}
function wallDistance(x,z){
  // Outside the mansion footprint, to its nearest face.
  const inX=x>=MANSION.minX&&x<=MANSION.maxX,inZ=z>=MANSION.minZ&&z<=MANSION.maxZ;
  const house=inX&&inZ?0:Math.hypot(Math.max(MANSION.minX-x,0,x-MANSION.maxX),Math.max(MANSION.minZ-z,0,z-MANSION.maxZ));
  const boundary=Math.min(Math.abs(x+54),z<=18&&z>=-24&&x>54?Infinity:Math.abs(x-54),Math.abs(z-29.6),Math.abs(z-ESTATE_BOUNDS.minZ),x>54?Math.min(Math.abs(x-GRAVEYARD.maxX),Math.abs(z-GRAVEYARD.minZ),Math.abs(z-GRAVEYARD.maxZ)):Infinity);
  return Math.min(house,boundary);
}
export function lawnCharacter(x,z,trees=[]){
  const broad=fbm(x*.045,z*.045),mid=fbm(x*.13+31,z*.13-7),fine=valueNoise(x*.9,z*.9);
  const path=pathDistance(x,z),wall=wallDistance(x,z);
  let tree=Infinity;for(const t of trees)tree=Math.min(tree,Math.hypot(x-t.x,z-t.z));
  const cemetery=x>GRAVEYARD.minX?1:0;
  return {
    dry:smooth(.52,.74,broad*.7+mid*.3)*(1-.6*cemetery),
    lush:smooth(.48,.28,broad)+.35*cemetery,
    mud:(1-smooth(.15,1.3,path))*(.5+.5*mid),
    moss:1-smooth(.3,2.4,wall),
    shade:1-smooth(.7,2.8,tree),
    fine,
    edge:Math.max(1-smooth(.2,2.2,path),1-smooth(.2,2.6,wall),1-smooth(.4,2.4,tree))
  };
}
// Colour multipliers, blended in order; values are later scaled by 1/range.
const TINTS={lush:[.70,.88,.68],dry:[1.48,1.28,.66],mud:[.60,.46,.32],moss:[.48,.66,.50],shade:[.48,.45,.36]};
export function lawnTint(c){
  let r=1,g=1,b=1;
  const mix=(t,w)=>{w=Math.min(1,Math.max(0,w));r+=(t[0]-r)*w;g+=(t[1]-g)*w;b+=(t[2]-b)*w;};
  mix(TINTS.lush,c.lush*.8);mix(TINTS.dry,c.dry*.9);mix(TINTS.moss,c.moss*.85);mix(TINTS.shade,c.shade*.8);mix(TINTS.mud,c.mud*.9);
  const v=.85+.3*c.fine;return [r*v,g*v,b*v];
}
function neutralLawnMap(){
  const v=Math.round(255/LAWN.range),t=new T.DataTexture(new Uint8Array([v,v,v,255]),1,1);t.name='estate-lawn-neutral';t.needsUpdate=true;return t;
}
// Bake the estate-wide map. Returns null where no 2D canvas is available.
export function bakeLawnMap(trees=[],size=512){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext?.('2d');if(!ctx||typeof ctx.createImageData!=='function')return null;
  const img=ctx.createImageData(size,size),px=img?.data;if(!px||px.length<size*size*4)return null;
  const w=LAWN.maxX-LAWN.minX,d=LAWN.maxZ-LAWN.minZ,none=[];
  // Trees only shade within 3 m, so each texel row checks a short list.
  for(let j=0;j<size;j++){
    const z=LAWN.minZ+(j+.5)/size*d,row=trees.filter(t=>Math.abs(t.z-z)<3);
    for(let i=0;i<size;i++){
    const x=LAWN.minX+(i+.5)/size*w,near=row.length?row.filter(t=>Math.abs(t.x-x)<3):none,[r,g,b]=lawnTint(lawnCharacter(x,z,near)),k=(j*size+i)*4;
    px[k]=Math.min(255,Math.round(r/LAWN.range*255));px[k+1]=Math.min(255,Math.round(g/LAWN.range*255));px[k+2]=Math.min(255,Math.round(b/LAWN.range*255));px[k+3]=255;
  }}
  ctx.putImageData(img,0,0);
  const t=new T.CanvasTexture(canvas);t.name='estate-lawn-character';t.colorSpace=T.NoColorSpace;t.flipY=false;
  t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=8;
  return t;
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
    ctx.fillStyle=`rgb(${Math.round(60+variation*10+grain)},${Math.round(76+variation*13+grain)},${Math.round(41+variation*6+grain*.5)})`;
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
  const material=new T.MeshStandardMaterial({name:'estate-grass',color:0xcdd6c4,map,bumpMap:map,bumpScale:.012,roughness:1});
  // The baked lawn character map tints the tile by world position, so the
  // repeating turf picks up estate-scale patches, worn edges and damp margins.
  material.userData.lawnMap=neutralLawnMap();
  material.onBeforeCompile=shader=>{
    shader.uniforms??={};shader.uniforms.lawnMap={value:material.userData.lawnMap};
    shader.uniforms.lawnRect={value:new T.Vector4(LAWN.minX,LAWN.minZ,LAWN.maxX-LAWN.minX,LAWN.maxZ-LAWN.minZ)};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vLawnXZ;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvLawnXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vLawnXZ;uniform sampler2D lawnMap;uniform vec4 lawnRect;')
      .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=texture2D(lawnMap,(vLawnXZ-lawnRect.xy)/lawnRect.zw).rgb*LAWN_RANGE;')
      .replace('#include <common>','#include <common>\n#define LAWN_RANGE '+LAWN.range.toFixed(2));
  };
  material.customProgramCacheKey=()=>'estate-lawn-126';
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
