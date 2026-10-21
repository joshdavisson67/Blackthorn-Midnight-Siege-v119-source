import * as T from './three.module.js';
import {OLIVIA_ATTIC as A,UPPER_CEILING,UPPER_Y} from './vertical.mjs?v=131';

// Easter egg (v131): Bella's kills drop bone chips. Twenty-five open a hatch
// above her kennel; pull-down stairs lead to a little garret where Olivia
// plays games on a tablet with a controller. Turning the chips in to her
// makes Bella a fire-breathing rat dragon.
export const EASTER_EGG=Object.freeze({chips:25,chipLife:30,openTime:2.6});
export const OLIVIA_SPOT=Object.freeze({x:A.x+1.05,z:A.z-2.45,y:A.y,yaw:.35});

// ---- Bone chip pickup -------------------------------------------------------------------
let chipKit=null;
export function boneChipModel(){
  if(!chipKit){
    const bone=new T.MeshStandardMaterial({color:0xece3cc,roughness:.6,emissive:0x5a5038,emissiveIntensity:.35});
    const shaft=new T.CylinderGeometry(.035,.035,.24,10),knob=new T.SphereGeometry(.05,10,8);
    const g=new T.Group();g.name='Bone chip';
    const s=new T.Mesh(shaft,bone);s.rotation.z=Math.PI/2;g.add(s);
    for(const x of [-.13,.13])for(const z of [-.035,.035]){const k=new T.Mesh(knob,bone);k.position.set(x,0,z);g.add(k);}
    g.rotation.x=.35;g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.raycast=()=>{};}});
    chipKit=g;
  }
  const holder=new T.Group(),model=chipKit.clone();holder.add(model);holder.userData.model=model;holder.userData.dynamic=true;holder.name='Bone chip pickup';
  return holder;
}

// ---- Garret, stairs and Olivia -------------------------------------------------------------
export function buildOliviaAttic({world,M,box,colliders,solidMeshes,interactables,upperFixtures=null}){
  const firstCollider=colliders.length;
  const top=A.y+A.height,x0=A.x-A.w/2,x1=A.x+A.w/2,z0=A.z-A.d/2,z1=A.z+A.d/2,t=.22,wallY=A.y+A.height/2;
  const mat=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness:0,...extra});
  const siding=M.stone,boards=M.floor,trim=M.wood;
  // Walls (with a front window looking out over the lawn).
  const wall=(x,z,w,d,y=wallY,h=A.height)=>{const o=box(x,y,z,w,h,d,siding,world,true);solidMeshes.push(o);return o;};
  wall(x0-t/2,A.z,t,A.d+2*t);wall(x1+t/2,A.z,t,A.d+2*t);wall(A.x,z0-t/2,A.w,t);
  const winW=1.3,winSill=A.y+1.0,winHead=A.y+1.95;
  wall((x0+A.x-winW/2)/2,z1+t/2,A.x-winW/2-x0,t);wall((A.x+winW/2+x1)/2,z1+t/2,x1-A.x-winW/2,t);
  wall(A.x,z1+t/2,winW,t,(A.y+winSill)/2,winSill-A.y);wall(A.x,z1+t/2,winW,t,(winHead+top)/2,top-winHead);
  const glow=new T.Mesh(new T.PlaneGeometry(winW,winHead-winSill),mat(0x8fb7d4,.4,{emissive:0x5d8fc2,emissiveIntensity:.75,transparent:true,opacity:.55}));
  glow.position.set(A.x,(winSill+winHead)/2,z1+t/2);glow.castShadow=false;world.add(glow);
  for(const y of [winSill,winHead])box(A.x,y,z1+t/2,winW+.12,.06,t+.06,trim);box(A.x,(winSill+winHead)/2,z1+t/2+.02,.05,winHead-winSill,.05,trim);
  // Flat interior ceiling and a gabled roof outside.
  box(A.x,top+.03,A.z,A.w+2*t,.06,A.d+2*t,trim);
  const ridge=top+1.05,half=A.d/2+t+.3,slope=Math.hypot(half,ridge-top),angle=Math.atan2(ridge-top,half);
  for(const side of [-1,1]){const r=box(A.x,(top+ridge)/2+.06,A.z+side*half/2,A.w+2*t+.5,.12,slope,M.roof);r.rotation.x=side*angle;}
  const gable=new T.Shape();gable.moveTo(-half+.3,0);gable.lineTo(0,ridge-top);gable.lineTo(half-.3,0);gable.closePath();
  for(const x of [x0-t,x1+t]){const g=new T.Mesh(new T.ShapeGeometry(gable),siding);g.position.set(x,top,A.z);g.rotation.y=Math.PI/2;g.material=siding.clone();g.material.side=T.DoubleSide;g.castShadow=g.receiveShadow=true;world.add(g);}
  // Floorboards around the hatch, with a rail on three sides of the opening.
  const h=A.hole,hx0=h.x-h.w/2,hx1=h.x+h.w/2,hz0=h.z-h.d/2,hz1=h.z+h.d/2;
  const floor=(a,b,c,e)=>{if(b-a>1e-3&&e-c>1e-3){const o=box((a+b)/2,A.y+.01,(c+e)/2,b-a,.02,e-c,boards);solidMeshes.push(o);}};
  floor(x0,hx0,z0,z1);floor(hx1,x1,z0,z1);floor(hx0,hx1,z0,hz0);floor(hx0,hx1,hz1,z1);
  const rail=(x,z,w,d)=>{box(x,A.y+.86,z,w,.06,d,trim);colliders.push({x,z,w,d,minY:A.y,maxY:A.y+.9,railing:true,attic:true});};
  // Side rails stand back from the opening so climbers' shoulders clear them.
  // Only the end rail is solid; a step off the sides just lands on the treads,
  // and solid side rails would snag zombies climbing two abreast.
  const railOff=.34,sideRail=(x,z,w,d)=>box(x,A.y+.86,z,w,.06,d,trim);
  sideRail(hx0-railOff,h.z,.06,h.d);sideRail(hx1+railOff,h.z,.06,h.d);rail(h.x,hz1+.04,h.w+2*railOff+.06,.06);
  for(const x of [hx0-railOff,hx1+railOff])for(const z of [hz0+.05,h.z,hz1])box(x,A.y+.43,z,.06,.86,.06,trim);
  // Furnishings: rug, beanbag, low table, toy chest, fairy lights, posters.
  const rug=new T.Mesh(new T.CircleGeometry(1.15,32),mat(0x7b5aa6,1));rug.rotation.x=-Math.PI/2;rug.position.set(OLIVIA_SPOT.x-.2,A.y+.025,OLIVIA_SPOT.z+.45);rug.receiveShadow=true;world.add(rug);
  const tableTop=box(OLIVIA_SPOT.x-.65,A.y+.36,OLIVIA_SPOT.z+.75,.7,.05,.5,trim);for(const dx of [-.3,.3])for(const dz of [-.2,.2])box(OLIVIA_SPOT.x-.65+dx,A.y+.17,OLIVIA_SPOT.z+.75+dz,.05,.34,.05,trim);
  colliders.push({x:OLIVIA_SPOT.x-.65,z:OLIVIA_SPOT.z+.75,w:.7,d:.5,minY:A.y,maxY:A.y+.4,furnishing:true});void tableTop;
  const chest=box(x0+.5,A.y+.3,z0+.55,.9,.6,.55,mat(0xc26b55,.8));solidMeshes.push(chest);colliders.push({x:x0+.5,z:z0+.55,w:.9,d:.55,minY:A.y,maxY:A.y+.6,furnishing:true});
  box(x0+.5,A.y+.62,z0+.55,.95,.05,.6,mat(0xf0c66b,.6));
  const bulbs=new T.MeshBasicMaterial({color:0xffe2a0}),bulbGeo=new T.SphereGeometry(.035,8,6);
  for(let i=0;i<14;i++){const f=i/13,b=new T.Mesh(bulbGeo,i%3===1?new T.MeshBasicMaterial({color:0xffa8d8}):bulbs);b.position.set(x0+.2+f*(A.w-.4),top-.32-Math.sin(f*Math.PI*3)*.08,z0+.06);world.add(b);}
  const poster=(x,z,rotation,colors)=>{const c=document.createElement('canvas');c.width=128;c.height=176;const g=c.getContext?.('2d');if(g){const bg=g.createLinearGradient(0,0,0,176);bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);g.fillStyle=bg;g.fillRect(0,0,128,176);g.fillStyle=colors[2];g.beginPath();g.arc(64,74,34,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.font='bold 18px sans-serif';g.textAlign='center';g.fillText(colors[3],64,150);}
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(.5,.69),new T.MeshStandardMaterial({map:tex,roughness:.9}));m.position.set(x,A.y+1.55,z);m.rotation.y=rotation;world.add(m);};
  poster(x0+.012,A.z-1.2,Math.PI/2,['#5ec8f2','#2a5fa8','#ffd447','LEVEL UP']);poster(x0+.012,A.z+.4,Math.PI/2,['#ff9fcf','#8a4fd1','#ffffff','BEST DOG']);
  // A warm little lamp for the room, sharing the estate's light pool.
  upperFixtures?.push({x:A.x,y:top-.45,z:A.z-1.2,floor:A.y,intensity:4.5,distance:5.5,attic:true});

  // ---- The hatch and its pull-down stairs (dynamic) ----
  const S=A.stair,run=S.bottomZ-S.topZ,rise=S.topY-S.baseY,length=Math.hypot(run,rise),pitch=Math.atan2(rise,run);
  const hatchMat=M.wall.clone();hatchMat.color.set(0x9e9583);
  const hatch=new T.Group();hatch.name='Attic hatch';hatch.position.set(h.x,UPPER_CEILING,hz0);world.add(hatch);
  const door=new T.Mesh(new T.BoxGeometry(h.w-.04,.06,h.d-.04),hatchMat);door.position.set(0,.03,h.d/2);door.castShadow=door.receiveShadow=true;hatch.add(door);
  const pull=new T.Mesh(new T.TorusGeometry(.05,.012,6,16),M.gold);pull.position.set(0,-.05,h.d-.25);hatch.add(pull);
  const stairs=new T.Group();stairs.name='Attic pull-down stairs';world.add(stairs);
  const wood=mat(0x8a6a48,.8),treads=[],stringers=[];
  const treadGeo=new T.BoxGeometry(S.w-.16,.05,.24),stringerGeo=new T.BoxGeometry(.07,.16,1);
  const at=f=>new T.Vector3(S.x,S.baseY+rise*f,S.bottomZ-run*f);
  for(let i=0;i<S.steps;i++){const f=(i+.5)/S.steps,m=new T.Mesh(treadGeo,wood);m.userData.final=at(f).add(new T.Vector3(0,-.02,0));m.castShadow=m.receiveShadow=true;stairs.add(m);treads.push(m);}
  for(const side of [-1,1]){
    // Each stringer hangs from the hatch and stretches down the slope.
    const pivot=new T.Group();pivot.position.copy(at(1)).add(new T.Vector3(side*(S.w/2-.05),-.08,0));pivot.rotation.x=pitch;stairs.add(pivot);
    const m=new T.Mesh(stringerGeo,wood);m.position.set(0,0,length/2);m.scale.z=length;m.castShadow=true;pivot.add(m);stringers.push(pivot);
  }
  const handrail=new T.Group();handrail.position.copy(at(1)).add(new T.Vector3(S.w/2-.05,.8,0));handrail.rotation.x=pitch;stairs.add(handrail);
  const handBar=new T.Mesh(new T.CylinderGeometry(.025,.025,1,8),trim);handBar.rotation.x=Math.PI/2;handBar.position.z=length/2;handBar.scale.y=length;handrail.add(handBar);
  for(const o of [hatch,stairs])o.traverse(n=>{n.userData.dynamic=true;});
  const smooth=v=>{v=Math.min(1,Math.max(0,v));return v*v*(3-2*v);};
  let progress=0;
  // 0 closed → 1 hatch open and every tread in place.
  function setProgress(p){
    progress=Math.min(1,Math.max(0,p));
    hatch.rotation.x=smooth(progress/.3)*Math.PI*.5;door.visible=true;
    const unfold=smooth((progress-.2)/.5);for(const s of stringers){s.scale.z=Math.max(.001,unfold);s.visible=unfold>0;}
    handrail.scale.z=Math.max(.001,smooth((progress-.55)/.4));handrail.visible=progress>.55;
    const topPos=at(1);
    for(const [i,m] of treads.entries()){const k=smooth((progress-.3-(S.steps-1-i)*.03)/.25);m.visible=k>0;m.position.lerpVectors(topPos,m.userData.final,k);m.rotation.x=(1-k)*.6;}
    hatch.updateMatrixWorld(true);stairs.updateMatrixWorld(true);
  }
  setProgress(0);

  // ---- Olivia ----
  const olivia=buildOlivia();olivia.group.position.set(OLIVIA_SPOT.x,A.y,OLIVIA_SPOT.z);olivia.group.rotation.y=OLIVIA_SPOT.yaw;world.add(olivia.group);
  colliders.push({x:OLIVIA_SPOT.x,z:OLIVIA_SPOT.z,w:.9,d:.9,minY:A.y,maxY:A.y+1.0,attic:true});
  const tablet=buildTablet();tablet.position.set(OLIVIA_SPOT.x-.65,A.y+.39,OLIVIA_SPOT.z+.72);tablet.rotation.y=OLIVIA_SPOT.yaw+Math.PI+.45;/* screen turned toward her */world.add(tablet);
  const station={type:'olivia',name:'OLIVIA',x:OLIVIA_SPOT.x+Math.sin(OLIVIA_SPOT.yaw)*.75,z:OLIVIA_SPOT.z+Math.cos(OLIVIA_SPOT.yaw)*.75,y:A.y,price:0,hex:'#c9a6ff',secret:true,used:false};
  interactables.push(station);
  // Tag everything solid the attic added, so it can be told apart from the house.
  for(let i=firstCollider;i<colliders.length;i++)colliders[i].attic=true;
  return {hatch,stairs,treads,station,olivia,tablet,setProgress,get progress(){return progress;},
    update(dt,{player,celebrate=false}={}){olivia.update(dt,player,celebrate);}};
}

function buildTablet(){
  const g=new T.Group();g.name='Olivia’s tablet';
  const c=document.createElement('canvas');c.width=256;c.height=160;const x=c.getContext?.('2d');
  if(x){
    const sky=x.createLinearGradient(0,0,0,160);sky.addColorStop(0,'#7ad7ff');sky.addColorStop(1,'#d8f5ff');x.fillStyle=sky;x.fillRect(0,0,256,160);
    x.fillStyle='#5cc85a';x.beginPath();x.ellipse(60,170,110,60,0,0,Math.PI*2);x.ellipse(210,175,100,70,0,0,Math.PI*2);x.fill();
    x.fillStyle='#ffd447';x.beginPath();x.arc(214,34,16,0,Math.PI*2);x.fill();
    // A tiny pixel dragon-pup, because of course.
    x.fillStyle='#f7f2e6';x.fillRect(110,92,34,18);x.fillRect(138,84,16,16);x.fillStyle='#c0392b';x.fillRect(120,80,14,10);x.fillRect(100,96,10,6);
    x.fillStyle='#222';x.fillRect(148,88,3,3);x.fillStyle='#ff8a3d';x.fillRect(156,92,14,4);x.fillStyle='#ffd447';x.fillRect(168,90,8,8);
    x.fillStyle='#fff';x.font='bold 14px sans-serif';x.fillText('★ 2,460',10,20);
  }
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  const bezel=new T.Mesh(new T.BoxGeometry(.27,.18,.012),new T.MeshStandardMaterial({color:0x1a1c1f,roughness:.4}));g.add(bezel);
  const screen=new T.Mesh(new T.PlaneGeometry(.245,.155),new T.MeshBasicMaterial({map:tex}));screen.position.z=.0065;g.add(screen);
  const stand=new T.Mesh(new T.BoxGeometry(.2,.02,.12),new T.MeshStandardMaterial({color:0x6d6f73,roughness:.5}));stand.position.set(0,-.09,-.05);g.add(stand);
  g.rotation.x=-.25;g.position.y=.09;return g;
}

// A little girl sitting cross-legged on a beanbag, playing with a controller.
function buildOlivia(){
  const g=new T.Group();g.name='Olivia';
  const mat=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness});
  const skin=mat(0xf1c6a3,.7),hair=mat(0x4b2a1a,.9),hoodie=mat(0xb895e0,.95),jeans=mat(0x41557f,.95),shoe=mat(0xf4f1ec,.6),dark=mat(0x1d1f22,.45),pink=mat(0xf28fa8,.7),bag=mat(0x6a4fb0,1);
  const sphere=new T.SphereGeometry(1,16,12),cyl=new T.CylinderGeometry(1,1,1,12);
  const ell=(p,m,pos,sc,rot)=>{const o=new T.Mesh(sphere,m);o.position.set(...pos);o.scale.set(...sc);if(rot)o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
  const rod=(p,m,a,b,r)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),o=new T.Mesh(cyl,m);o.position.copy(A).add(B).multiplyScalar(.5);o.scale.set(r,A.distanceTo(B),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.clone().sub(A).normalize());o.castShadow=true;p.add(o);return o;};
  ell(g,bag,[0,.13,-.1],[.42,.15,.38]);ell(g,bag,[0,.3,-.36],[.38,.25,.15]);
  const body=new T.Group();body.position.set(0,.36,0);g.add(body);
  // Crossed legs and sneakers.
  for(const s of [-1,1]){rod(body,jeans,[s*.08,0,.02],[-s*.12,-.05,.26],.055);rod(body,jeans,[-s*.12,-.05,.26],[s*.16,-.07,.3],.048);ell(body,shoe,[s*.19,-.07,.3],[.05,.04,.075]);}
  ell(body,jeans,[0,.02,0],[.15,.08,.12]);
  const torso=new T.Group();torso.position.set(0,.05,0);body.add(torso);
  ell(torso,hoodie,[0,.2,0],[.15,.22,.12]);ell(torso,hoodie,[0,.36,-.07],[.11,.06,.07]);ell(torso,mat(0xd9c5f2),[0,.12,.11],[.07,.05,.015]);
  const head=new T.Group();head.position.set(0,.5,0);torso.add(head);
  ell(head,skin,[0,.08,0],[.11,.12,.105]);
  ell(head,hair,[0,.12,-.02],[.122,.12,.115]);ell(head,hair,[0,.17,.06],[.1,.04,.06]);
  for(const s of [-1,1]){ell(head,hair,[s*.13,.06,-.03],[.045,.07,.045]);ell(head,pink,[s*.12,.12,-.03],[.02,.02,.02]);
    ell(head,dark,[s*.04,.08,.098],[.014,.018,.008]);ell(head,mat(0xffffff,.3),[s*.036,.088,.104],[.005,.005,.003]);ell(head,mat(0xf5a3a0,.8),[s*.06,.045,.09],[.02,.012,.006]);}
  const smile=new T.Mesh(new T.TorusGeometry(.022,.004,6,12,Math.PI),mat(0xa0453f,.6));smile.position.set(0,.04,.103);smile.rotation.z=Math.PI;head.add(smile);
  // Arms reach forward to hold the controller in her lap.
  const arms=[];
  for(const s of [-1,1]){const shoulder=new T.Group();shoulder.position.set(s*.15,.33,0);torso.add(shoulder);rod(shoulder,hoodie,[0,0,0],[-s*.02,-.15,.1],.042);rod(shoulder,hoodie,[-s*.02,-.15,.1],[-s*.07,-.17,.24],.036);ell(shoulder,skin,[-s*.08,-.17,.26],[.03,.025,.035]);arms.push(shoulder);}
  const pad=new T.Group();pad.position.set(0,.16,.27);torso.add(pad);
  ell(pad,dark,[0,0,0],[.075,.022,.045]);for(const s of [-1,1])ell(pad,dark,[s*.06,-.012,-.012],[.032,.028,.04],[.5,0,0]);
  const btn=(c,x,z)=>ell(pad,new T.MeshBasicMaterial({color:c}),[x,.02,z],[.007,.004,.007]);
  btn(0x3fbf5a,.035,.012);btn(0xd8433a,.047,0);btn(0x3a7bd8,.023,0);btn(0xf0c13a,.035,-.012);
  for(const x of [-.035,.012])ell(pad,mat(0x2c2f33),[x,.022,x<0?-.006:.012],[.011,.006,.011]);
  g.traverse(o=>{if(o.isMesh)o.userData.dynamic=true;});
  let time=0,cheer=0;
  return {group:g,head,torso,arms,pad,
    update(dt,player,celebrate){
      time+=dt;cheer=celebrate?Math.min(1,cheer+dt*3):Math.max(0,cheer-dt*1.5);
      // Busy thumbs and a little head bob; she looks up when you come close.
      pad.rotation.z=Math.sin(time*6)*.05*(1-cheer);pad.position.y=.16+Math.sin(time*9)*.004+cheer*.25;
      const near=player?Math.hypot(player.x-(g.position.x),player.z-g.position.z)<3&&Math.abs(player.y-g.position.y)<1:false;
      const look=near&&player?Math.atan2(player.x-g.position.x,player.z-g.position.z)-g.rotation.y:0;
      head.rotation.y=T.MathUtils.lerp(head.rotation.y,near?Math.max(-.8,Math.min(.8,Math.atan2(Math.sin(look),Math.cos(look)))):Math.sin(time*.7)*.15,Math.min(1,dt*4));
      head.rotation.x=near?-.12:.18+Math.sin(time*2.2)*.03;
      for(const [i,a] of arms.entries())a.rotation.x=-cheer*2.4+Math.sin(time*6+i)*.02;
      torso.rotation.z=Math.sin(time*1.3)*.02+cheer*Math.sin(time*10)*.08;
    }
  };
}
