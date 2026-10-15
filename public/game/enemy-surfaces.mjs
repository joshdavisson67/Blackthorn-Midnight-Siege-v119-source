import * as T from './three.module.js';

export const ENEMY_SURFACE=Object.freeze({face:0,skin:1,cloth:2,leather:3,wound:4,bone:5,fur:6,plain:7});
const TILE=512,COLS=4,ROWS=2,GUTTER=12;
let cached;

// One opaque atlas and one relief map for the whole horde. The color texture's
// alpha stores a blood mask, not transparency; its shader keeps wounds red
// independently of skin/uniform color. All work happens during template loading.
export function enemySurfaces(){
  if(cached)return cached;
  const width=TILE*COLS,height=TILE*ROWS;
  const canvas=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
  const colorCanvas=canvas(),maskCanvas=canvas(),reliefCanvas=canvas();
  const color=colorCanvas.getContext('2d'),mask=maskCanvas.getContext('2d'),relief=reliefCanvas.getContext('2d');
  let seed=61307;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  function ellipse(ctx,x,y,rx,ry,paint,rotation=0){ctx.fillStyle=paint;ctx.beginPath();ctx.ellipse(x*TILE,y*TILE,rx*TILE,ry*TILE,rotation,0,Math.PI*2);ctx.fill();}
  function soft(ctx,x,y,rx,ry,paint){ctx.save();ctx.translate(x*TILE,y*TILE);ctx.scale(rx*TILE,ry*TILE);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,paint);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
  function line(ctx,points,paint,thickness){ctx.strokeStyle=paint;ctx.lineWidth=thickness;ctx.lineCap='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*TILE,y*TILE):ctx.moveTo(x*TILE,y*TILE));ctx.stroke();}
  function blood(x,y,rx,ry,heavy=false){
    // Irregular, connected stains follow the actual surface UVs. No floating
    // decal planes, coplanar meshes, transparency sorting or additional draws.
    soft(color,x,y,rx*1.9,ry*1.5,'rgba(77,39,40,.42)');soft(mask,x,y,rx*1.9,ry*1.5,'rgba(210,210,210,.35)');
    const points=[];for(let i=0;i<26;i++){const a=i/26*Math.PI*2,r=.64+rng()*.48;points.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);}
    for(const [ctx,paint] of [[color,heavy?'#3c161d':'#4c1c25'],[mask,'#d0d0d0'],[relief,'#929292']]){
      ctx.fillStyle=paint;ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px*TILE,py*TILE):ctx.moveTo(px*TILE,py*TILE));ctx.closePath();ctx.fill();
    }
    for(let i=0;i<95;i++){
      const px=x+(rng()-.5)*rx*1.8,py=y+(rng()-.5)*ry*1.65,r=.001+rng()*.004;
      ellipse(color,px,py,r,r*1.5,i%3?'#642831':'#2f161b');ellipse(mask,px,py,r,r*1.5,'#ededed');
      line(color,[[px,py],[px+rx*.05,py+ry*.14]],i%3?'rgba(118,44,49,.24)':'rgba(19,10,14,.45)',.8);
    }
    for(let i=0;i<3;i++){
      const px=x+(rng()-.5)*rx,py=y+ry*.48,len=.022+rng()*.075,points=[[px,py],[px+.002,py+len*.7],[px-.003,py+len]];
      line(color,points,'#401820',1+rng()*2);line(mask,points,'#c0c0c0',2);line(relief,points,'#979797',1.5);
    }
  }
  for(let tile=0;tile<8;tile++){
    const ox=(tile%COLS)*TILE,oy=Math.floor(tile/COLS)*TILE;
    for(const ctx of [color,mask,relief]){ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,TILE,TILE);ctx.clip();}
    color.fillStyle='#eeeae0';color.fillRect(0,0,TILE,TILE);mask.fillStyle='#000';mask.fillRect(0,0,TILE,TILE);relief.fillStyle='#808080';relief.fillRect(0,0,TILE,TILE);
    if(tile===ENEMY_SURFACE.face||tile===ENEMY_SURFACE.skin){
      for(let i=0;i<220;i++){
        const x=rng(),y=rng(),r=.012+rng()*.04;
        soft(color,x,y,r,r*.6,'rgba(104,115,99,.22)');
        soft(relief,x,y,r,r*.6,'rgba(100,100,100,.14)');
      }
      for(let i=0;i<4200;i++){
        const x=rng()*TILE,y=rng()*TILE,r=.45+rng()*.65;
        color.fillStyle='rgba(57,55,46,.09)';color.fillRect(x,y,r,r);
        relief.fillStyle=i%2?'#777':'#898989';relief.fillRect(x,y,r,r);
      }
      for(let i=0;i<20;i++){
        const x=rng(),y=rng();line(color,[[x,y],[x-.014,y+.022],[x+.009,y+.059]],'rgba(72,61,81,.22)',1.3);
        line(relief,[[x,y],[x-.014,y+.022],[x+.009,y+.059]],'#696969',1);
      }
      if(tile===ENEMY_SURFACE.face){
        // Sphere front faces +Z at u=.25. UVs stay on the sculpted skull, so
        // bruising surrounds the sockets and blood sits on lips/cheeks/chin.
        for(const x of [.169,.331]){
          soft(color,x,.46,.048,.079,'rgba(49,39,47,.55)');
          for(let j=0;j<3;j++)line(color,[[x-.025,.49+j*.010],[x,.508+j*.010],[x+.028,.49+j*.010]],'rgba(68,60,59,.25)',1.4);
        }
        for(let j=0;j<3;j++)line(relief,[[.17,.30+j*.028],[.25,.294+j*.028],[.33,.31+j*.028]],'#737373',1.5);
        for(const x of [.142,.358])soft(color,x,.595,.039,.075,'rgba(64,52,58,.28)');
        blood(.322,.59,.029,.065);blood(.251,.72,.050,.050,true);blood(.21,.816,.023,.035);
        blood(.156,.315,.012,.067);line(color,[[.156,.31],[.179,.39],[.165,.45]],'#4e1520',2);
      }else{blood(.26,.46,.037,.105);blood(.34,.7,.016,.045);}
    }else if(tile===ENEMY_SURFACE.cloth||tile===ENEMY_SURFACE.leather){
      for(let i=0;i<TILE;i+=4){
        color.fillStyle=i%8?'#d4d0c5':'#e7e3d9';color.fillRect(i,0,1,TILE);color.fillRect(0,i,TILE,1);
        relief.fillStyle=i%8?'#858585':'#797979';relief.fillRect(i,0,1,TILE);relief.fillRect(0,i,TILE,1);
      }
      for(let i=0;i<12;i++){
        const x=rng(),y=rng();line(color,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'rgba(71,65,55,.16)',4);
        line(relief,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'#707070',2);
      }
      blood(.21,.31,.036,.088);blood(.30,.45,.022,.046);if(tile===ENEMY_SURFACE.cloth)blood(.265,.73,.048,.068,true);
    }else if(tile===ENEMY_SURFACE.wound){
      color.fillStyle='#4b1b24';color.fillRect(0,0,TILE,TILE);mask.fillStyle='#fff';mask.fillRect(0,0,TILE,TILE);
      for(let i=0;i<420;i++){
        const x=rng(),y=rng(),r=.004+rng()*.021;ellipse(color,x,y,r,r*.5,i%3?'#632832':'#28171d',rng()*3);
        ellipse(relief,x,y,r,r*.5,i%3?'#929292':'#555',rng()*3);
      }
    }else if(tile===ENEMY_SURFACE.bone){
      for(let i=0;i<90;i++){const x=rng(),y=rng();line(color,[[x,y],[x+.007,y+.025],[x-.003,y+.046]],'rgba(57,43,29,.16)',1);}
      blood(.27,.68,.029,.10,true);
    }else if(tile===ENEMY_SURFACE.fur){
      for(let i=0;i<5800;i++){
        const x=rng(),y=rng(),len=.008+rng()*.027;line(color,[[x,y],[x+.003,y+len]],i%2?'rgba(49,42,35,.25)':'rgba(255,246,224,.14)',.8);
        line(relief,[[x,y],[x+.003,y+len]],i%2?'#737373':'#8c8c8c',.9);
      }
      blood(.24,.53,.037,.09,true);blood(.34,.73,.017,.06);
    }
    for(const ctx of [color,mask,relief])ctx.restore();
  }
  const colorData=color.getImageData?.(0,0,width,height)?.data,maskData=mask.getImageData?.(0,0,width,height)?.data,reliefData=relief.getImageData?.(0,0,width,height)?.data;
  // The headless gameplay harness has no raster canvas; geometry still runs.
  const rgba=colorData?new Uint8Array(colorData):new Uint8Array(width*height*4).fill(255);
  for(let i=3;i<rgba.length;i+=4)rgba[i]=maskData?.[i-3]??0;
  const bump=reliefData?new Uint8Array(reliefData):new Uint8Array(width*height*4).fill(128);
  const make=(data,colorSpace)=>{const bottomUp=new Uint8Array(data.length);for(let y=0;y<height;y++)bottomUp.set(data.subarray(y*width*4,(y+1)*width*4),(height-1-y)*width*4);const t=new T.DataTexture(bottomUp,width,height,T.RGBAFormat);t.colorSpace=colorSpace;t.flipY=false;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;};
  cached={map:make(rgba,T.SRGBColorSpace),bumpMap:make(bump,T.NoColorSpace),width,height,gutter:GUTTER,tile:TILE,cols:COLS,rows:ROWS};
  cached.map.name='shared-enemy-skin-cloth-blood';cached.bumpMap.name='shared-enemy-surface-relief';return cached;
}

export function markEnemySurface(material,tile){material.userData.enemySurfaceTile=tile;return material;}

export function atlasUV(geometry,tile){
  const uv=geometry.attributes.uv,col=tile%COLS,row=Math.floor(tile/COLS),span=TILE-GUTTER*2;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(col*TILE+GUTTER+T.MathUtils.clamp(uv.getX(i),0,1)*span)/(TILE*COLS),1-(row*TILE+GUTTER+(1-T.MathUtils.clamp(uv.getY(i),0,1))*span)/(TILE*ROWS));
}

export function enemySurfaceShader(shader){
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
    vec4 enemySurface = texture2D( map, vMapUv );
    diffuseColor.rgb = mix( diffuseColor.rgb * enemySurface.rgb, enemySurface.rgb, enemySurface.a );
  #endif`).replace('roughnessFactor=vSurfaceFinish.x;','roughnessFactor=mix(vSurfaceFinish.x,0.38,enemySurface.a);');
}
