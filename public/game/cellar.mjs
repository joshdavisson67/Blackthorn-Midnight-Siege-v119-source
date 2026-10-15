import * as T from './three.module.js';
import {CELLAR,isCellarOpen} from './cellar-layout.mjs?v=28';
import {createModelKit,drawStationMarker} from './station-models.mjs?v=118';
import {configureArmorStation} from './armor.mjs?v=94';
export function buildCellar({world,M,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated}){
  const {x:cx,z:cz,w,d,y,topZ,bottomZ,entryZ,stairWidth}=CELLAR;
  const kit=createModelKit(),{m,b}=kit,stone=M.brick;
  const cyan=new T.MeshStandardMaterial({color:0x80cbd2,emissive:0x3e9eb3,emissiveIntensity:.65,roughness:.65});
  const roomBox=(x,yy,z,...args)=>box(cx+x,yy,cz+z,...args);
  roomBox(0,y-.15,0,w+.6,.3,d+.6,M.stone,world,true);
  roomBox(0,-.38,0,w+.6,.24,d+.6,M.stone,world,true);
  for(const x of [-w/2,w/2])roomBox(x,-2.3,0,.4,3.8,d+.4,stone,world,true);
  roomBox(0,-2.3,d/2,w+.4,3.8,.4,stone,world,true);
  const wing=(w-stairWidth-.4)/2,wingX=stairWidth/2+.2+wing/2;
  for(const x of [-wingX,wingX])box(cx+x,-2.3,entryZ,wing,3.8,.4,stone,world,true);
  // A level, roofed passage links the relocated flight to the room under the
  // mansion. The surface above it stays walkable as a clear rear forecourt.
  const tunnelDepth=entryZ-bottomZ,tunnelZ=(entryZ+bottomZ)/2;
  const slabEnd=entryZ-.3,slabZ=(slabEnd+bottomZ)/2,slabDepth=slabEnd-bottomZ;
  box(cx,y-.15,slabZ,stairWidth+.4,.3,slabDepth,M.stone,world,true);
  box(cx,-.38,slabZ,stairWidth+.4,.24,slabDepth,M.stone,world,true);
  for(const side of [-1,1])box(cx+side*(stairWidth/2+.2),-2.3,tunnelZ,.4,3.8,tunnelDepth+.2,stone,world,true);
  for(const z of [bottomZ+1,entryZ-1])box(cx,-.65,z,stairWidth,.23,.24,M.dark);
  const stairDepth=bottomZ-topZ,stairZ=(topZ+bottomZ)/2;
  for(const side of [-1,1])box(cx+side*(stairWidth/2+.2),-1.9,stairZ,.4,4.6,stairDepth+.2,stone,world,true);
  for(let i=0;i<24;i++){
    const z=topZ+(i+.5)*stairDepth/24,top=y*(i+1)/24;
    const tread=box(cx,top-.09,z,stairWidth,.18,stairDepth/24,M.stone);solidMeshes.push(tread);
    box(cx,top+.008,z-stairDepth/24*.42,stairWidth-.05,.017,.035,M.gold);
  }
  for(const side of [-1,1]){const rail=box(cx+side*(stairWidth/2+.08),-1.05,stairZ,.055,.055,Math.hypot(stairDepth,y),M.dark);rail.rotation.x=Math.atan(-y/stairDepth);}
  for(const side of [-1,1])box(cx+side*(stairWidth/2+.2),.65,bottomZ+.18,.08,1.3,.08,M.dark);
  for(const yy of [.55,1.25])box(cx,yy,bottomZ+.18,stairWidth+.4,.055,.06,M.dark);
  colliders.push({x:cx,z:bottomZ+.18,w:stairWidth+.4,d:.18,minY:0,maxY:1.35});
  // Room ribs, conduits, cyan lamps and storage remain in the armory.
  for(const z of [-7,-2,3,8]){roomBox(0,-.65,z,w-.4,.23,.24,M.dark);for(const x of [-w/2+.35,w/2-.35])roomBox(x,-2.25,z,.22,3.1,.24,M.dark);}
  for(const x of [-w/2+.4,w/2-.4]){
    const pipe=cylinder(cx+x,-.9,cz,.065,d-2,M.gold);pipe.rotation.x=Math.PI/2;
    for(const z of [-6,2,8]){roomBox(x,-1.55,z,.16,.65,.35,M.dark);roomBox(x-Math.sign(x)*.12,-1.55,z,.09,.4,.22,cyan);}
  }
  for(const x of [-7.4,7.4])for(const z of [-4,1]){roomBox(x,y+.5,z,1.4,1,1.5,M.wood,world,true);roomBox(x,y+1.02,z,1.44,.055,1.54,M.gold);for(const dx of [-.46,.46])roomBox(x+dx,y+.5,z+.76,.07,.9,.03,M.dark);}
  const doors=[];
  for(const side of [-1,1]){
    const hinge=new T.Group();hinge.position.set(cx+side*stairWidth/2,.12,stairZ);world.add(hinge);
    const panel=box(-side*stairWidth/4,0,0,stairWidth/2,.14,stairDepth,M.dark,hinge);
    for(const z of [-3.5,-1.2,1.2,3.5])box(-side*stairWidth/4,.09,z,1.6,.075,.12,M.gold,hinge);
    for(let i=0;i<7;i++)box(-side*stairWidth/4,.082,-3.4+i*1.12,1.58,.02,.025,M.stone,hinge);
    box(-side*.17,.17,-2.6,.08,.17,.42,M.gold,hinge);hinge.traverse(o=>{o.userData.dynamic=true;});solidMeshes.push(panel);doors.push({hinge,side});
  }
  const gate={x:cx,z:stairZ,w:stairWidth,d:stairDepth,minY:-4.4,maxY:1,disabled:false};colliders.push(gate);
  const sign=mesh(new T.PlaneGeometry(2.6,.72),label('STORM CELLAR\nUNSEALS AT WAVE 10','#80cbd2',1024,{width:2.6,height:.72,kind:'placard',maxLines:2}),[cx+3.7,1.65,topZ+.92]);sign.rotation.y=Math.PI;
  box(cx+3.7,.72,topZ+1,.10,1.86,.10,M.dark);
  function exhibit(type,dx,dz,name,model,price,caption){
    const x=cx+dx,z=cz+dz,g=new T.Group();g.position.set(x,y,z);world.add(g);
    b(g,0,.42,0,2,.84,.95,m.wood);b(g,0,.88,0,2.1,.08,1,m.brass);model.position.y=1.4;g.add(model);model.traverse(o=>o.userData.dynamic=true);
    const plaque=new T.Mesh(new T.PlaneGeometry(1.78,.60),label(name+'\n'+price.toLocaleString()+' ESSENCE\n'+caption,'#8ee0df',1024,{width:1.78,height:.60,kind:'placard',maxLines:3}));plaque.position.set(0,.45,-.518);plaque.rotation.y=Math.PI;g.add(plaque);
    const s={type,x,z,y,price,name,hex:'#8ee0df',model,used:false};
    if(type==='armor'){
      const nanoModel=kit.nanoShield();nanoModel.position.y=1.2;g.add(nanoModel);
      const nanoRank2Model=kit.nanoShield(2);nanoRank2Model.position.y=1.2;g.add(nanoRank2Model);
      const nanoRank3Model=kit.nanoShield(3);nanoRank3Model.position.y=1.2;g.add(nanoRank3Model);
      configureArmorStation(s,{nanoModel,nanoRank2Model,nanoRank3Model,plates:[plaque],label});
    }
    colliders.push({x,z,w:2.1,d:1,minY:y,maxY:y+2});g.traverse(o=>{if(o.isMesh&&!o.userData.dynamic)solidMeshes.push(o);});
    interactables.push(s);return s;
  }
  const lmg=kit.gun('lmg');lmg.scale.setScalar(1.25);lmg.rotation.y=Math.PI;
  const display=lmg.children[0];
  batchArticulated?.(display.userData.body);batchArticulated?.(display.userData.optic.housing);
  const weapon=exhibit('lmg',-3.4,8,'WARDEN / BELT-FED LMG',lmg,5000,'3× SCOPE · AWAKENS THE HORDE');
  const armorStation=exhibit('armor',3.4,8,'AEGIS / BODY ARMOR',kit.armor(),2500,'SEPARATE HEALTH SHIELD');
  let progress=0;
  function update(dt){if(progress===(isCellarOpen()?1:0))return;progress=T.MathUtils.clamp(progress+(isCellarOpen()?dt/1.8:-dt*4),0,1);for(const {hinge,side} of doors){hinge.rotation.z=-side*progress*1.82;hinge.updateMatrixWorld(true);}}
  function reset(){progress=0;gate.disabled=false;for(const {hinge} of doors)hinge.rotation.z=0;weapon.used=false;weapon.model.visible=true;armorStation.setArmorTier(0);}
  return {doors,gate,weapon,armor:armorStation,update,reset,get progress(){return progress;}};
}
export function drawCellarMap(canvas,player,stations,yaw){
  const c=canvas.getContext('2d'),scaleX=22,scaleZ=(canvas.height-160)/(CELLAR.z+CELLAR.d/2-CELLAR.topZ);
  const sx=x=>canvas.width/2+(x-CELLAR.x)*scaleX,sz=z=>100+(z-CELLAR.topZ)*scaleZ;
  c.fillStyle='#09131b';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#b9d3cd';c.font='22px Georgia';c.textAlign='center';c.fillText('STORM CELLAR / UNDERGROUND ARMORY',canvas.width/2,40);
  c.fillStyle='#263c42';c.fillRect(sx(CELLAR.x-CELLAR.w/2),sz(CELLAR.entryZ),CELLAR.w*scaleX,CELLAR.d*scaleZ);
  c.fillRect(sx(CELLAR.x-CELLAR.stairWidth/2),sz(CELLAR.topZ),CELLAR.stairWidth*scaleX,(CELLAR.entryZ-CELLAR.topZ)*scaleZ);
  c.strokeStyle='#658c92';c.strokeRect(sx(CELLAR.x-CELLAR.w/2),sz(CELLAR.entryZ),CELLAR.w*scaleX,CELLAR.d*scaleZ);
  for(let z=CELLAR.topZ+.5;z<CELLAR.bottomZ;z+=.5){c.beginPath();c.moveTo(sx(CELLAR.x-CELLAR.stairWidth/2),sz(z));c.lineTo(sx(CELLAR.x+CELLAR.stairWidth/2),sz(z));c.stroke();}
  c.font='12px Arial';c.fillStyle='#c8c7aa';c.fillText('STAIRS TO NORTHWEST GROUNDS',canvas.width/2,72);
  for(const s of stations)if(s.y<0&&!s.used)drawStationMarker(c,s,sx(s.x),sz(s.z));
  c.save();c.translate(sx(player.x),sz(player.z));c.rotate(-yaw);c.fillStyle='#fff4c7';c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(6,7);c.closePath();c.fill();c.restore();
  c.fillStyle='#c8c7aa';c.font='12px Arial';c.fillText('LM LMG · AR ARMOR · N1 / N2 / N3 NANO SHIELD · F SOUL FORGE',canvas.width/2,canvas.height-24);
}
