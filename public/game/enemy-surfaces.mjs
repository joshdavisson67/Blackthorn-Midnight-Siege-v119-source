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
  function path(ctx,points,paint,close=true){ctx.fillStyle=paint;ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(px*TILE,py*TILE):ctx.moveTo(px*TILE,py*TILE));if(close)ctx.closePath();ctx.fill();}
  function blob(x,y,rx,ry,jag=.45,n=22){const pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=1-jag/2+rng()*jag;pts.push([x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]);}return pts;}
  // Gore runs and smears (v133): dark, coagulated stains that drip down the
  // part, with a wet core and dried brown edges, rather than round spots.
  function blood(x,y,rx,ry,heavy=false){
    soft(color,x,y+ry*.4,rx*2.1,ry*1.8,'rgba(58,32,30,.38)');soft(mask,x,y+ry*.4,rx*2.1,ry*1.8,'rgba(150,150,150,.25)');
    const core=blob(x,y,rx,ry*.8,.7,28);
    for(const [ctx,paint] of [[color,heavy?'#2a0d10':'#3a1216'],[mask,'#cfcfcf'],[relief,'#8f8f8f']])path(ctx,core,paint);
    path(color,blob(x-rx*.1,y-ry*.1,rx*.55,ry*.4,.6),heavy?'#4b1218':'#5a1a1f');
    for(let i=0;i<4+Math.floor(rng()*4);i++){
      // Runs: thin, wavering drips that thicken into a bead at the end.
      const px=x+(rng()-.5)*rx*1.5,py=y+ry*(.2+rng()*.4),len=.03+rng()*.12,w=1.2+rng()*2.6,pts=[[px,py]];
      for(let k=1;k<=6;k++)pts.push([px+(rng()-.5)*.006,py+len*k/6]);
      line(color,pts,heavy?'#2c0e11':'#3d1418',w);line(mask,pts,'#c4c4c4',w);line(relief,pts,'#959595',w*.7);
      const [ex,ey]=pts[pts.length-1];ellipse(color,ex,ey,w*.9/TILE,w*1.4/TILE,'#2a0c0f');ellipse(mask,ex,ey,w*.9/TILE,w*1.4/TILE,'#d0d0d0');
    }
    // A dragged smear and fine spatter thrown sideways.
    const sx=x+(rng()-.5)*rx,sy=y-ry*.3,dir=(rng()-.5)*1.2;
    for(let k=0;k<5;k++)line(color,[[sx,sy+k*.003],[sx+rx*2*Math.cos(dir),sy+k*.003+rx*2*Math.sin(dir)]],'rgba(52,18,22,.28)',2+rng()*2);
    for(let i=0;i<26;i++){const a=dir+(rng()-.5)*1.6,d=rx*(1+rng()*1.8),r=.0012+rng()*.0028;ellipse(color,x+Math.cos(a)*d,y+Math.sin(a)*d,r*1.8,r,'#33110f',a);ellipse(mask,x+Math.cos(a)*d,y+Math.sin(a)*d,r*1.8,r,'#bbbbbb',a);}
  }
  function veins(count,paint,reliefPaint){
    for(let i=0;i<count;i++){
      let x=rng(),y=rng(),a=rng()*Math.PI*2;const pts=[[x,y]];
      for(let k=0;k<7;k++){a+=(rng()-.5)*.9;x+=Math.cos(a)*.018;y+=Math.sin(a)*.018;pts.push([x,y]);
        if(rng()<.3){const b=a+(rng()<.5?-1:1)*(.6+rng()*.5);line(color,[[x,y],[x+Math.cos(b)*.02,y+Math.sin(b)*.02],[x+Math.cos(b)*.032,y+Math.sin(b)*.036]],paint,.8);}}
      line(color,pts,paint,1+rng()*.8);line(relief,pts,reliefPaint,1);
    }
  }
  function grime(fromY,paint){const g=color.createLinearGradient(0,fromY*TILE,0,TILE);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,paint);color.fillStyle=g;color.fillRect(0,0,TILE,TILE);}
  for(let tile=0;tile<8;tile++){
    const ox=(tile%COLS)*TILE,oy=Math.floor(tile/COLS)*TILE;
    for(const ctx of [color,mask,relief]){ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,TILE,TILE);ctx.clip();}
    color.fillStyle='#e6e0d3';color.fillRect(0,0,TILE,TILE);mask.fillStyle='#000';mask.fillRect(0,0,TILE,TILE);relief.fillStyle='#808080';relief.fillRect(0,0,TILE,TILE);
    if(tile===ENEMY_SURFACE.face||tile===ENEMY_SURFACE.skin){
      // Dead skin: livor bruising, sallow and grey-green patches, rot.
      const tones=['rgba(84,58,82,.30)','rgba(150,138,70,.22)','rgba(74,92,78,.28)','rgba(52,40,34,.30)','rgba(120,96,92,.2)'];
      for(let i=0;i<300;i++){const x=rng(),y=rng(),r=.015+rng()*.06;soft(color,x,y,r,r*(.5+rng()*.6),tones[i%tones.length]);soft(relief,x,y,r,r*.6,'rgba(104,104,104,.12)');}
      for(let i=0;i<5200;i++){const x=rng()*TILE,y=rng()*TILE,r=.5+rng()*.8;color.fillStyle=i%3?'rgba(48,44,38,.11)':'rgba(240,232,210,.06)';color.fillRect(x,y,r,r);relief.fillStyle=i%2?'#747474':'#8b8b8b';relief.fillRect(x,y,r,r);}
      veins(46,'rgba(58,46,78,.42)','#6c6c6c');
      // Sores: dark rims, raw centres, raised edges.
      for(let i=0;i<26;i++){const x=rng(),y=rng(),r=.006+rng()*.014;
        path(color,blob(x,y,r*1.5,r*1.2,.6),'rgba(60,40,36,.55)');path(color,blob(x,y,r,r*.8,.5),'#5c2a26');path(relief,blob(x,y,r*1.5,r*1.2,.6),'#9a9a9a');path(relief,blob(x,y,r*.8,r*.6,.5),'#606060');}
      for(let i=0;i<14;i++){const x=rng(),y=rng();line(color,[[x,y],[x-.016,y+.024],[x+.01,y+.06],[x-.004,y+.08]],'rgba(40,24,26,.35)',1.4);line(relief,[[x,y],[x-.016,y+.024],[x+.01,y+.06],[x-.004,y+.08]],'#606060',1.2);}
      if(tile===ENEMY_SURFACE.face){
        // Sphere front faces +Z at u=.25. Deep bruised sockets, a rotten
        // mouth that drools gore down the chin, and cracked, peeling lips.
        for(const x of [.169,.331]){soft(color,x,.47,.062,.09,'rgba(28,18,24,.82)');soft(color,x,.47,.09,.13,'rgba(52,34,46,.4)');
          soft(color,x,.53,.05,.03,'rgba(40,26,34,.35)');}
        soft(color,.25,.72,.09,.05,'rgba(40,20,22,.55)');
        for(let j=0;j<3;j++)line(relief,[[.17,.3+j*.03],[.21,.296+j*.03+rng()*.006],[.25,.298+j*.03],[.29,.294+j*.03+rng()*.006],[.33,.302+j*.03]],'#767676',1.2);
        for(const x of [.138,.362])soft(color,x,.6,.045,.08,'rgba(46,34,40,.42)');
        blood(.25,.74,.04,.03,true);blood(.31,.6,.02,.04);blood(.2,.82,.018,.03);
        blood(.15,.3,.012,.05);line(color,[[.156,.31],[.179,.39],[.165,.45]],'#3c0f15',2);
      }else{blood(.26,.42,.032,.07);blood(.36,.72,.016,.04);blood(.72,.35,.02,.05,true);}
    }else if(tile===ENEMY_SURFACE.cloth||tile===ENEMY_SURFACE.leather){
      // Coarse, filthy fabric: irregular weave noise, sun-faded streaks,
      // mildew, mud soaked up from the hem and old blood runs.
      for(let i=0;i<9000;i++){const x=rng()*TILE,y=rng()*TILE,l=1+rng()*3,v=rng()<.5;color.fillStyle=i%2?'rgba(70,64,54,.12)':'rgba(250,244,230,.08)';color.fillRect(x,y,v?1:l,v?l:1);relief.fillStyle=i%2?'#7a7a7a':'#878787';relief.fillRect(x,y,v?1:l,v?l:1);}
      for(let i=0;i<70;i++){const x=rng(),r=.02+rng()*.05;soft(color,x,rng(),r,r*(1+rng()*2),i%3?'rgba(58,52,40,.22)':'rgba(96,104,70,.16)');}
      for(let i=0;i<22;i++){const x=rng(),y=rng(),len=.08+rng()*.3;line(color,[[x,y],[x+(rng()-.5)*.01,y+len]],'rgba(46,40,32,.14)',3+rng()*6);}
      for(let i=0;i<10;i++){const x=rng(),y=rng();line(color,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'rgba(60,54,45,.2)',4);line(relief,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'#6c6c6c',2);}
      // Frayed tears with pale threads.
      for(let i=0;i<8;i++){const x=rng(),y=rng();path(color,blob(x,y,.012,.03,.8),'rgba(20,16,14,.6)');for(let k=0;k<6;k++)line(color,[[x+(rng()-.5)*.02,y+(rng()-.5)*.05],[x+(rng()-.5)*.04,y+(rng()-.5)*.07]],'rgba(220,210,190,.35)',.8);}
      grime(.55,tile===ENEMY_SURFACE.leather?'rgba(34,28,20,.55)':'rgba(46,36,24,.5)');
      blood(.21,.3,.03,.07);blood(.32,.47,.02,.04);if(tile===ENEMY_SURFACE.cloth){blood(.27,.7,.045,.06,true);blood(.78,.4,.025,.05);}
    }else if(tile===ENEMY_SURFACE.wound){
      // Raw muscle: dark fibrous striations, clots and glistening tissue.
      color.fillStyle='#4a1a1f';color.fillRect(0,0,TILE,TILE);mask.fillStyle='#fff';mask.fillRect(0,0,TILE,TILE);
      for(let i=0;i<700;i++){const x=rng(),y=rng(),len=.02+rng()*.06,a=.35+(rng()-.5)*.5;const pts=[[x,y],[x+Math.cos(a)*len,y+Math.sin(a)*len]];
        line(color,pts,i%4?'rgba(110,38,44,.5)':'rgba(30,8,12,.6)',1+rng()*2);line(relief,pts,i%3?'#9a9a9a':'#5c5c5c',1+rng());}
      for(let i=0;i<60;i++){const x=rng(),y=rng(),r=.006+rng()*.02;path(color,blob(x,y,r,r*.7,.7),i%2?'#26090d':'#7a2c33');path(relief,blob(x,y,r,r*.7,.7),i%2?'#505050':'#a8a8a8');}
      for(let i=0;i<40;i++){const x=rng(),y=rng();line(color,[[x,y],[x+.03,y+.01],[x+.05,y+.03]],'rgba(214,190,160,.35)',1);}
    }else if(tile===ENEMY_SURFACE.bone){
      color.fillStyle='#d6cdb2';color.fillRect(0,0,TILE,TILE);
      for(let i=0;i<120;i++){const x=rng(),r=.01+rng()*.05;soft(color,x,rng(),r,r*1.6,i%2?'rgba(110,86,48,.22)':'rgba(70,56,40,.2)');}
      for(let i=0;i<110;i++){const x=rng(),y=rng();line(color,[[x,y],[x+.007,y+.025],[x-.003,y+.046]],'rgba(52,38,26,.22)',1);line(relief,[[x,y],[x+.007,y+.025],[x-.003,y+.046]],'#666',1);}
      grime(.45,'rgba(60,40,26,.45)');blood(.27,.68,.026,.08,true);
    }else if(tile===ENEMY_SURFACE.fur){
      color.fillStyle='#cfc8b8';color.fillRect(0,0,TILE,TILE);
      for(let i=0;i<6400;i++){
        const x=rng(),y=rng(),len=.01+rng()*.035;line(color,[[x,y],[x+.004*(rng()-.5),y+len]],i%2?'rgba(36,30,24,.32)':'rgba(255,246,224,.12)',.8);
        line(relief,[[x,y],[x+.003,y+len]],i%2?'#707070':'#8e8e8e',.9);
      }
      for(let i=0;i<30;i++){const x=rng(),y=rng(),r=.01+rng()*.03;path(color,blob(x,y,r,r,.7),'rgba(72,52,46,.6)');}
      blood(.24,.53,.034,.08,true);blood(.34,.73,.016,.05);
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
