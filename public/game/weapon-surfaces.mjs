import * as T from './three.module.js';

// Four small shared maps, built once before entry. No image fetches, decals,
// animated noise, extra materials, displacement or per-frame texture updates.
export const WEAPON_SURFACE_BUDGET=Object.freeze({bytes:1024*1024,maxDimension:256,maxTextures:4,anisotropy:4});
const TAU=Math.PI*2,METAL_TILE=.12,WOOD_TILE=.18,uvCache=new Map();
let surfaces;
const clampByte=value=>Math.max(0,Math.min(255,Math.round(value)));
function noise(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function texture(name,size,color,paint){
  const pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1),grain=noise(x%(size-1),y%(size-1))-.5;
    const rgb=paint(u,v,grain),at=(y*size+x)*4;
    for(let channel=0;channel<3;channel++)pixels[at+channel]=clampByte(rgb[channel]);pixels[at+3]=255;
  }
  // Periodic formulas can round a byte differently at 2π. Match the border
  // texels exactly so repeated parts and mipmaps never reveal a tile seam.
  for(let y=0;y<size;y++)pixels.copyWithin((y*size+size-1)*4,y*size*4,y*size*4+4);
  pixels.copyWithin((size-1)*size*4,0,size*4);
  const map=new T.DataTexture(pixels,size,size,T.RGBAFormat,T.UnsignedByteType);
  map.name=name;map.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;
  map.generateMipmaps=true;map.anisotropy=WEAPON_SURFACE_BUDGET.anisotropy;map.needsUpdate=true;
  return map;
}
export function weaponSurfaces(){
  if(surfaces)return surfaces;
  let seed=71437;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const scuffs=Array.from({length:12},()=>({u:random(),v:random(),length:.035+random()*.15,slope:(random()-.5)*.35}));
  function wear(u,v){
    let strength=0;
    for(const mark of scuffs){
      const along=(u-mark.u+1)%1;if(along>mark.length)continue;
      const offset=v-mark.v-along*mark.slope,distance=Math.abs(offset-Math.round(offset));
      strength=Math.max(strength,Math.max(0,1-distance*420)*Math.sin(Math.PI*along/mark.length));
    }
    return strength;
  }
  function metalDetail(u,v,n){return 3*Math.sin(TAU*v*61)+1.5*Math.cos(TAU*u*47)+n*10+1.3*Math.sin(TAU*(u*3+v*2));}
  const metal=texture('weapon-metal-grain',256,true,(u,v,n)=>{
    const value=238+metalDetail(u,v,n)+wear(u,v)*17;return [value,value+.5,value+1];
  });
  const metalFinish=texture('weapon-metal-finish',128,false,(u,v,n)=>[128,236+metalDetail(u,v,n)*.65-wear(u,v)*56,255]);
  function walnut(u,v,n){
    const bend=.028*Math.sin(TAU*u)+.010*Math.sin(TAU*(u*3+v*2));
    const figure=Math.sin(TAU*(v*4+.10*Math.sin(TAU*u*2)));
    const grain=Math.sin(TAU*(v*14+bend*3));
    const fibre=Math.sin(TAU*(v*93+.35*Math.sin(TAU*u*3)));
    const pore=Math.exp(-Math.pow(Math.sin(TAU*(v*27+bend))*5,2));
    return {figure,grain,fibre,pore,n};
  }
  const wood=texture('weapon-walnut-grain',256,true,(u,v,n)=>{
    const w=walnut(u,v,n),shade=w.grain*13+w.figure*7+w.fibre*1.6-w.pore*18+n*5;
    return [143+shade,98+shade*.70,63+shade*.46];
  });
  const woodFinish=texture('weapon-walnut-finish',128,false,(u,v,n)=>{
    const w=walnut(u,v,n);return [128+w.grain*4-w.pore*9+w.fibre*2,232-w.pore*11+w.figure*7+n*4,255];
  });
  metal.userData.weaponSurface='metal';wood.userData.weaponSurface='wood';
  const textures=Object.freeze([metal,metalFinish,wood,woodFinish]);
  const bytes=Math.ceil(textures.reduce((sum,t)=>sum+t.image.width*t.image.height*4*4/3,0));
  surfaces=Object.freeze({metal,metalFinish,wood,woodFinish,textures,bytes});return surfaces;
}

// Keep grain density tied to part size, so a tiny screw does not display the
// same giant patch as a receiver. Only UVs change; meshes stay batchable and
// repeated held/rack models share the same cached geometry.
export function weaponSurfaceGeometry(geometry,scale,kind){
  if(!kind||!geometry.attributes.uv)return geometry;
  const s=scale||[1,1,1],key=[geometry.uuid,...s,kind].join(':');
  if(uvCache.has(key))return uvCache.get(key);
  const geo=geometry.clone(),uv=geo.attributes.uv,tile=kind==='wood'?WOOD_TILE:METAL_TILE,p=geometry.parameters;
  if(geometry.type==='BoxGeometry'){
    const w=p.width*s[0],h=p.height*s[1],d=p.depth*s[2],faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
    for(let face=0;face<6;face++)for(let k=0;k<4;k++){const i=face*4+k;uv.setXY(i,uv.getX(i)*faces[face][0]/tile,uv.getY(i)*faces[face][1]/tile);}
  }else{
    let u=1,v=1;
    if(geometry.type==='CylinderGeometry'){u=TAU*Math.max(p.radiusTop,p.radiusBottom)*(s[0]+s[2])*.5/tile;v=p.height*s[1]/tile;}
    else if(geometry.type==='SphereGeometry'){u=TAU*p.radius*(s[0]+s[2])*.5/tile;v=Math.PI*p.radius*s[1]/tile;}
    else if(geometry.type==='TorusGeometry'){u=TAU*p.radius/tile;v=TAU*p.tube/tile;}
    else if(geometry.type==='ExtrudeGeometry'){u=v=1/tile;}
    else if(kind==='wood'){
      // The sculpted stock/pump already have continuous angular UVs. Preserve
      // that closed circumference while aligning fibres with their long axis.
      geometry.computeBoundingBox();u=(geometry.boundingBox.max.z-geometry.boundingBox.min.z)/(2*WOOD_TILE);
    }
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*u,uv.getY(i)*v);
  }
  uvCache.set(key,geo);return geo;
}
