import * as T from './three.module.js';
import {createOpticReticle} from './reticles.mjs?v=116';
import {weaponSurfaceGeometry} from './weapon-surfaces.mjs?v=87';
export const VISUAL_BRIGHTNESS=1.15;
export function stabilizeTexture(t){t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=16;return t;}
export const TILE_METERS={wood:1.6,floor:1.6,stone:1.8,plaster:2.4,brick:1.8,cloth:.65,skin:.6,metal:.8,roof:1.8};
export async function loadEstateTextures(maps){for(const [name,t] of Object.entries(maps)){t.name=name;t.userData.tileMeters=TILE_METERS[name];stabilizeTexture(t);}
if(typeof window.Image!=='function')return;
const loader=new T.TextureLoader();const results=await Promise.allSettled([loader.loadAsync('./assets/limestone-v1.png'),loader.loadAsync('./assets/oak-v1.png')]);
function setup(t,name){t.name=name;t.wrapS=t.wrapT=T.MirroredRepeatWrapping;t.repeat.set(1,1);t.colorSpace=T.SRGBColorSpace;t.anisotropy=16;t.userData.tileMeters=TILE_METERS[name];return stabilizeTexture(t);}
if(results[0].status==='fulfilled'){maps.stone=setup(results[0].value,'stone');maps.brick=setup(results[0].value.clone(),'brick');}
if(results[1].status==='fulfilled'){maps.floor=setup(results[1].value,'floor');maps.wood=setup(results[1].value.clone(),'wood');}
}
// Surface finish maps (v125), derived once from a loaded photo texture so the
// finish follows the actual grain and joints instead of one uniform gloss.
// `shade(dark,wear)` receives the normalised darkness of each texel (0 light,
// 1 dark) and a soft board-scale wear field, and returns [r,g] in 0..1.
// Returns null where no 2D canvas or image is available (tests, failed loads).
export function finishMapFrom(source,shade,size=512){
  const image=source?.image;
  if(!image||typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext?.('2d',{willReadFrequently:true});if(!ctx||typeof ctx.getImageData!=='function')return null;
  try{ctx.drawImage(image,0,0,size,size);}catch{return null;}
  let data;try{data=ctx.getImageData(0,0,size,size);}catch{return null;}
  const px=data?.data;if(!px||px.length<size*size*4)return null;const lum=new Float32Array(size*size);
  for(let i=0;i<lum.length;i++)lum[i]=(.2126*px[i*4]+.7152*px[i*4+1]+.0722*px[i*4+2])/255;
  // Robust range: ignore the darkest and lightest 2% so a few texels cannot flatten the map.
  const sorted=Float32Array.from(lum).sort(),lo=sorted[Math.floor(lum.length*.02)],hi=sorted[Math.floor(lum.length*.98)],span=Math.max(1e-3,hi-lo);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,dark=Math.min(1,Math.max(0,(hi-lum[i])/span));
    // Smooth, tile-safe wear: whole sine periods across the texture.
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2,wear=.5+.25*Math.sin(u*2+Math.sin(v*3)*.8)+.25*Math.sin(v*5+u);
    const [r,g]=shade(dark,wear);px[i*4]=Math.round(r*255);px[i*4+1]=Math.round(g*255);px[i*4+2]=0;px[i*4+3]=255;
  }
  ctx.putImageData(data,0,0);
  const t=new T.CanvasTexture(canvas);t.name=source.name+'-finish';t.colorSpace=T.NoColorSpace;
  t.wrapS=source.wrapS;t.wrapT=source.wrapT;t.repeat.copy(source.repeat);t.userData.tileMeters=source.userData.tileMeters;
  return stabilizeTexture(t);
}
// Flashlight beam (v125). A real torch has a bright core, a softer corona
// with a faint reflector ring, and a dim spill that fades to nothing, rather
// than a uniformly lit disc. Projected as the spot light's cookie; texture
// radius 0.5 is the cone edge. Returns null without a 2D canvas (tests).
export const BEAM=Object.freeze({core:.16,corona:.42,spill:.10,ring:.46,fadeStart:.80});
export function beamProfile(r){
  if(r>=1)return 0;
  const edge=r<=BEAM.fadeStart?1:1-((r-BEAM.fadeStart)/(1-BEAM.fadeStart))**2*(3-2*(r-BEAM.fadeStart)/(1-BEAM.fadeStart));
  const glow=BEAM.spill+.55*Math.exp(-((r/BEAM.corona)**2))+.35*Math.exp(-((r/BEAM.core)**2))+.05*Math.exp(-(((r-BEAM.ring)/.04)**2));
  return Math.min(1,glow)*edge;
}
export function flashlightBeamTexture(size=256){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext?.('2d');if(!ctx||typeof ctx.createImageData!=='function')return null;
  const img=ctx.createImageData(size,size),px=img?.data;if(!px||px.length<size*size*4)return null;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+.5)/size-.5,dy=(y+.5)/size-.5,a=Math.atan2(dy,dx);
    // A slightly irregular lens: three per-cent ripple around the rim.
    const r=Math.hypot(dx,dy)/.5*(1+.015*Math.sin(a*5)+.01*Math.sin(a*11+1.3)),v=Math.round(beamProfile(r)*255),i=(y*size+x)*4;
    px[i]=px[i+1]=px[i+2]=v;px[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  const t=new T.CanvasTexture(canvas);t.name='flashlight-beam';t.colorSpace=T.NoColorSpace;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
  return stabilizeTexture(t);
}

// Satin oak: grain and gaps are rougher than the board faces, worn patches dull.
export const OAK_FINISH=(dark,wear)=>{const r=.66+.22*dark+.08*wear;return [r,r];};
// Rain on limestone: water stands in joints and pits; faces stay mostly dry.
export const WET_STONE_FINISH=(dark,wear)=>{const wet=.12+.88*Math.pow(dark,1.6)*(.75+.25*wear);return [wet,1-.45*wet];};

export function tiledBox(base,material,w,h,d){const map=material.map,tile=map?.userData.tileMeters;if(!tile)return base;const geo=base.clone(),uv=geo.attributes.uv;const faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let face=0;face<6;face++)for(let k=0;k<4;k++){const i=face*4+k;uv.setXY(i,uv.getX(i)*faces[face][0]/tile/map.repeat.x,uv.getY(i)*faces[face][1]/tile/map.repeat.y);}return geo;}
// A small, soft ambient cube is filtered by Three once. Local shadowed lamps
// provide specular highlights; painted windows no longer reflect in every room.
export function ambientEnvironment(){
  const faces=[];
  for(let i=0;i<6;i++){
    const c=document.createElement('canvas');c.width=c.height=64;
    const x=c.getContext('2d'),bg=x.createLinearGradient(0,0,0,64);
    bg.addColorStop(0,i===2?'#647380':'#43515b');
    bg.addColorStop(.5,'#263238');bg.addColorStop(1,i===3?'#302a23':'#3d3830');
    x.fillStyle=bg;x.fillRect(0,0,64,64);faces.push(c);
  }
  const env=new T.CubeTexture(faces);env.name='soft-ambient-reflections';
  env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;return env;
}
export function roundedReceiver(w,h,d,r=.008){const shape=new T.Shape();const x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const geo=new T.ExtrudeGeometry(shape,{depth:Math.max(.001,d-r*2),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.35,bevelThickness:r});geo.translate(0,0,-d/2+r);geo.computeVertexNormals();return geo;}
const opticGeometries=new Map(),opticFinishes=new WeakMap();
function opticGeometry(key,build){if(!opticGeometries.has(key))opticGeometries.set(key,build());return opticGeometries.get(key);}
function opticMaterials(metal){
  if(opticFinishes.has(metal))return opticFinishes.get(metal);
  const housing=metal.clone();housing.color.setHex(0x273138);housing.roughness=.5;housing.side=T.DoubleSide;
  const rubber=metal.clone();rubber.color.setHex(0x111b1f);rubber.metalness=.08;rubber.roughness=.88;rubber.map=rubber.roughnessMap=null;
  const glass=new T.MeshBasicMaterial({color:0xc7e5e4,transparent:true,opacity:.025,depthTest:true,depthWrite:false,side:T.DoubleSide});
  const scopeGlass=glass.clone();scopeGlass.opacity=.018;
  const fiber=housing.clone();fiber.color.setHex(0xa54233);fiber.metalness=.12;fiber.roughness=.7;
  const result={housing,rubber,glass,scopeGlass,fiber};opticFinishes.set(metal,result);return result;
}
function opticWindow(w,h,r,Path=T.Shape){
  const p=new Path(),x=-w/2,y=-h/2;
  p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);
  p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);p.closePath();return p;
}
export function makeOptic(parent,type,metal){
  const optic=new T.Group(),housing=new T.Group(),m=opticMaterials(metal),rifle=type==='rifle';
  optic.name='open-optic';optic.position.set(0,.185,-.07);housing.name='Optic housing';optic.add(housing);parent.add(optic);
  function add(geo,mat,x,y,z,name,target=housing,scale=null){const mesh=new T.Mesh(weaponSurfaceGeometry(geo,scale,mat.map?.userData.weaponSurface),mat);mesh.position.set(x,y,z);if(scale)mesh.scale.set(...scale);mesh.name=name;mesh.castShadow=mesh.receiveShadow=false;target.add(mesh);return mesh;}
  function box(x,y,z,w,h,d,mat,name){return add(opticGeometry('box',()=>new T.BoxGeometry(1,1,1)),mat,x,y,z,name,housing,[w,h,d]);}
  function cylinder(x,y,z,r,length,mat,name,axis='y'){
    const mesh=add(opticGeometry('cylinder',()=>new T.CylinderGeometry(1,1,1,20)),mat,x,y,z,name,housing,[r,length,r]);
    if(axis==='z')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.z=Math.PI/2;return mesh;
  }
  function rim(z,r,t,name){return add(opticGeometry(`rim:${r}:${t}`,()=>new T.TorusGeometry(r,t,8,40)),m.housing,0,0,z,name);}
  function tube(back,front,length,z,name){const mesh=add(opticGeometry(`tube:${back}:${front}:${length}`,()=>new T.CylinderGeometry(back,front,length,40,1,true)),m.housing,0,0,z,name);mesh.rotation.x=Math.PI/2;return mesh;}
  if(type==='bushmaster'){
    optic.name='10x precision scope';optic.position.set(0,.214,-.07);
    tube(.066,.045,.10,.04,'Ribbed scope eyepiece');tube(.045,.045,.19,-.105,'Long scope tube');tube(.045,.078,.10,-.25,'Flared objective bell');
    for(const [z,r] of [[.09,.066],[.065,.060],[.042,.053],[-.055,.045],[-.155,.045],[-.302,.078]])rim(z,r,.004,'Scope rim');
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,knurl=box(Math.sin(angle)*.062,Math.cos(angle)*.062,.070,.005,.006,.028,m.rubber,'Eyepiece grip flute');knurl.rotation.z=-angle;
    }
    for(const z of [-.05,-.043,-.036])rim(z,.045,.0015,'Magnification collar groove');
    cylinder(0,.058,-.11,.024,.028,m.housing,'Elevation turret');cylinder(0,.074,-.11,.025,.006,m.rubber,'Elevation turret cap');
    cylinder(.058,0,-.11,.024,.028,m.housing,'Windage turret','x');cylinder(.074,0,-.11,.025,.006,m.rubber,'Windage turret cap','x');
    const glass=add(opticGeometry('scope-glass',()=>new T.CircleGeometry(.062,48)),m.scopeGlass,0,0,.088,'clear-10x-scope-glass',optic);
    const reticle=createOpticReticle(type,.093);optic.add(...reticle.marks);
    return {group:optic,housing,glass,...reticle,height:.214,magnification:10};
  }
  if(type==='lmg'){
    optic.name='3x Warden combat scope';optic.position.set(0,.224,-.12);
    const combatRim=(z,r,t,name)=>add(opticGeometry(`combat-rim:${r}:${t}`,()=>new T.TorusGeometry(r,t,5,24)),m.housing,0,0,z,name);
    tube(.053,.053,.068,.020,'Combat scope eyepiece');
    tube(.053,.073,.190,-.109,'Tapered combat scope body');
    tube(.073,.079,.036,-.222,'Armored objective hood');
    combatRim(.055,.053,.003,'Sight lens retaining ring');
    for(const [z,r] of [[.039,.054],[-.204,.073],[-.240,.079]])combatRim(z,r,.0025,'Combat scope housing collar');
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,flute=box(Math.sin(a)*.054,Math.cos(a)*.054,.024,.004,.005,.025,m.rubber,'Combat eyepiece grip flute');flute.rotation.z=-a;
    }
    box(0,-.071,-.038,.079,.020,.156,m.housing,'Combat scope mounting shoe');
    cylinder(0,.068,-.072,.020,.024,m.housing,'Combat scope elevation turret');
    cylinder(0,.082,-.072,.021,.006,m.rubber,'Elevation cap');
    cylinder(.067,0,-.072,.020,.024,m.housing,'Combat scope windage turret','x');
    cylinder(.081,0,-.072,.021,.006,m.rubber,'Windage cap','x');
    // A thin red fiber strip provides the reference's familiar top silhouette.
    box(0,.075,-.141,.008,.004,.094,m.rubber,'Recessed fiber channel');
    box(0,.078,-.141,.003,.002,.086,m.fiber,'Combat scope fiber strip');
    const glass=add(opticGeometry('warden-scope-glass',()=>new T.CircleGeometry(.050,48)),m.scopeGlass,0,0,.052,'clear-3x-scope-glass',optic);
    const reticle=createOpticReticle(type,.058);optic.add(...reticle.marks);
    return {group:optic,housing,glass,...reticle,height:.224,magnification:3,viewFov:22,maskRadius:.040,maskZ:.063};
  }
  let glass;
  if(rifle){
    tube(.063,.063,.18,-.035,'Red-dot sight tube');for(const z of [-.125,.055])rim(z,.063,.007,'Sight lens retaining ring');
    cylinder(.078,0,-.03,.021,.021,m.housing,'Windage adjustment','x');cylinder(.091,0,-.03,.022,.006,m.rubber,'Windage cap','x');
    cylinder(0,.078,-.03,.022,.022,m.housing,'Elevation adjustment');cylinder(0,.091,-.03,.023,.006,m.rubber,'Elevation cap');
    for(const z of [-.094,-.078])rim(z,.064,.0015,'Sight tube seam');
    glass=add(opticGeometry('rifle-glass',()=>new T.CircleGeometry(.056,48)),m.glass,0,0,.050,'clear-optic-glass',optic);
  }else{
    // The lens and the actual aperture share one contour. This keeps the SMG
    // glass seated around its full edge instead of floating beside tilted posts.
    const [w,h,r]=type==='smg'?[.098,.084,.024]:type==='shotgun'?[.108,.086,.014]:[.110,.088,.009];
    const frame=opticGeometry(`reflex-frame:${type}`,()=>{
      const shape=opticWindow(w+.016,h+.016,r+.008);shape.holes.push(opticWindow(w,h,r,T.Path));
      const geo=new T.ExtrudeGeometry(shape,{depth:.038,steps:1,bevelEnabled:false,curveSegments:10});geo.translate(0,0,-.019);return geo;
    });
    add(frame,m.housing,0,0,.033,'Reflex sight hood');
    glass=add(opticGeometry(`reflex-glass:${type}`,()=>new T.ShapeGeometry(opticWindow(w,h,r),10)),m.glass,0,0,.044,'clear-optic-glass',optic);
    box(0,-h/2-.010,.013,w+.020,.014,.090,m.housing,'Reflex electronics base');
    box(w/2+.011,-.011,.020,.012,.037,.057,m.rubber,'Sight battery cover');
    for(const z of [.004,.036])cylinder(w/2+.018,-.010,z,.003,.003,m.housing,'Battery cover screw','x');
    for(const x of [-.014,.014])box(x,-h/2-.008,.060,.009,.008,.003,m.rubber,'Brightness button');
  }
  const reticle=createOpticReticle(type,.054);optic.add(...reticle.marks);
  return {group:optic,housing,glass,...reticle,height:.185};
}
// A single current-frame resolve: no history buffer, displaced color channels,
// ring-sampled bloom, animated noise, or depth halos around moving silhouettes.
export function makeFilmPass(width,height){
  const target=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:true,minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});
  target.samples=4;
  const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:target.texture},brightness:{value:VISUAL_BRIGHTNESS}},
    vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D image;uniform float brightness;varying vec2 uvv;
void main(){vec3 col=texture2D(image,uvv).rgb;float vignette=1.-.08*pow(length((uvv-.5)*1.2),1.8);gl_FragColor=vec4(max(col*vignette,0.),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
gl_FragColor.rgb=clamp(gl_FragColor.rgb*brightness,0.,1.);
}`});
  return {target,material};
}
export function renderCleanFrame(renderer,scene,camera,viewCamera,target,postScene,postCamera,showWeapon,world=null,weaponFov=camera.fov){
  renderer.autoClear=false;
  renderer.setRenderTarget(target);
  renderer.clear(true,true,true);
  renderer.render(scene,camera);
  if(showWeapon){
    // Keep the weapon in front of nearby walls while retaining its own depth.
    // This prevents rear gun surfaces from showing through front surfaces.
    renderer.clearDepth();
    viewCamera.copy(camera,false);viewCamera.fov=weaponFov;viewCamera.updateProjectionMatrix();viewCamera.layers.set(1);viewCamera.updateMatrixWorld(true);
    const background=scene.background,autoUpdate=scene.matrixWorldAutoUpdate,worldVisible=world?.visible;
    // The world pass already updated every transform. Neither scene nor weapon
    // moves between these two passes; avoid traversing the mansion twice.
    scene.background=null;scene.matrixWorldAutoUpdate=false;
    if(world)world.visible=false;
    try{renderer.render(scene,viewCamera);}finally{scene.background=background;scene.matrixWorldAutoUpdate=autoUpdate;if(world)world.visible=worldVisible;}
  }
  renderer.setRenderTarget(null);
  renderer.clear(true,true,true);
  renderer.render(postScene,postCamera);
}

export function freezeStaticTransforms(scene,world){
  scene.updateMatrixWorld(true);
  scene.matrixAutoUpdate=false;world.matrixAutoUpdate=false;
  let frozen=0;
  function visit(node,dynamic=false){
    dynamic=dynamic||!!node.userData.dynamic;
    if(!dynamic){node.matrixAutoUpdate=false;node.matrixWorldAutoUpdate=false;frozen++;}
    for(const child of node.children)visit(child,dynamic);
  }
  for(const child of world.children)visit(child);
  return frozen;
}
