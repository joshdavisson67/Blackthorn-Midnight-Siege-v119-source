import * as T from './three.module.js';
import {columnSurfaceGeometry} from './column-surfaces.mjs?v=93';
import {GRAVEYARD,MAUSOLEUM,GRAVE_PLOTS,SARCOPHAGUS} from './graveyard-layout.mjs?v=28';
import {alignGrassPatch,CEMETERY_PATHS} from './grounds.mjs?v=131';
import {createMausoleumNuke} from './mausoleum-nuke.mjs?v=61';
export function buildGraveyard({world,M,earth,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated}){
  const fixtures=new T.MeshStandardMaterial({color:0xffc777,emissive:0xff9c44,emissiveIntensity:1.2,roughness:.4});
  const graveStone=M.stone.clone(),iron=M.dark,stone=M.brick,doors=[],graves=[];
  graveStone.name='cemetery-headstone';
  // The extended cemetery opens through the former east boundary fence.
  alignGrassPatch(box(68,-.22,-3,24,.3,42,earth));
  for(const {x,z,w,d,y} of CEMETERY_PATHS)box(x,y,z,w,.10,d,M.wetStone);
  for(const z of [-24,18]){box(67,.5,z,26,1,.4,stone,world,true);colliders.push({x:67,z,w:26,d:.4,minY:0,maxY:2.6});for(let x=54;x<=80;x+=1.3){cylinder(x,1.75,z,.027,1.5,iron);const finial=mesh(new T.ConeGeometry(.08,.21,6),iron,[x,2.57,z]);}box(67,1.6,z,26,.055,.055,iron);box(67,2.24,z,26,.055,.055,iron);}
  box(80,.5,-3,.4,1,42,stone,world,true);colliders.push({x:80,z:-3,w:.4,d:42,minY:0,maxY:2.6});for(let z=-24;z<=18;z+=1.3){cylinder(80,1.75,z,.027,1.5,iron);mesh(new T.ConeGeometry(.08,.21,6),iron,[80,2.57,z]);}box(80,1.6,-3,.055,.055,42,iron);box(80,2.24,-3,.055,.055,42,iron);
  for(const z of [2.5,9.5]){box(54,1.15,z,.85,2.3,.85,M.stone,world,true);box(54,2.35,z,1,.15,1,M.stone);mesh(columnSurfaceGeometry(new T.ConeGeometry(.42,.48,4),M.stone),M.stone,[54,2.65,z]);}
  // Open iron arch at the entrance, without adding a lamp to the shader budget.
  box(54,3.55,6,.2,.15,7.3,iron);const entrySign=mesh(new T.PlaneGeometry(2.5,.64),label('BLACKTHORN\nFAMILY CEMETERY','#bcb79b',1024,{width:2.5,height:.64,kind:'room',maxLines:2}),[53.84,3.08,6]);entrySign.rotation.y=-Math.PI/2;
  function lantern(x,z){box(x,1.10,z,.32,.5,.32,iron);box(x,1.1,z,.23,.34,.23,fixtures);box(x,.5,z,.065,.7,.065,iron);mesh(new T.ConeGeometry(.25,.16,4),iron,[x,1.43,z]);}
  for(const x of [67.3,72.7])for(const z of [3,-7])lantern(x,z);
  const names=['E. BLACKTHORN','THE UNFORGOTTEN','A. WHITMORE','RESTLESS IN PEACE','R. VALE','THE HOUSE REMEMBERS'];
  for(const {x,z,column,row} of GRAVE_PLOTS){
    box(x,.012,z,1.25,.065,2.25,M.wetStone);
    const head=box(x,.66,z-1.02,.76,1.25,.23,graveStone);solidMeshes.push(head);
    const rounded=mesh(new T.CylinderGeometry(.38,.38,.23,16,1,false,-Math.PI/2,Math.PI),graveStone,[x,1.28,z-1.02]);rounded.rotation.x=-Math.PI/2;solidMeshes.push(rounded);
    colliders.push({x,z:z-1.02,w:.82,d:.28,minY:0,maxY:1.65});
    box(x,.89,z-.89,.045,.27,.027,iron);box(x,.94,z-.89,.18,.035,.027,iron);
    const inscription=mesh(new T.PlaneGeometry(.64,.32),label(names[(row+column*2)%names.length],'#b3b9ad',512,{width:.64,height:.32,kind:'inscription',maxLines:2}),[x,.53,z-.866]);
    if((row+column)%3===0){const cross=box(x+.06,.12,z+.54,.32,.2,.28,M.wood);box(x+.06,.23,z+.54,.28,.035,.31,M.gold);}
    graves.push({x,z,head});
  }
  // A small classical stone tomb, with an unobstructed, flush doorway.
  const {x,z,w,d,frontZ,doorWidth}=MAUSOLEUM;
  box(x,-.065,z,w+.6,.13,d+.6,M.wetStone);
  box(x,3.88,z,w+.65,.28,d+.65,M.trim,world,true);
  for(const xx of [x-w/2,x+w/2])box(xx,1.85,z,.40,3.7,d,stone,world,true);
  box(x,1.85,z-d/2,w,3.7,.40,stone,world,true);
  const sideWidth=(w-doorWidth)/2;
  for(const side of [-1,1])box(x+side*(doorWidth/2+sideWidth/2),1.85,frontZ,sideWidth,3.7,.40,stone,world,true);
  box(x,3.25,frontZ,doorWidth,.9,.40,stone,world,true);
  for(const side of [-1,1]){const xx=x+side*2.7;cylinder(xx,1.65,frontZ+.43,.22,3.1,M.stone);cylinder(xx,.12,frontZ+.43,.38,.24,M.stone);cylinder(xx,3.20,frontZ+.43,.38,.18,M.stone);for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(xx+Math.cos(a)*.21,1.65,frontZ+.43+Math.sin(a)*.21,.026,2.86,M.stone);}}
  box(x,3.49,frontZ+.18,w+.5,.18,.9,M.trim);box(x,4.08,frontZ+.13,w+.75,.17,.95,M.trim);
  const pediment=new T.BufferGeometry();pediment.setAttribute('position',new T.Float32BufferAttribute([-4.25,0,0,4.25,0,0,0,1.2,0],3));pediment.computeVertexNormals();const pedimentMat=M.stone.clone();pedimentMat.side=T.DoubleSide;mesh(pediment,pedimentMat,[x,4.18,frontZ+.62]);
  for(const side of [-1,1]){const edge=box(x+side*2.12,4.81,frontZ+.68,4.45,.15,.18,M.trim);edge.rotation.z=-side*Math.atan(1.2/4.25);}
  const crest=mesh(new T.CircleGeometry(.31,24),label('B\n1893','#c9bc8b',512,{width:.62,height:.62,kind:'crest',maxLines:2}),[x,4.55,frontZ+.66]);
  const arch=mesh(new T.TorusGeometry(1.45,.10,10,32,Math.PI),M.trim,[x,1.50,frontZ+.27]);
  const nameplate=mesh(new T.PlaneGeometry(2.35,.26),label('BLACKTHORN MAUSOLEUM','#c8b993',1024,{width:2.35,height:.26,kind:'room',maxLines:1}),[x,3.235,frontZ+.26]);
  const unlockSign=mesh(new T.PlaneGeometry(1.75,.45),label('SEALED UNTIL\nWAVE 20 IS CLEARED','#abcbda',1024,{width:1.75,height:.45,kind:'placard',maxLines:2}),[x,1.90,frontZ+.26]);unlockSign.userData.dynamic=true;
  const lock=new T.Group();lock.position.set(x,1.37,frontZ+.33);world.add(lock);box(0,0,0,.2,.25,.12,M.gold,lock);const shackle=mesh(new T.TorusGeometry(.09,.02,8,16,Math.PI),M.gold,[0,.13,0],null,lock);lock.traverse(o=>o.userData.dynamic=true);
  for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(x+side*doorWidth/2,0,frontZ);world.add(hinge);const panel=box(-side*doorWidth/4,1.38,0,doorWidth/2,2.76,.13,iron,hinge);solidMeshes.push(panel);for(const yy of [.2,1.06,1.9,2.6])box(-side*doorWidth/4,yy,.09,1.28,.06,.035,M.gold,hinge);for(let i=0;i<4;i++)box(-side*(.2+i*.28),1.38,.09,.035,2.36,.035,M.trim,hinge);box(-side*.15,1.31,.16,.07,.3,.075,M.gold,hinge);hinge.traverse(o=>o.userData.dynamic=true);doors.push({hinge,side,panel});}
  const gate={x,z:frontZ,w:doorWidth,d:.20,minY:0,maxY:3,disabled:false};colliders.push(gate);
  // The room itself is explorable: side passages circle a sculpted sarcophagus.
  const tomb=box(SARCOPHAGUS.x,.40,SARCOPHAGUS.z,2.25,.8,3.1,M.stone);solidMeshes.push(tomb);
  // The lid is its own moving group: Sir Blackthorn slides it off (v130).
  // A dark well beneath it reads as the hollow tomb once it is open.
  const well=mesh(new T.PlaneGeometry(1.95,2.8),new T.MeshBasicMaterial({color:0x050607}),[SARCOPHAGUS.x,.812,SARCOPHAGUS.z]);well.rotation.x=-Math.PI/2;well.castShadow=false;
  const lidGroup=new T.Group();lidGroup.name='Sarcophagus lid';lidGroup.position.set(SARCOPHAGUS.x,0,SARCOPHAGUS.z);world.add(lidGroup);
  const lid=box(0,.90,0,SARCOPHAGUS.w,.20,SARCOPHAGUS.d,M.trim,lidGroup);solidMeshes.push(lid);
  const lidInset=mesh(new T.PlaneGeometry(1.9,2.75),M.stone,[0,1.004,0],null,lidGroup);lidInset.rotation.x=-Math.PI/2;
  colliders.push({x:SARCOPHAGUS.x,z:SARCOPHAGUS.z,w:SARCOPHAGUS.w,d:SARCOPHAGUS.d,minY:0,maxY:SARCOPHAGUS.top});
  for(const side of [-1,1])for(const zz of [SARCOPHAGUS.z-1.2,SARCOPHAGUS.z+1.2])box(x+side*.8,.45,zz,.12,.6,.06,M.gold);
  box(0,1.024,0,.08,.026,1.8,M.gold,lidGroup);box(0,1.025,.35,.64,.026,.08,M.gold,lidGroup);
  lidGroup.traverse(o=>{o.userData.dynamic=true;});
  // 0 closed → 1 shoved back off the tomb, its far end resting on the floor
  // behind it. That dead-end strip becomes solid so nobody walks through it.
  const lidRest={x:SARCOPHAGUS.x,z:SARCOPHAGUS.z-SARCOPHAGUS.d/2-.95,w:SARCOPHAGUS.w,d:1.9,minY:0,maxY:1.05,disabled:true};colliders.push(lidRest);
  function openLid(progress){
    const p=Math.min(1,Math.max(0,progress)),slide=p*p*(3-2*p),tip=Math.max(0,(p-.5)/.5);
    lidGroup.position.set(SARCOPHAGUS.x,tip*.12,SARCOPHAGUS.z-slide*1.45);lidGroup.rotation.set(-tip*.32,0,0);lidGroup.updateMatrixWorld(true);
    lidRest.disabled=p<.5;
  }
  for(const xx of [x-3.4,x+3.4]){box(xx,1.8,z-1,.18,.58,.3,iron);box(xx+(xx<x?.10:-.10),1.8,z-1,.10,.40,.19,fixtures);}
  const epitaph=mesh(new T.PlaneGeometry(2.6,.62),label('THE HOUSE REMEMBERS\nTHOSE WHO DO NOT REST','#bdbbae',1024,{width:2.6,height:.62,kind:'memorial',maxLines:2}),[x,2.25,z-d/2+.26]);
  const station={type:'mausoleumDoor',x,z:frontZ,y:0,price:0,name:'BLACKTHORN MAUSOLEUM',hex:'#a6cbd7'};interactables.push(station);
  const nuke=createMausoleumNuke({world,colliders,solidMeshes,interactables,label,batchArticulated});
  let open=false,progress=0;
  function unlock(){if(open)return false;open=true;gate.disabled=true;lock.visible=false;unlockSign.visible=false;nuke.unlock();return true;}
  function update(dt){nuke.update(dt);if(!open||progress===1)return;progress=Math.min(1,progress+dt/1.6);const eased=progress*progress*(3-2*progress);for(const {hinge,side} of doors){hinge.rotation.y=-side*eased*1.72;hinge.updateMatrixWorld(true);}}
  function reset(){open=false;progress=0;gate.disabled=false;lock.visible=true;unlockSign.visible=true;nuke.reset();openLid(0);for(const {hinge} of doors){hinge.rotation.y=0;hinge.updateMatrixWorld(true);}}
  return {graves,doors,gate,station,nuke,lidGroup,openLid,unlock,update,reset,get open(){return open;},get progress(){return progress;}};
}
export function drawGraveyardMap(c,px,pz){c.fillStyle='#253e37';c.fillRect(px(54),pz(-24),26*(px(1)-px(0)),42*(pz(1)-pz(0)));c.strokeStyle='#7a8979';c.lineWidth=1;c.strokeRect(px(54),pz(-24),26*(px(1)-px(0)),42*(pz(1)-pz(0)));c.strokeStyle='#a99d77';c.lineWidth=4;c.beginPath();c.moveTo(px(54),pz(6));c.lineTo(px(70),pz(6));c.lineTo(px(70),pz(-9.5));c.stroke();c.fillStyle='#5e7170';c.fillRect(px(66),pz(-18.5),8*(px(1)-px(0)),9*(pz(1)-pz(0)));for(const x of [59,64,76])for(const z of [-19,-12,-5,1,12]){if(x===64&&z===-12)continue;c.fillStyle='#a5ada4';c.fillRect(px(x)-2,pz(z)-3,4,6);}c.fillStyle='#c6cfb3';c.textAlign='center';c.font='11px Arial';c.fillText('CEMETERY',px(67),pz(15));}
