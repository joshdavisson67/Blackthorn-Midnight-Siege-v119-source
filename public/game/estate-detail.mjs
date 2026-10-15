import * as T from './three.module.js';
import {columnSurfaceGeometry} from './column-surfaces.mjs?v=93';
import {scatterGrass,crossedGrassGeometry} from './grounds.mjs?v=116';
export function addEstateDetail({scene,world,M,box,mesh,mistTex,fire,colliders,interactables}){let rseed=34213;const r=()=>{rseed=(rseed*1664525+1013904223)>>>0;return rseed/4294967296;};const mid=(a,b)=>a+r()*(b-a);
// Curved stonework and coffered ceilings catch both moonlight and candlelight.
const profile=[[.4,0],[.4,.12],[.34,.16],[.34,.3],[.29,.38],[.25,.6],[.25,5.9],[.29,6.1],[.4,6.25],[.4,6.42]].map(([radius,y])=>new T.Vector2(radius,y));
const columnGeo=columnSurfaceGeometry(new T.LatheGeometry(profile,32),M.stone),collarGeo=columnSurfaceGeometry(new T.TorusGeometry(.3,.028,8,32),M.stone);
for(const x of [-4.5,4.5])for(const z of [-8,7]){if(x<0&&z<0)continue;mesh(columnGeo,M.stone,[x,0,z]);for(const y of [.38,6.17]){const ring=mesh(collarGeo,M.stone,[x,y,z]);ring.rotation.x=Math.PI/2;}}
for(const x of [-2.7,0,2.7])for(const z of [-8,-4,0,4,8]){const coffer=box(x,6.72,z,2.45,.04,3.45,M.wood);coffer.userData.groundCeilingDetail=true;for(const xx of [-1.28,1.28])box(x+xx,6.61,z,.09,.13,3.7,M.gold);for(const zz of [-1.8,1.8])box(x,6.61,z+zz,2.6,.13,.09,M.gold);}
for(const side of [-1,1]){const arch=mesh(new T.TorusGeometry(side<0?2.4:3.3,.11,12,56,Math.PI),M.stone,[side*5.6,3.08,side<0?1.1:0]);arch.rotation.y=Math.PI/2;}
const entry=mesh(new T.TorusGeometry(3.4,.14,12,56,Math.PI),M.stone,[0,3.5,13.35]);
for(const x of [-10,-7,7,10]){const a=mesh(new T.TorusGeometry(.79,.065,8,32,Math.PI),M.stone,[x,4.92,12.48]);for(const sx of [-1,1])box(x+sx*.79,3.45,12.46,.095,3.0,.12,M.stone);}
for(const x of [-12.2,-5.3,5.3,12.2])for(let y=1;y<6.6;y+=1.1)box(x,y,12.48,.7,.075,.075,M.stone);
// Rain-darkened curbs define the main path; the lawns stay clear of loose paving.
for(const side of [-1,1])for(let z=14;z<28;z+=1.2)box(side*3.65,.06,z,.35,.17,1.1,M.wetStone);
// Crossed, alpha-cut foliage is instanced so it adds density without hundreds of draws.
const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.clearRect(0,0,256,256);for(let i=0;i<22;i++){const x=mid(20,236),height=mid(70,230);g.fillStyle=i%2?'#46583b':'#687247';g.beginPath();g.moveTo(x-4,256);g.quadraticCurveTo(x+mid(-45,45),256-height*.5,x+mid(-50,50),256-height);g.quadraticCurveTo(x+3,256-height*.5,x+4,256);g.fill();}
const grassTex=new T.CanvasTexture(c);grassTex.colorSpace=T.SRGBColorSpace;grassTex.anisotropy=8;
const grassMat=new T.MeshStandardMaterial({map:grassTex,color:0xc5cea8,roughness:1,side:T.DoubleSide,alphaTest:.35,alphaToCoverage:true});
const occupied=(x,z)=>colliders.some(c=>Math.abs(x-c.x)<c.w/2+.5&&Math.abs(z-c.z)<c.d/2+.5)||interactables.some(s=>Math.hypot(x-s.x,z-s.z)<1.25);
const grassPositions=scatterGrass(r,900,occupied);
const grass=new T.InstancedMesh(crossedGrassGeometry(),grassMat,grassPositions.length);grass.name='estate-grass-tufts';
const transform=new T.Object3D();
for(const [i,{x,z}] of grassPositions.entries()){
  transform.position.set(x,-.065,z);transform.rotation.set(0,mid(0,Math.PI*2),0);
  const size=mid(.55,1);transform.scale.set(size,size,1);transform.updateMatrix();grass.setMatrixAt(i,transform.matrix);
}
grass.instanceMatrix.needsUpdate=true;grass.receiveShadow=true;grass.computeBoundingBox();grass.computeBoundingSphere();world.add(grass);
// Small dust motes replace broad transparent cards that looked like ghosted surfaces.
const dustGeo=new T.BufferGeometry(),dustPos=new Float32Array(420*3);for(let i=0;i<dustPos.length;i+=3){dustPos[i]=mid(-40,40);dustPos[i+1]=mid(.4,6.4);dustPos[i+2]=mid(-82,10);}dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xdac8a0,map:mistTex,size:.04,transparent:true,opacity:.18,depthWrite:false}));world.add(dust);
// Flame silhouettes, rather than an opaque stretched sphere.
fire.visible=false;const flameMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform float time;float noise(vec2 p){return fract(sin(dot(p,vec2(17.13,91.71)))*43758.5453);}void main(){float wobble=sin(v.y*13.-time*7.)*.055+sin(v.y*24.+time*4.)*.025;float width=(1.-v.y)*.43;float edge=1.-smoothstep(width*.2,width+.035,abs(v.x-.5+wobble));float tongues=.65+.35*sin(v.x*24.+time*5.+sin(v.y*11.));float alpha=edge*(1.-smoothstep(tongues-.08,tongues+.15,v.y));vec3 color=mix(vec3(2.8,1.8,.4),vec3(1.8,.24,.015),v.y);gl_FragColor=vec4(color,alpha*.75);}`});for(let i=0;i<1;i++){const flame=mesh(new T.PlaneGeometry(1.5,1.15),flameMat,[12.85-i*.018,.92,-7],[1,1,1]);flame.rotation.y=-Math.PI/2+i*.13;flame.userData.dynamic=true;flame.castShadow=false;flame.receiveShadow=false;}
return {update(t,dt){flameMat.uniforms.time.value=t;for(let i=0;i<dustPos.length;i+=3){dustPos[i]+=(Math.sin(t*.3+i)*.016)*dt;dustPos[i+1]+=Math.cos(t*.4+i)*.008*dt;}dustGeo.attributes.position.needsUpdate=true;},dust,grass};}
