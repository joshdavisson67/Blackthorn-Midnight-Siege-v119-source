import * as T from './three.module.js';
import {isBlocked} from './core.mjs?v=116';
import {UPPER_Y,moveActor,updateActorHeight,supportBelow,stairHeight} from './vertical.mjs?v=116';
import {cellarStairHeight} from './cellar-layout.mjs?v=28';

export const BELLA=Object.freeze({price:670,radius:12*.9144,bodyRadius:.22,height:.82,damage:48,biteInterval:.9,biteReach:.95,x:-30.3,z:-10.8,y:UPPER_Y});
export const BELLA_PAW='<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="8" cy="10" rx="3.2" ry="4.2"/><ellipse cx="15" cy="7" rx="3.2" ry="4.2"/><ellipse cx="23" cy="10" rx="3.2" ry="4.2"/><ellipse cx="27" cy="17" rx="2.7" ry="3.6"/><path d="M7 24c0-4 5-10 10-10s9 6 9 10-5 5-9 3-10 1-10-3z"/></svg>';

// One cached articulated model. Coat tufts are merged per joint before entry;
// moving, biting and restarting allocate no model geometry or materials.
function createBellaModel(batchArticulated){
  const group=new T.Group();group.name='Bella / white Maltipoo';
  const material=(color,roughness=1)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
  const fur=material(0xf3eee3),cream=material(0xe6decc),eye=material(0x211510,.22),nose=material(0x765044,.58),black=material(0x130e0b,.3),glint=new T.MeshBasicMaterial({color:0xfaf8ef}),pink=material(0xb77f78),collar=material(0x773c43),gold=material(0xb99b62,.45);
  const sphere=new T.SphereGeometry(1,18,12),tuft=new T.SphereGeometry(1,8,6),box=new T.BoxGeometry(1,1,1);
  // Small surface undulations keep the white silhouette soft without alpha
  // shells, temporal effects or noisy high-frequency normal maps.
  const coat=sphere.clone(),vertices=coat.attributes.position;
  for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),f=1+.018*Math.sin(x*19+y*13)*Math.cos(z*17-y*11);vertices.setXYZ(i,x*f,y*f,z*f);}coat.computeVertexNormals();
  function ell(parent,x,y,z,sx,sy,sz,mat=fur,name='',geometry=coat){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;}
  function joint(parent,name,x,y,z){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function feather(parent,x,y,z,sx,sy,sz,angle=0,mat=fur){const m=ell(parent,x,y,z,sx,sy,sz,mat,'Soft coat lock',tuft);m.rotation.z=angle;return m;}
  const root=joint(group,'Bella body',0,.40,0);
  ell(root,0,0,-.12,.205,.215,.37,fur,'Fluffy torso');ell(root,0,.015,.12,.19,.215,.20,fur,'Chest ruff');
  for(let i=0;i<28;i++){const angle=i*2.39996,z=-.42+(i%7)*.09;feather(root,Math.cos(angle)*.18,Math.sin(angle)*.18,z,.058,.082,.092,(i%5-2)*.22,i%5===0?cream:fur);}
  const head=joint(root,'Bella head',0,.20,.32);
  ell(head,0,.005,0,.215,.225,.20,fur,'Round Maltipoo head');
  // The reference has long floppy ears, a shaggy forehead and warm brown nose.
  const ears=[];for(const side of [-1,1]){
    const ear=joint(head,'Floppy ear',side*.185,.065,-.025);ears.push(ear);
    ell(ear,side*.015,-.105,.006,.083,.195,.11,cream,'Silky hanging ear');
    for(let i=0;i<7;i++)feather(ear,side*(.035+i%2*.02),-.025-i*.035,.047,.038,.095,.059,-side*.15,fur);
    ell(head,side*.112,.017,.173,.047,.051,.027,eye,'Dark brown eye',sphere);
    ell(head,side*.112,.018,.196,.026,.030,.006,black,'Pupil',sphere);
    ell(head,side*.104,.033,.201,.008,.010,.004,glint,'Eye catchlight',sphere);
    ell(head,side*.085,-.09,.224,.105,.090,.133,fur,'White muzzle');
    for(let i=0;i<6;i++)feather(head,side*(.026+i*.026),.12-(i%3)*.027,.142,.040,.106,.048,side*(.22+i*.1));
    for(let i=0;i<5;i++)feather(head,side*(.044+i*.026),-.098-i*.012,.274,.024,.064,.065,-side*.65);
  }
  ell(head,0,-.064,.326,.057,.045,.036,nose,'Brown button nose',sphere);
  for(const side of [-1,1])ell(head,side*.025,-.057,.356,.010,.008,.005,black,'Nostril',sphere);
  const jaw=joint(head,'Bella bite jaw',0,-.138,.216);
  ell(jaw,0,-.014,.026,.112,.051,.109,cream,'Chin fluff');ell(jaw,0,.020,.065,.07,.012,.063,black,'Mouth',sphere);
  const tongue=ell(jaw,0,.026,.087,.030,.008,.043,pink,'Small pink tongue',sphere);
  const legs=[];
  for(const side of [-1,1])for(const front of [false,true]){
    const leg=joint(root,front?'Front leg':'Hind leg',side*.145,-.035,front?.185:-.34);
    ell(leg,0,-.125,0,.080,.15,.081,fur,'Furry leg');ell(leg,0,-.28,.045,.097,.069,.126,fur,'Rounded paw');
    for(let i=0;i<4;i++)feather(leg,side*.058,-.09-i*.052,.025,.035,.068,.059,-side*.1);
    legs.push({joint:leg,front,side});
  }
  const tail=joint(root,'Curled plume tail',0,.10,-.43);
  ell(tail,0,.072,-.03,.072,.115,.075,fur,'Tail stem');
  const curl=new T.Mesh(new T.TorusGeometry(.135,.058,8,20,Math.PI*1.72),fur);curl.rotation.y=Math.PI/2;curl.rotation.z=.20;curl.position.set(0,.19,-.09);curl.castShadow=curl.receiveShadow=true;tail.add(curl);
  for(let i=0;i<9;i++){const a=i/8*Math.PI*1.6;feather(tail,0,.19+Math.sin(a)*.14,-.09+Math.cos(a)*.14,.064,.069,.079,.2);}
  const strap=new T.Mesh(new T.TorusGeometry(.145,.022,6,20),collar);strap.position.set(0,.114,.16);strap.rotation.x=.65;root.add(strap);
  ell(root,.08,.068,.277,.042,.045,.014,gold,'Bella heart-shaped name tag',sphere);
  const tag=new T.Mesh(box,gold);tag.position.set(.08,.043,.279);tag.scale.set(.040,.033,.022);tag.rotation.z=Math.PI/4;root.add(tag);
  batchArticulated(group);group.traverse(o=>{o.userData.dynamic=true;o.userData.companion='Bella';});
  return {group,root,head,ears,jaw,tongue,legs,tail,phase:0,motion:0,time:0};
}

function animateBella(rig,dt,moved,biteTime,unlocked){
  rig.time+=dt;rig.phase+=moved*12;rig.motion=T.MathUtils.damp(rig.motion,Math.min(1,moved/Math.max(.001,dt*3.8)),12,dt);
  const p=rig.phase,w=rig.motion,bite=biteTime>=0?Math.sin(Math.min(1,biteTime/.55)*Math.PI):0;
  rig.root.position.y=.40+Math.cos(p*2)*.014*w+Math.sin(rig.time*2.1)*.006;
  rig.root.position.z=bite*.09;rig.root.rotation.x=-bite*.12;
  for(const {joint,front,side} of rig.legs){joint.rotation.x=Math.sin(p+(front?(side<0?0:Math.PI):(side<0?Math.PI:0)))*.49*w+(front?-bite*.18:bite*.12);}
  rig.head.rotation.x=-bite*.2+Math.sin(rig.time*1.7)*.025;rig.head.rotation.y=Math.sin(rig.time*.8)*.045*(1-w);
  rig.jaw.rotation.x=bite*.38;rig.tongue.visible=biteTime>=0;
  for(let i=0;i<rig.ears.length;i++){rig.ears[i].rotation.x=Math.sin(p+1)*.17*w;rig.ears[i].rotation.z=(i?1:-1)*(.06+Math.sin(rig.time*2)*.018);}
  rig.tail.rotation.z=Math.sin(rig.time*(unlocked?7:3))*(unlocked?.32:.13);rig.tail.rotation.x=Math.sin(p*2)*.08*w;
}

function buildKennel({world,colliders,solidMeshes,batchArticulated,interactables}){
  const group=new T.Group();group.name='Bella’s bedroom kennel';group.position.set(BELLA.x,BELLA.y,BELLA.z);world.add(group);
  const wood=new T.MeshStandardMaterial({color:0x604735,roughness:.84}),metal=new T.MeshStandardMaterial({color:0x697879,roughness:.5,metalness:.65}),bed=new T.MeshStandardMaterial({color:0x6d4950,roughness:1}),brass=new T.MeshStandardMaterial({color:0xb79a63,roughness:.45,metalness:.6});
  const box=new T.BoxGeometry(1,1,1),bar=new T.CylinderGeometry(1,1,1,8);
  function part(parent,geometry,x,y,z,w,h,d,material,name=''){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;}
  const b=(parent,x,y,z,w,h,d,m,name)=>part(parent,box,x,y,z,w,h,d,m,name);
  b(group,0,.045,0,1.78,.09,1.67,wood,'Kennel base');b(group,0,.12,-.02,1.56,.10,1.39,bed,'Bella’s padded bed');
  b(group,0,1.22,0,1.85,.10,1.75,wood,'Kennel roof');
  for(const side of [-1,1]){
    for(const z of [-.79,.79])b(group,side*.86,.64,z,.07,1.20,.07,wood,'Kennel corner');
    for(const y of [.18,1.13])b(group,side*.86,y,0,.06,.065,1.6,metal,'Side rail');
    for(let i=0;i<9;i++)part(group,bar,side*.86,.65,-.65+i*.16,.012,.92,.012,metal,'Kennel side bar');
  }
  b(group,0,.64,-.80,1.72,1.16,.06,wood,'Kennel rear panel');
  const gate=new T.Group();gate.name='Bella kennel hinged door';gate.position.set(-.83,.16,.82);group.add(gate);
  for(const y of [0,.97])b(gate,.83,y,0,1.66,.055,.05,metal,'Door rail');
  for(const x of [0,1.66])b(gate,x,.485,0,.045,1,.05,metal,'Door edge');
  for(let i=1;i<11;i++)part(gate,bar,i*.15,.485,0,.012,.95,.012,metal,'Door bar');
  const latch=b(gate,1.55,.50,.035,.12,.10,.07,brass,'Kennel latch');
  b(group,0,1.41,.855,1.46,.32,.045,wood,'Bella nameplate');
  // Raised brass lettering remains sharp at any distance and uses no extra
  // canvas texture in the mansion's already-full sign atlas budget.
  const glyphs={
    B:[[[0,0],[0,1],[.6,1],[.92,.83],[.92,.66],[.6,.5],[0,.5]],[[.6,.5],[1,.34],[1,.17],[.6,0],[0,0]]],
    E:[[[1,1],[0,1],[0,0],[1,0]],[[0,.5],[.85,.5]]],L:[[[0,1],[0,0],[1,0]]],
    A:[[[0,0],[.5,1],[1,0]],[[.2,.4],[.8,.4]]],
    6:[[[.9,1],[.28,1],[0,.73],[0,.22],[.25,0],[.75,0],[1,.22],[1,.43],[.75,.63],[0,.63]]],
    7:[[[0,1],[1,1],[.24,0]]],0:[[[.24,0],[.76,0],[1,.24],[1,.76],[.76,1],[.24,1],[0,.76],[0,.24],[.24,0]]]
  };
  function lettering(text,y,height,width,gap,thickness){
    const left=-(text.length*width+(text.length-1)*gap)/2;
    for(let i=0;i<text.length;i++)for(const stroke of glyphs[text[i]])for(let j=1;j<stroke.length;j++){
      const a=stroke[j-1],c=stroke[j],dx=(c[0]-a[0])*width,dy=(c[1]-a[1])*height;
      const line=b(group,left+i*(width+gap)+(a[0]+c[0])*width/2,y+(a[1]+c[1])*height/2,.887,thickness,Math.hypot(dx,dy)+thickness,.008,brass,'Raised '+text+' lettering');line.rotation.z=-Math.atan2(dx,dy);
    }
  }
  lettering('BELLA',1.385,.155,.092,.040,.013);lettering('670',1.275,.075,.048,.026,.008);
  const collider=(x,z,w,d,minY,maxY)=>{const c={x:BELLA.x+x,z:BELLA.z+z,w,d,minY:BELLA.y+minY,maxY:BELLA.y+maxY,kennel:true};colliders.push(c);return c;};
  for(const side of [-1,1])collider(side*.86,0,.07,1.65,0,1.27);
  collider(0,-.8,1.78,.07,0,1.27);collider(0,0,1.85,1.75,1.17,1.27);
  const doorCollider=collider(0,.82,1.75,.09,0,1.2);
  // Dynamic gates never enter the estate's static batch; the open door is
  // nonblocking so the companion cannot wedge the player in a bedroom.
  batchArticulated(gate);gate.traverse(o=>{o.userData.dynamic=true;});
  group.traverse(o=>{if(o.isMesh&&!o.userData.dynamic)solidMeshes.push(o);});
  const modelHeight=new T.Box3().setFromObject(group).max.y-BELLA.y;
  const station={x:BELLA.x,z:BELLA.z+.82,y:BELLA.y,rotation:0,type:'kennel',modelKind:'kennel',modelHeight,name:'FREE BELLA / MALTIPOO',price:BELLA.price,hex:'#f0dbc1',used:false};interactables.push(station);
  return {group,gate,doorCollider,latch,station,progress:0};
}

export function createBellaCompanion(options){
  const {world,colliders,batchArticulated}=options,kennel=buildKennel(options),rig=createBellaModel(batchArticulated);world.add(rig.group);
  const pos=new T.Vector3(BELLA.x,BELLA.y+.17,BELLA.z),goal=new T.Vector3(),biteDirection=new T.Vector3();
  let navigation=null,navTimer=0,selectionTimer=0,waypoint=null,velocity=0,grounded=true,emerging=false,stuck=0,failedTarget=null,failedTime=0;
  const companion={rig,kennel,station:kennel.station,pos,unlocked:false,target:null,activity:'KENNELED',attackTime:-1,cooldown:0,attacks:0,
    setNavigation(value){navigation=value;navTimer=0;waypoint=null;},
    unlock(){if(companion.unlocked)return false;companion.unlocked=true;kennel.station.used=true;kennel.doorCollider.disabled=true;emerging=true;companion.activity='JOINING YOU';return true;},
    reset(){companion.unlocked=false;companion.target=null;companion.activity='KENNELED';companion.attackTime=-1;companion.cooldown=0;companion.attacks=0;kennel.station.used=false;kennel.doorCollider.disabled=false;kennel.progress=0;kennel.gate.rotation.y=0;pos.set(BELLA.x,BELLA.y+.17,BELLA.z);velocity=0;grounded=true;emerging=false;waypoint=null;navTimer=selectionTimer=stuck=failedTime=0;failedTarget=null;rig.phase=rig.motion=rig.time=0;rig.group.rotation.y=0;animateBella(rig,0,0,-1,false);rig.group.position.copy(pos);},
    update(dt,{player,yaw=0,enemies,onBite,visualFloor=()=>0}){
      const oldX=pos.x,oldZ=pos.z;
      if(!companion.unlocked){animateBella(rig,dt,0,-1,false);return;}
      kennel.progress=Math.min(1,kennel.progress+dt/ .8);kennel.gate.rotation.y=-kennel.progress*Math.PI*.56;
      companion.cooldown=Math.max(0,companion.cooldown-dt);failedTime=Math.max(0,failedTime-dt);
      if(kennel.progress<.8){animateBella(rig,dt,0,-1,true);return;}
      const location=e=>e.walkPos||e.group.position;
      const inRange=e=>!e.dead&&location(e).distanceToSquared(player)<=BELLA.radius**2;
      if(companion.target&&(!inRange(companion.target)||companion.target===failedTarget&&failedTime>0)){companion.target=null;companion.attackTime=-1;}
      selectionTimer-=dt;
      if(!emerging&&selectionTimer<=0){
        selectionTimer=.25;let closest=companion.target,best=closest?pos.distanceToSquared(location(closest))*.8:Infinity;
        for(const e of enemies){if(!inRange(e)||e===failedTarget&&failedTime>0)continue;const d=pos.distanceToSquared(location(e));if(d<best){closest=e;best=d;}}
        if(closest!==companion.target){companion.target=closest;companion.attackTime=-1;navTimer=0;waypoint=null;}
      }
      if(emerging){goal.set(BELLA.x,BELLA.y,BELLA.z+2.15);if(pos.z>BELLA.z+1.95){emerging=false;navTimer=selectionTimer=0;}}
      else if(companion.target)goal.copy(location(companion.target));
      else{
        goal.set(player.x+Math.sin(yaw)*1.5+Math.cos(yaw)*.6,player.y,player.z+Math.cos(yaw)*1.5-Math.sin(yaw)*.6);
        // At a stair lip, stay beside the player's actual landing rather than
        // choosing the "behind you" spot on a lower tread.
        if(isBlocked(goal.x,goal.z,BELLA.bodyRadius,colliders,undefined,goal.y,BELLA.height)||Math.abs(supportBelow(goal.x,goal.z,goal.y,.3)-goal.y)>.08)goal.copy(player);
      }
      navTimer-=dt;
      if(navigation&&navTimer<=0){navigation.rebuild(goal.x,goal.z,goal.y);navTimer=.45;waypoint=null;}
      const sameFloor=Math.abs(goal.y-pos.y)<.55,dist=Math.hypot(goal.x-pos.x,goal.z-pos.z),clear=sameFloor&&clearPath(pos,goal);
      const stop=emerging?.12:companion.target?BELLA.biteReach*.8:.45;
      let tx=goal.x,tz=goal.z;
      if(!clear){
        if(!waypoint||Math.hypot(waypoint.x-pos.x,waypoint.z-pos.z)<.15)waypoint=navigation?.direction(pos.x,pos.z,pos.y);
        if(waypoint?.reachable){tx=waypoint.x;tz=waypoint.z;}
        else{tx=pos.x;tz=pos.z;if(companion.target){failedTarget=companion.target;failedTime=1.5;companion.target=null;selectionTimer=navTimer=0;}}
      }
      if((dist>stop||!sameFloor)&&companion.attackTime<0){
        let dx=tx-pos.x,dz=tz-pos.z,len=Math.hypot(dx,dz);
        if(len>.04){dx/=len;dz/=len;const speed=pos.distanceToSquared(player)>49?8:companion.target?5.8:5.4,step=Math.min(len,speed*dt);
          moveActor(pos,dx*step,dz*step,colliders,{radius:BELLA.bodyRadius,height:BELLA.height,grounded,allowFall:false});
          const moved=Math.hypot(pos.x-oldX,pos.z-oldZ);stuck=moved<step*.12?stuck+dt:0;
          if(stuck>.35){const side=Math.floor(stuck)%2?1:-1;moveActor(pos,-dz*step*side,dx*step*side,colliders,{radius:BELLA.bodyRadius,height:BELLA.height,grounded,allowFall:false});waypoint=null;}
        }
      }
      const vertical=updateActorHeight(pos,velocity,dt,grounded,BELLA.height,BELLA.bodyRadius);velocity=vertical.velocity;grounded=vertical.grounded;
      const target=companion.target,p=target&&location(target),canBite=p&&!target.dead&&Math.abs(p.y-pos.y)<.55&&pos.distanceToSquared(p)<=BELLA.biteReach**2&&clearPath(pos,p);
      if(canBite&&companion.cooldown===0&&companion.attackTime<0){companion.attackTime=0;companion.cooldown=BELLA.biteInterval;}
      if(companion.attackTime>=0){
        const previous=companion.attackTime;companion.attackTime+=dt;
        if(previous<.24&&companion.attackTime>=.24&&canBite){biteDirection.copy(p).sub(pos).normalize();onBite(target,BELLA.damage,biteDirection);companion.attacks++;}
        if(companion.attackTime>=.58)companion.attackTime=-1;
      }
      let heading=rig.group.rotation.y;const moved=Math.hypot(pos.x-oldX,pos.z-oldZ);
      if(companion.attackTime>=0&&p)heading=Math.atan2(p.x-pos.x,p.z-pos.z);else if(moved>.001)heading=Math.atan2(pos.x-oldX,pos.z-oldZ);
      rig.group.rotation.y+=Math.atan2(Math.sin(heading-rig.group.rotation.y),Math.cos(heading-rig.group.rotation.y))*(1-Math.exp(-dt*10));
      companion.activity=emerging?'JOINING YOU':companion.target?'GUARDING':'FOLLOWING';
      animateBella(rig,dt,moved,companion.attackTime,true);rig.group.position.set(pos.x,Math.abs(pos.y)>.1?pos.y+.006:Math.max(pos.y,visualFloor(pos.x,pos.z)),pos.z);
    }
  };
  function clearPath(from,to){
    if(Math.abs(from.y-to.y)>.55)return false;
    const dist=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(dist/.22));
    for(let i=1;i<=steps;i++){const f=i/steps,x=from.x+(to.x-from.x)*f,z=from.z+(to.z-from.z)*f,ramp=cellarStairHeight(x,z)??stairHeight(x,z);
      if(isBlocked(x,z,BELLA.bodyRadius,colliders,undefined,from.y,BELLA.height)||Math.abs(supportBelow(x,z,from.y,.3)-from.y)>.31||(ramp!==null&&ramp>from.y+.30&&from.y+BELLA.height>ramp-.2))return false;
    }return true;
  }
  companion.reset();return companion;
}
