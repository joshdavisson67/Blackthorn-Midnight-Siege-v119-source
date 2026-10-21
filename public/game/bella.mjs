import * as T from './three.module.js';
import {isBlocked} from './core.mjs?v=116';
import {UPPER_Y,moveActor,updateActorHeight,supportBelow,stairHeight} from './vertical.mjs?v=131';
import {cellarStairHeight} from './cellar-layout.mjs?v=28';

export const BELLA=Object.freeze({price:670,radius:12*.9144,bodyRadius:.22,height:.82,damage:48,biteInterval:.9,biteReach:.95,x:-30.3,z:-10.8,y:UPPER_Y,
  // Rat dragon (v131 Easter egg): a cone of fire, pulsed so every enemy in it
  // burns four times a second; the game decides how hard each pulse hits.
  fire:Object.freeze({range:4.6,angle:.5,duration:1.2,cooldown:2.4,pulse:.25})});

// Wings, a spiked tail and little horns, hidden until Olivia's upgrade.
function createDragonParts(rig){
  const membrane=new T.MeshStandardMaterial({color:0x9c2630,roughness:.75,side:T.DoubleSide}),bone=new T.MeshStandardMaterial({color:0xe9dcc6,roughness:.6}),scale=new T.MeshStandardMaterial({color:0xa8323a,roughness:.55,metalness:.1});
  const sphere=new T.SphereGeometry(1,12,8),cone=new T.ConeGeometry(1,1,8),cyl=new T.CylinderGeometry(1,1,1,6);
  const outline=new T.Shape();outline.moveTo(0,0);outline.lineTo(.12,.2);outline.lineTo(.42,.36);outline.lineTo(.62,.3);outline.quadraticCurveTo(.5,.18,.52,.1);outline.quadraticCurveTo(.4,.08,.36,-.02);outline.quadraticCurveTo(.24,0,.18,-.08);outline.quadraticCurveTo(.08,-.02,0,0);
  const wingGeo=new T.ShapeGeometry(outline,6),parts=[],wings=[];
  const spar=(parent,a,b,r=.012)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),m=new T.Mesh(cyl,bone);m.position.copy(A).add(B).multiplyScalar(.5);m.scale.set(r,A.distanceTo(B),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());parent.add(m);return m;};
  for(const side of [-1,1]){
    const pivot=new T.Group();pivot.name='Rat dragon wing';pivot.position.set(side*.11,.15,.06);rig.root.add(pivot);
    const blade=new T.Group();blade.scale.x=side;blade.rotation.y=-side*.35;pivot.add(blade);
    const skin=new T.Mesh(wingGeo,membrane);skin.rotation.x=-.25;blade.add(skin);
    spar(blade,[0,0,0],[.12,.2,0],.016);spar(blade,[.12,.2,0],[.42,.36,0]);spar(blade,[.42,.36,0],[.62,.3,0],.009);
    for(const tip of [[.52,.1,0],[.36,-.02,0],[.18,-.08,0]])spar(blade,[.12,.2,0],tip,.007);
    wings.push({pivot,side});parts.push(pivot);
  }
  // A segmented, spiked tail ending in a spade.
  const tailRoot=new T.Group();tailRoot.name='Rat dragon tail';tailRoot.position.set(0,.08,-.46);rig.root.add(tailRoot);parts.push(tailRoot);
  const segments=[];let parent=tailRoot;
  for(let i=0;i<7;i++){
    const j=new T.Group();j.position.set(0,0,i?-.1:0);parent.add(j);segments.push(j);
    const r=.07*(1-i/8);const body=new T.Mesh(sphere,scale);body.scale.set(r,r*.9,.065);body.position.z=-.05;j.add(body);
    const spike=new T.Mesh(cone,bone);spike.scale.set(.018,.05*(1-i/9),.018);spike.position.set(0,r*.9,-.05);spike.rotation.x=-.4;j.add(spike);
    parent=j;
  }
  const spade=new T.Mesh(cone,scale);spade.scale.set(.07,.11,.02);spade.rotation.x=-Math.PI/2;spade.position.z=-.14;parent.add(spade);
  const horns=[];for(const side of [-1,1]){const h=new T.Mesh(cone,bone);h.scale.set(.025,.09,.025);h.position.set(side*.075,.2,-.04);h.rotation.set(-.6,0,side*-.25);rig.head.add(h);horns.push(h);parts.push(h);}
  for(const p of parts){p.visible=false;p.traverse(o=>{o.userData.dynamic=true;o.userData.companion='Bella';if(o.isMesh){o.castShadow=true;o.raycast=()=>{};}});}
  return {parts,wings,segments,tailRoot,horns};
}

// Pooled flame puffs, recoloured from white-hot to ember red as they age.
function createFlames(world){
  const geo=new T.SphereGeometry(1,8,6),hot=new T.Color(0xfff2b0),mid=new T.Color(0xff8a2a),ember=new T.Color(0xb3200f);
  const puffs=Array.from({length:36},()=>{const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));m.visible=false;m.castShadow=false;m.raycast=()=>{};m.userData.dynamic=true;world.add(m);return {mesh:m,vel:new T.Vector3(),life:0,max:.42};});
  let next=0;
  return {
    emit(from,dir){const p=puffs[next++%puffs.length];p.life=p.max;p.mesh.position.copy(from);p.vel.copy(dir).multiplyScalar(6.5+Math.random()*2);p.vel.x+=(Math.random()-.5)*1.6;p.vel.y+=(Math.random()-.2)*.9;p.vel.z+=(Math.random()-.5)*1.6;p.mesh.visible=true;},
    update(dt){for(const p of puffs){if(p.life<=0)continue;p.life-=dt;const f=1-Math.max(0,p.life)/p.max;p.mesh.position.addScaledVector(p.vel,dt);p.vel.multiplyScalar(1-dt*2.2);p.vel.y+=dt*1.5;p.mesh.scale.setScalar(.05+f*.32);
      p.mesh.material.color.copy(f<.35?hot.clone().lerp(mid,f/.35):mid.clone().lerp(ember,(f-.35)/.65));p.mesh.material.opacity=.85*(1-f);if(p.life<=0)p.mesh.visible=false;}},
    clear(){for(const p of puffs){p.life=0;p.mesh.visible=false;}},
    get active(){return puffs.filter(p=>p.life>0).length;}
  };
}
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

function animateBella(rig,dt,moved,biteTime,unlocked,dragon=null,breathing=false){
  rig.time+=dt;rig.phase+=moved*12;rig.motion=T.MathUtils.damp(rig.motion,Math.min(1,moved/Math.max(.001,dt*3.8)),12,dt);
  const p=rig.phase,w=rig.motion,bite=biteTime>=0?Math.sin(Math.min(1,biteTime/.55)*Math.PI):0;
  rig.root.position.y=.40+Math.cos(p*2)*.014*w+Math.sin(rig.time*2.1)*.006;
  rig.root.position.z=bite*.09;rig.root.rotation.x=-bite*.12;
  for(const {joint,front,side} of rig.legs){joint.rotation.x=Math.sin(p+(front?(side<0?0:Math.PI):(side<0?Math.PI:0)))*.49*w+(front?-bite*.18:bite*.12);}
  rig.head.rotation.x=-bite*.2+Math.sin(rig.time*1.7)*.025;rig.head.rotation.y=Math.sin(rig.time*.8)*.045*(1-w);
  rig.jaw.rotation.x=bite*.38;rig.tongue.visible=biteTime>=0;
  for(let i=0;i<rig.ears.length;i++){rig.ears[i].rotation.x=Math.sin(p+1)*.17*w;rig.ears[i].rotation.z=(i?1:-1)*(.06+Math.sin(rig.time*2)*.018);}
  rig.tail.rotation.z=Math.sin(rig.time*(unlocked?7:3))*(unlocked?.32:.13);rig.tail.rotation.x=Math.sin(p*2)*.08*w;
  if(dragon){
    // Wings beat faster when she runs and flare wide while she breathes fire.
    const beat=breathing?.95:.35+.25*w;
    for(const {pivot,side} of dragon.wings){pivot.rotation.z=side*(beat*Math.sin(rig.time*(breathing?14:6+6*w))*.5+(breathing?.5:.15));pivot.rotation.y=side*(breathing?-.25:.05);}
    for(const [i,j] of dragon.segments.entries()){j.rotation.y=Math.sin(rig.time*3.2-i*.65)*.2*(1+w);j.rotation.x=i?-.06:.25;}
    if(breathing){rig.head.rotation.x=-.18;rig.jaw.rotation.x=.55;rig.tongue.visible=false;}
  }
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
  let navigation=null,navTimer=0,selectionTimer=0,waypoint=null,velocity=0,grounded=true,emerging=false,stuck=0,failedTarget=null,failedTime=0,breathPulse=0;
  const dragon=createDragonParts(rig),flames=createFlames(world),mouth=new T.Vector3(),breathDir=new T.Vector3();
  const companion={rig,kennel,station:kennel.station,pos,unlocked:false,target:null,activity:'KENNELED',attackTime:-1,cooldown:0,attacks:0,
    dragon:false,breath:-1,breathCooldown:0,breaths:0,dragonParts:dragon,flames,
    // Olivia's upgrade: wings, tail, horns and fire breath for the rest of the run.
    becomeDragon(){if(companion.dragon)return false;companion.dragon=true;for(const p of dragon.parts)p.visible=true;for(const m of rig.tail.children)m.visible=false;companion.breathCooldown=.5;return true;},
    setNavigation(value){navigation=value;navTimer=0;waypoint=null;},
    unlock(){if(companion.unlocked)return false;companion.unlocked=true;kennel.station.used=true;kennel.doorCollider.disabled=true;emerging=true;companion.activity='JOINING YOU';return true;},
    reset(){companion.dragon=false;companion.breath=-1;companion.breathCooldown=0;companion.breaths=0;breathPulse=0;for(const p of dragon.parts)p.visible=false;for(const m of rig.tail.children)m.visible=true;flames.clear();companion.unlocked=false;companion.target=null;companion.activity='KENNELED';companion.attackTime=-1;companion.cooldown=0;companion.attacks=0;kennel.station.used=false;kennel.doorCollider.disabled=false;kennel.progress=0;kennel.gate.rotation.y=0;pos.set(BELLA.x,BELLA.y+.17,BELLA.z);velocity=0;grounded=true;emerging=false;waypoint=null;navTimer=selectionTimer=stuck=failedTime=0;failedTarget=null;rig.phase=rig.motion=rig.time=0;rig.group.rotation.y=0;animateBella(rig,0,0,-1,false);rig.group.position.copy(pos);},
    update(dt,{player,yaw=0,enemies,onBite,onBreath=()=>{},climb=null,visualFloor=()=>0}){
      const oldX=pos.x,oldZ=pos.z;flames.update(dt);
      if(!companion.unlocked){animateBella(rig,dt,0,-1,false);return;}
      kennel.progress=Math.min(1,kennel.progress+dt/ .8);kennel.gate.rotation.y=-kennel.progress*Math.PI*.56;
      companion.cooldown=Math.max(0,companion.cooldown-dt);companion.breathCooldown=Math.max(0,companion.breathCooldown-dt);failedTime=Math.max(0,failedTime-dt);
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
      // The game can route her up (or down) the attic stairs.
      const route=climb?.(pos,goal);if(route){tx=route.x;tz=route.z;}
      if((dist>stop||!sameFloor)&&companion.attackTime<0&&companion.breath<0){
        let dx=tx-pos.x,dz=tz-pos.z,len=Math.hypot(dx,dz);
        if(len>.04){dx/=len;dz/=len;const speed=pos.distanceToSquared(player)>49?8:companion.target?5.8:5.4,step=Math.min(len,speed*dt);
          moveActor(pos,dx*step,dz*step,colliders,{radius:BELLA.bodyRadius,height:BELLA.height,grounded,allowFall:false});
          const moved=Math.hypot(pos.x-oldX,pos.z-oldZ);stuck=moved<step*.12?stuck+dt:0;
          if(stuck>.35){const side=Math.floor(stuck)%2?1:-1;moveActor(pos,-dz*step*side,dx*step*side,colliders,{radius:BELLA.bodyRadius,height:BELLA.height,grounded,allowFall:false});waypoint=null;}
        }
      }
      const vertical=updateActorHeight(pos,velocity,dt,grounded,BELLA.height,BELLA.bodyRadius);velocity=vertical.velocity;grounded=vertical.grounded;
      const target=companion.target,p=target&&location(target),canBite=p&&!target.dead&&Math.abs(p.y-pos.y)<.55&&pos.distanceToSquared(p)<=BELLA.biteReach**2&&clearPath(pos,p);
      // The rat dragon opens with fire whenever a target is in reach of the cone.
      const fireReach=companion.dragon&&p&&!target.dead&&Math.abs(p.y-pos.y)<.55&&pos.distanceToSquared(p)<=BELLA.fire.range**2&&clearPath(pos,p);
      if(fireReach&&companion.breath<0&&companion.breathCooldown===0&&companion.attackTime<0){companion.breath=0;breathPulse=0;companion.breathCooldown=BELLA.fire.cooldown+BELLA.fire.duration;companion.breaths++;}
      if(companion.breath>=0){
        companion.breath+=dt;
        rig.jaw.getWorldPosition(mouth);breathDir.set(Math.sin(rig.group.rotation.y),0,Math.cos(rig.group.rotation.y));mouth.addScaledVector(breathDir,.12);
        for(let i=0;i<3;i++)flames.emit(mouth,breathDir);
        breathPulse-=dt;if(breathPulse<=0){breathPulse=BELLA.fire.pulse;onBreath(mouth.clone(),breathDir.clone(),BELLA.fire.range,BELLA.fire.angle);}
        if(companion.breath>=BELLA.fire.duration)companion.breath=-1;
      }
      if(canBite&&companion.breath<0&&companion.cooldown===0&&companion.attackTime<0){companion.attackTime=0;companion.cooldown=BELLA.biteInterval;}
      if(companion.attackTime>=0){
        const previous=companion.attackTime;companion.attackTime+=dt;
        if(previous<.24&&companion.attackTime>=.24&&canBite){biteDirection.copy(p).sub(pos).normalize();onBite(target,BELLA.damage,biteDirection);companion.attacks++;}
        if(companion.attackTime>=.58)companion.attackTime=-1;
      }
      let heading=rig.group.rotation.y;const moved=Math.hypot(pos.x-oldX,pos.z-oldZ);
      if((companion.attackTime>=0||companion.breath>=0)&&p)heading=Math.atan2(p.x-pos.x,p.z-pos.z);else if(moved>.001)heading=Math.atan2(pos.x-oldX,pos.z-oldZ);
      rig.group.rotation.y+=Math.atan2(Math.sin(heading-rig.group.rotation.y),Math.cos(heading-rig.group.rotation.y))*(1-Math.exp(-dt*10));
      companion.activity=emerging?'JOINING YOU':companion.breath>=0?'BREATHING FIRE':companion.target?'GUARDING':'FOLLOWING';
      animateBella(rig,dt,moved,companion.attackTime,true,companion.dragon?dragon:null,companion.breath>=0);rig.group.position.set(pos.x,Math.abs(pos.y)>.1?pos.y+.006:Math.max(pos.y,visualFloor(pos.x,pos.z)),pos.z);
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
