import * as T from './three.module.js';

export const ENEMY_SURFACE=Object.freeze({face:0,skin:1,cloth:2,leather:3,wound:4,bone:5,fur:6,plain:7});
const TILE=512,COLS=4,ROWS=2,GUTTER=12;
let cached;

// One opaque atlas and one relief map for the whole horde. The color texture's
// alpha stores a blood mask, not transparency; its shader keeps wounds red
// independently of skin/uniform color. All work happens during template loading.

// Close-range surface detail (v134). Four seamless 256² strips: skin pores and
// fine wrinkles, twill weave, pebbled leather and wet tissue fibre. R is
// relief, G an albedo modulation and B a roughness offset. It is computed per
// pixel, so it tiles perfectly and also exists in the headless test harness.
export const DETAIL=Object.freeze({size:256,slots:4,repeat:[3.6,7,3,4],bump:.5});
function detailTexture(){
  const N=DETAIL.size,W=N*DETAIL.slots,data=new Uint8Array(W*N*4);
  let seed=90211;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const lattice=(period)=>{const g=new Float32Array(period*period);for(let i=0;i<g.length;i++)g[i]=rnd();return (x,y)=>{
    const fx=x/N*period,fy=y/N*period,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),at=(a,b)=>g[((b%period+period)%period)*period+((a%period+period)%period)];
    return (at(ix,iy)*(1-sx)+at(ix+1,iy)*sx)*(1-sy)+(at(ix,iy+1)*(1-sx)+at(ix+1,iy+1)*sx)*sy;};};
  const fbm=(octaves)=>{const layers=octaves.map(p=>lattice(p));return (x,y)=>{let v=0,a=.5,t=0;for(const l of layers){v+=l(x,y)*a;t+=a;a*=.55;}return v/t;};};
  // Worley cells with a seamless period: distance to nearest and second point.
  const cells=(period)=>{const pts=[];for(let i=0;i<period*period;i++)pts.push([rnd(),rnd()]);const c=N/period;return (x,y)=>{
    const cx=Math.floor(x/c),cy=Math.floor(y/c);let d1=9,d2=9;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,p=pts[((gy%period+period)%period)*period+((gx%period+period)%period)],px=(gx+p[0])*c,py=(gy+p[1])*c,d=Math.hypot(px-x,py-y)/c;if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
    return [d1,d2];};};
  const put=(slot,x,y,h,a,r)=>{const i=(y*W+slot*N+x)*4;data[i]=Math.max(0,Math.min(255,h*255));data[i+1]=Math.max(0,Math.min(255,a*255));data[i+2]=Math.max(0,Math.min(255,r*255));data[i+3]=255;};
  const skinNoise=fbm([4,8,16,32]),skinLines=fbm([6,12]),pores=cells(52),creases=fbm([3,6]),poreSize=fbm([8,16]);
  const lump=fbm([8,16,32]),grain=cells(18),leatherCrease=fbm([4,8]),fibre=fbm([64,128]),fibreLow=fbm([4,8]),glint=fbm([16,32]);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    // Skin: pores, cross-hatched fine lines, soft unevenness.
    const [pd]=pores(x,y),pore=Math.max(0,1-pd/(.1+.12*poreSize(x,y)))**1.5,line=1-Math.abs(skinLines(x,y)*2-1),wrinkle=Math.pow(Math.max(0,line),9),crease=Math.pow(1-Math.abs(creases(x,y*.35)*2-1),14);
    put(0,x,y,.55+(skinNoise(x,y)-.5)*.5-pore*.22-wrinkle*.28-crease*.3,.5+(skinNoise(x,y)-.5)*.25-pore*.18-crease*.12,.5+pore*.25-(skinNoise(x,y)-.5)*.2);
    // Cloth: 2/2 twill: threads alternate over and under on a diagonal.
    const cell=4,u=x%cell,v=y%cell,twill=(Math.floor(x/cell)+Math.floor(y/cell))%4<2,warp=Math.sin(Math.PI*(v+.5)/cell)**2,weft=Math.sin(Math.PI*(u+.5)/cell)**2;
    const thread=twill?warp:weft,fuzz=lump(x*2,y*2);
    put(1,x,y,.25+.55*thread+(fuzz-.5)*.25,.42+.16*thread+(fuzz-.5)*.2,.55-.1*thread);
    // Leather: pebbled grain cells, deep creases and worn scuffs.
    const [g1,g2]=grain(x,y),groove=Math.max(0,1-(g2-g1)/.12),lc=Math.pow(1-Math.abs(leatherCrease(x,y)*2-1),10);
    put(2,x,y,.6-groove*.4-lc*.35+(lump(x,y)-.5)*.2,.5-groove*.12-lc*.15+(lump(x,y)-.5)*.3,.45+groove*.2+lc*.2);
    // Wet tissue / fibre / bone: long striations with glossy ridges.
    const f=fibre(x,y*.12),fl=fibreLow(x,y),gl=glint(x,y);
    put(3,x,y,.35+f*.45+(fl-.5)*.3,.45+(f-.5)*.35,.5-Math.max(0,gl-.55)*1.4+(1-f)*.1);
  }
  const t=new T.DataTexture(data,W,N,T.RGBAFormat);t.colorSpace=T.NoColorSpace;t.flipY=false;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;t.name='shared-enemy-detail';
  return t;
}

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
      // Necrosis: green-black rot with a bruised rim; peeling grey skin with
      // lifted edges; reddish capillary flush where blood has pooled.
      for(let i=0;i<9;i++){const x=rng(),y=rng(),r=.02+rng()*.04;soft(color,x,y,r*1.8,r*1.5,'rgba(70,48,62,.35)');soft(color,x,y,r*1.1,r*.9,'rgba(30,38,24,.4)');path(color,blob(x,y,r*.6,r*.5,.8),'rgba(30,34,22,.3)');path(relief,blob(x,y,r,r*.8,.8),'#6a6a6a');}
      for(let i=0;i<12;i++){const x=rng(),y=rng(),r=.015+rng()*.035,pts=blob(x,y,r,r*.7,.9);path(color,pts,'rgba(206,200,184,.32)');path(relief,pts,'#939393');color.strokeStyle='rgba(40,30,28,.45)';color.lineWidth=1.2;color.beginPath();pts.forEach(([px,py],k)=>k?color.lineTo(px*TILE,py*TILE):color.moveTo(px*TILE,py*TILE));color.closePath();color.stroke();}
      for(let i=0;i<70;i++){const x=rng(),y=rng();line(color,[[x,y],[x+(rng()-.5)*.02,y+(rng()-.5)*.02],[x+(rng()-.5)*.03,y+(rng()-.5)*.03]],'rgba(120,40,48,.22)',.7);}
      if(tile===ENEMY_SURFACE.face){
        // Sphere front faces +Z at u=.25. Deep bruised sockets, a rotten
        // mouth that drools gore down the chin, and cracked, peeling lips.
        for(const x of [.169,.331]){soft(color,x,.47,.062,.09,'rgba(28,18,24,.82)');soft(color,x,.47,.09,.13,'rgba(52,34,46,.4)');
          soft(color,x,.53,.05,.03,'rgba(40,26,34,.35)');}
        soft(color,.25,.72,.09,.05,'rgba(40,20,22,.55)');
        // Stubble over jaw and chin, cracked lips, sooty nostrils, forehead lines.
        for(let i=0;i<2600;i++){const a=rng()*Math.PI,r=.05+rng()*.17,x=.25+Math.cos(a)*r*1.05,y=.62+Math.sin(a)*r*.9;if(y<.66&&Math.abs(x-.25)<.1)continue;color.fillStyle='rgba(28,24,22,.32)';color.fillRect(x*TILE,y*TILE,1,1);}
        for(let i=0;i<14;i++){const x=.19+rng()*.12,y=.705+rng()*.03;line(color,[[x,y],[x+.003,y+.012]],'rgba(30,10,12,.6)',1);line(relief,[[x,y],[x+.003,y+.012]],'#5a5a5a',1);}
        for(const x of [.232,.268])soft(color,x,.62,.012,.01,'rgba(18,10,10,.7)');
        for(let j=0;j<3;j++){const y=.27+j*.024;line(color,[[.17,y],[.21,y-.004],[.25,y+.002],[.29,y-.003],[.33,y+.002]],'rgba(52,40,36,.28)',1.1);}
        for(let j=0;j<3;j++)line(relief,[[.17,.3+j*.03],[.21,.296+j*.03+rng()*.006],[.25,.298+j*.03],[.29,.294+j*.03+rng()*.006],[.33,.302+j*.03]],'#767676',1.2);
        for(const x of [.138,.362])soft(color,x,.6,.045,.08,'rgba(46,34,40,.42)');
        blood(.25,.74,.04,.03,true);blood(.31,.6,.02,.04);blood(.2,.82,.018,.03);
        blood(.15,.3,.012,.05);line(color,[[.156,.31],[.179,.39],[.165,.45]],'#3c0f15',2);
      }else{blood(.26,.42,.032,.07);blood(.36,.72,.016,.04);blood(.72,.35,.02,.05,true);}
    }else if(tile===ENEMY_SURFACE.leather){
      // Old leather and heavy twill: dark, cracked and scuffed pale at the
      // creases, with mud caked from below.
      color.fillStyle='#c8bfb0';color.fillRect(0,0,TILE,TILE);
      for(let i=0;i<120;i++){const x=rng(),r=.02+rng()*.06;soft(color,x,rng(),r,r*(.6+rng()),i%2?'rgba(40,32,24,.25)':'rgba(240,226,200,.12)');}
      for(let i=0;i<40;i++){let x=rng(),y=rng(),a=rng()*Math.PI*2;const pts=[[x,y]];for(let k=0;k<6;k++){a+=(rng()-.5)*1.4;x+=Math.cos(a)*.015;y+=Math.sin(a)*.015;pts.push([x,y]);}line(color,pts,'rgba(24,18,14,.55)',1.2);line(relief,pts,'#575757',1.4);line(color,pts.map(([px,py])=>[px+.002,py+.002]),'rgba(230,214,190,.18)',.8);}
      for(let i=0;i<30;i++){const x=rng(),y=rng(),len=.02+rng()*.06,a=(rng()-.5)*.6;line(color,[[x,y],[x+Math.cos(a)*len,y+Math.sin(a)*len]],'rgba(236,224,204,.28)',1+rng()*3);}
      for(let i=0;i<6000;i++){const x=rng()*TILE,y=rng()*TILE;color.fillStyle=i%2?'rgba(40,34,26,.12)':'rgba(255,248,232,.06)';color.fillRect(x,y,1.2,1.2);relief.fillStyle=i%2?'#7b7b7b':'#868686';relief.fillRect(x,y,1.2,1.2);}
      grime(.5,'rgba(52,40,26,.62)');
      for(let i=0;i<18;i++){const x=rng(),y=.75+rng()*.25,r=.01+rng()*.03;path(color,blob(x,y,r,r*.6,.9),'rgba(70,56,36,.5)');path(relief,blob(x,y,r,r*.6,.9),'#999');}
      blood(.21,.3,.03,.07);blood(.32,.47,.02,.04);
    }else if(tile===ENEMY_SURFACE.cloth){
      // Coarse, filthy fabric: irregular weave noise, sun-faded streaks,
      // mildew, mud soaked up from the hem and old blood runs.
      for(let i=0;i<9000;i++){const x=rng()*TILE,y=rng()*TILE,l=1+rng()*3,v=rng()<.5;color.fillStyle=i%2?'rgba(70,64,54,.12)':'rgba(250,244,230,.08)';color.fillRect(x,y,v?1:l,v?l:1);relief.fillStyle=i%2?'#7a7a7a':'#878787';relief.fillRect(x,y,v?1:l,v?l:1);}
      for(let i=0;i<70;i++){const x=rng(),r=.02+rng()*.05;soft(color,x,rng(),r,r*(1+rng()*2),i%3?'rgba(58,52,40,.22)':'rgba(96,104,70,.16)');}
      for(let i=0;i<22;i++){const x=rng(),y=rng(),len=.08+rng()*.3;line(color,[[x,y],[x+(rng()-.5)*.01,y+len]],'rgba(46,40,32,.14)',3+rng()*6);}
      for(let i=0;i<10;i++){const x=rng(),y=rng();line(color,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'rgba(60,54,45,.2)',4);line(relief,[[x-.07,y-.01],[x,y],[x+.11,y+.034]],'#6c6c6c',2);}
      // Frayed tears with pale threads.
      for(let i=0;i<8;i++){const x=rng(),y=rng();path(color,blob(x,y,.012,.03,.8),'rgba(20,16,14,.6)');for(let k=0;k<6;k++)line(color,[[x+(rng()-.5)*.02,y+(rng()-.5)*.05],[x+(rng()-.5)*.04,y+(rng()-.5)*.07]],'rgba(220,210,190,.35)',.8);}
      // Darned patches with cross stitches, seams and moth holes.
      for(let i=0;i<4;i++){const x=.08+rng()*.8,y=.08+rng()*.7,w=.05+rng()*.06,h=.04+rng()*.06;color.fillStyle=i%2?'rgba(60,54,44,.35)':'rgba(230,220,200,.18)';color.fillRect(x*TILE,y*TILE,w*TILE,h*TILE);relief.fillStyle='#8c8c8c';relief.fillRect(x*TILE,y*TILE,w*TILE,h*TILE);
        for(let k=0;k<w*TILE/5;k++){const sx=x+k*5/TILE;line(color,[[sx,y-.004],[sx+.006,y+.004]],'rgba(20,16,12,.6)',1);line(color,[[sx,y+h-.004],[sx+.006,y+h+.004]],'rgba(20,16,12,.6)',1);}}
      for(let i=0;i<3;i++){const x=rng();for(let k=0;k<TILE;k+=6){line(color,[[x,k/TILE],[x+.003,(k+3)/TILE]],'rgba(24,20,16,.4)',1);}line(relief,[[x,0],[x,1]],'#727272',2);}
      for(let i=0;i<14;i++){const x=rng(),y=rng(),r=.004+rng()*.01;path(color,blob(x,y,r*1.8,r*1.5,.8),'rgba(200,190,170,.3)');path(color,blob(x,y,r,r,.7),'#100c0b');path(relief,blob(x,y,r,r,.7),'#3c3c3c');}
      grime(.55,'rgba(46,36,24,.5)');
      blood(.21,.3,.03,.07);blood(.32,.47,.02,.04);blood(.27,.7,.045,.06,true);blood(.78,.4,.025,.05);
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
      for(let i=0;i<500;i++){const x=rng(),y=rng(),r=.001+rng()*.003;ellipse(color,x,y,r,r,'rgba(70,52,32,.45)');ellipse(relief,x,y,r,r,'#5a5a5a');}
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
  cached={map:make(rgba,T.SRGBColorSpace),bumpMap:make(bump,T.NoColorSpace),detail:detailTexture(),width,height,gutter:GUTTER,tile:TILE,cols:COLS,rows:ROWS};
  cached.map.name='shared-enemy-skin-cloth-blood';cached.bumpMap.name='shared-enemy-surface-relief';return cached;
}

export function markEnemySurface(material,tile){material.userData.enemySurfaceTile=tile;return material;}

export function atlasUV(geometry,tile){
  const uv=geometry.attributes.uv,col=tile%COLS,row=Math.floor(tile/COLS),span=TILE-GUTTER*2;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(col*TILE+GUTTER+T.MathUtils.clamp(uv.getX(i),0,1)*span)/(TILE*COLS),1-(row*TILE+GUTTER+(1-T.MathUtils.clamp(uv.getY(i),0,1))*span)/(TILE*ROWS));
}

// Detail coordinates: a planar projection of each joint's own geometry, in
// metres, chosen per triangle by its dominant normal axis.
export function addDetailCoordinates(geometry){
  const p=geometry.attributes.position,n=geometry.attributes.normal,out=new Float32Array(p.count*2),tri=!geometry.index,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),fn=new T.Vector3();
  for(let i=0;i<p.count;i++){
    let nx,ny,nz;
    if(tri){const base=i-i%3;a.fromBufferAttribute(p,base);b.fromBufferAttribute(p,base+1);c.fromBufferAttribute(p,base+2);fn.subVectors(c,b).cross(a.clone().sub(b));nx=Math.abs(fn.x);ny=Math.abs(fn.y);nz=Math.abs(fn.z);}
    else{nx=Math.abs(n.getX(i));ny=Math.abs(n.getY(i));nz=Math.abs(n.getZ(i));}
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(nx>=ny&&nx>=nz){out[i*2]=z;out[i*2+1]=y;}else if(ny>=nz){out[i*2]=x;out[i*2+1]=z;}else{out[i*2]=x;out[i*2+1]=y;}
  }
  geometry.setAttribute('detailUv',new T.BufferAttribute(out,2));return geometry;
}

export function enemySurfaceShader(shader){
  const detail=cached?.detail;
  shader.uniforms??={};shader.uniforms.enemyDetail={value:detail};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 detailUv;varying vec2 vDetailUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvDetailUv=detailUv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec2 vDetailUv;uniform sampler2D enemyDetail;float enemyDetailH=0.0;float enemyDetailRough=0.0;`)
  .replace('#include <bumpmap_pars_fragment>',T.ShaderChunk.bumpmap_pars_fragment.replace('return vec2( dBx, dBy );',`return vec2( dBx, dBy )+${DETAIL.bump.toFixed(3)}*vec2(dFdx(enemyDetailH),dFdy(enemyDetailH));`))
  .replace('#include <map_fragment>',`#ifdef USE_MAP
    vec4 enemySurface = texture2D( map, vMapUv );
    diffuseColor.rgb = mix( diffuseColor.rgb * enemySurface.rgb, enemySurface.rgb, enemySurface.a );
    // Pick this atlas cell's detail strip: skin, cloth, leather or tissue.
    float enemyCell=floor(clamp(vMapUv.x,0.0,0.999)*4.0)+(vMapUv.y<0.5?4.0:0.0);
    float enemySlot=enemyCell<1.5?0.0:enemyCell<2.5?1.0:enemyCell<3.5?2.0:3.0;
    float enemyRepeat=enemySlot<0.5?${DETAIL.repeat[0].toFixed(1)}:enemySlot<1.5?${DETAIL.repeat[1].toFixed(1)}:enemySlot<2.5?${DETAIL.repeat[2].toFixed(1)}:${DETAIL.repeat[3].toFixed(1)};
    vec2 enemyCoord=vDetailUv*enemyRepeat,enemyDx=dFdx(enemyCoord),enemyDy=dFdy(enemyCoord);
    vec4 enemyFine=textureGrad(enemyDetail,(vec2(enemySlot,0.0)+fract(enemyCoord))/vec2(4.0,1.0),enemyDx/vec2(4.0,1.0),enemyDy/vec2(4.0,1.0));
    // Fade out once a texel is smaller than a pixel: no shimmer at range.
    float enemyNear=(1.0-smoothstep(2.5,7.0,max(length(enemyDx),length(enemyDy))*${DETAIL.size.toFixed(1)}))*(enemyCell>6.5?0.0:1.0);
    enemyDetailH=enemyFine.r*enemyNear;enemyDetailRough=(enemyFine.b-0.5)*0.5*enemyNear;
    diffuseColor.rgb *= 1.0+(enemyFine.g-0.5)*0.55*enemyNear;
  #endif`).replace('roughnessFactor=vSurfaceFinish.x;','roughnessFactor=mix(vSurfaceFinish.x,0.38,enemySurface.a);roughnessFactor=clamp(roughnessFactor+enemyDetailRough,0.06,1.0);');
}
