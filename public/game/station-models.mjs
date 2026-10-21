import * as T from './three.module.js';
import {createWeaponModel} from './weapon-models.mjs?v=129';
import {configureArmorStation} from './armor.mjs?v=94';
import {configureForgeStation} from './soul-forge.mjs?v=118';

// Shared low-poly exhibit parts: built once, then statically batched with the
// estate. No extra dynamic lights or in-combat geometry generation.
export function createModelKit(){
  const geo={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,16,12),cylinder:new T.CylinderGeometry(1,1,1,16),cone:new T.ConeGeometry(1,1,16),ring:new T.TorusGeometry(1,.09,8,32)};
  const material=(color,metalness=.45,roughness=.48,emission=0)=>new T.MeshStandardMaterial({color,metalness,roughness,emissive:color,emissiveIntensity:emission});
  const m={iron:material(0x283238),steel:material(0x91a1a3,.75,.32),brass:material(0xb49755,.72,.35),wood:material(0x453025,.05,.85),red:material(0xe55047,.25,.38,.65),green:material(0x61d4aa,.3,.4,.55),gold:material(0xffc868,.4,.35,.7),blue:material(0x689ddd,.3,.4,.65),violet:material(0xb18aef,.3,.4,.7)};
  const anvilProfile=new T.Shape();
  anvilProfile.moveTo(-.50,0);anvilProfile.lineTo(-.61,.10);anvilProfile.lineTo(-.61,.18);
  anvilProfile.quadraticCurveTo(-.37,.20,-.28,.31);anvilProfile.lineTo(-.27,.46);
  anvilProfile.quadraticCurveTo(-.40,.48,-.54,.50);anvilProfile.lineTo(-.54,.61);
  anvilProfile.lineTo(.39,.61);anvilProfile.lineTo(.39,.48);
  anvilProfile.quadraticCurveTo(.17,.46,.15,.34);anvilProfile.quadraticCurveTo(.17,.20,.43,.17);
  anvilProfile.lineTo(.46,.09);anvilProfile.lineTo(.46,0);anvilProfile.closePath();
  geo.anvil=new T.ExtrudeGeometry(anvilProfile,{depth:.48,steps:1,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2,curveSegments:8});
  geo.anvil.translate(0,0,-.24);geo.soulStone=new T.OctahedronGeometry(1,0);
  m.anvil=material(0x3d454c,.78,.56);m.soulStone=material(0x695db9,.15,.25,1.8);m.soulStone.emissive.setHex(0x7d45ed);m.soulStone.flatShading=true;
  m.soulEmber=new T.MeshBasicMaterial({color:0xa8fff0});
  // Twelve tapered, fading gold ribbons share one mesh. Additive vertex colors
  // fade to black at the tips, without textures, shader hooks or extra lights.
  m.nanoRays=new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false});
  const rayPositions=[],rayColors=[];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,dy=(i%3-1)*.12,dx=Math.sin(a),dz=Math.cos(a),wx=Math.cos(a)*.025,wz=-Math.sin(a)*.025;
    const points=[[dx*.13-wx,.47+dy*.25,dz*.13-wz],[dx*.13+wx,.47+dy*.25,dz*.13+wz],[dx*.38+wx*.05,.47+dy,dz*.38+wz*.05],[dx*.38-wx*.05,.47+dy,dz*.38-wz*.05]];
    for(const n of [0,1,2,0,2,3]){rayPositions.push(...points[n]);rayColors.push(...(n<2?[1,.72,.19]:[0,0,0]));}
  }
  geo.nanoRays=new T.BufferGeometry();geo.nanoRays.setAttribute('position',new T.Float32BufferAttribute(rayPositions,3));geo.nanoRays.setAttribute('color',new T.Float32BufferAttribute(rayColors,3));geo.nanoRays.computeVertexNormals();
  function part(parent,kind,pos,scale,mat=m.iron,name=''){const o=new T.Mesh(geo[kind],mat);o.position.set(...pos);o.scale.set(...scale);o.castShadow=o.receiveShadow=true;o.name=name;parent.add(o);return o;}
  const b=(g,x,y,z,w,h,d,mat,name)=>part(g,'box',[x,y,z],[w,h,d],mat,name);
  const ell=(g,x,y,z,w,h,d,mat,name)=>part(g,'sphere',[x,y,z],[w,h,d],mat,name);
  const cy=(g,x,y,z,r,h,mat,name)=>part(g,'cylinder',[x,y,z],[r,h,r],mat,name);
  const ring=(g,x,y,z,r,mat,name)=>part(g,'ring',[x,y,z],[r,r,r],mat,name);
  function ammo(){const g=new T.Group();g.name='Open ammunition case';b(g,0,0,0,.70,.32,.38,m.green,'Ammo case');b(g,0,.18,-.18,.73,.34,.045,m.wood,'Raised lid').rotation.x=-.25;for(const x of [-.25,.25])b(g,x,-.01,.201,.055,.30,.025,m.brass,'Case strap');for(let i=0;i<5;i++){const x=(i-2)*.10;cy(g,x,.22,0,.03,.17,m.brass,'Cartridge');part(g,'cone',[x,.325,0],[.03,.065,.03],m.steel,'Bullet tip');}b(g,0,.02,.21,.14,.075,.045,m.steel,'Latch');return g;}
  function grenade(){const g=new T.Group();g.name='Fragmentation grenade';ell(g,0,0,0,.19,.25,.17,m.violet,'Grenade body');for(const y of [-.13,0,.13]){const r=ring(g,0,y,0,y? .163:.18,m.iron,'Fragmentation band');r.rotation.x=Math.PI/2;r.scale.z*=.9;}for(const x of [-.09,.09])b(g,x,0,.155,.028,.34,.025,m.iron,'Body scoring');cy(g,0,.28,0,.07,.09,m.steel,'Fuse');b(g,.105,.23,0,.055,.26,.065,m.brass,'Safety lever').rotation.z=.42;ring(g,-.11,.31,0,.075,m.steel,'Pull ring');return g;}
  function double(){const g=new T.Group();g.name='Double damage multiplier';for(const rot of [-.75,.75])b(g,-.20,0,0,.075,.44,.10,m.gold,'Multiplier cross').rotation.z=rot;const pts=[[.05,.19],[.30,.19],[.30,.04],[.05,-.13],[.05,-.22],[.33,-.22]];for(let i=1;i<pts.length;i++){const a=pts[i-1],v=pts[i],dx=v[0]-a[0],dy=v[1]-a[1];b(g,(a[0]+v[0])/2,(a[1]+v[1])/2,0,.075,Math.hypot(dx,dy)+.035,.10,m.gold,'Raised numeral 2').rotation.z=-Math.atan2(dx,dy);}return g;}
  function armor(){
    const g=new T.Group();g.name='Ballistic body armor';
    b(g,0,0,0,.65,.64,.26,m.iron,'Ballistic vest');b(g,0,.015,-.15,.47,.48,.05,m.blue,'Armor plate');
    for(const x of [-.24,.24])b(g,x,.39,0,.14,.28,.24,m.iron,'Shoulder strap');
    for(const yy of [-.16,.04])b(g,0,yy,-.2,.54,.07,.06,m.steel,'Vest webbing');
    for(const x of [-.19,0,.19])b(g,x,-.35,-.04,.15,.22,.22,m.iron,'Armor pouch');
    return g;
  }
  function nanoShield(rank=1){
    const g=new T.Group(),glow=rank>=2?m.gold:m.green;g.name=`Nano Shield Rank ${rank} regeneration emitter`;
    b(g,0,0,0,.50,.38,.25,m.iron,'Nano emitter housing');
    b(g,0,.015,-.14,.34,.25,.04,glow,'Luminous nanite cell');
    for(const x of [-.23,.23])b(g,x,0,-.02,.065,.43,.27,m.steel,'Emitter contacts');
    cy(g,0,.29,0,.10,.15,m.steel,'Shield projector');
    part(g,'soulStone',[0,.47,0],[.12,.18,.12],glow,'Suspended nanite crystal');
    const halo=ring(g,0,.47,0,.22,glow,'Regeneration halo');halo.scale.y*=1.25;
    if(rank>=2)ring(g,0,.47,0,.155,glow,'Secondary projector halo').rotation.y=Math.PI/2;
    if(rank===3){
      ring(g,0,.47,0,.18,glow,'Rank 3 continuous regeneration halo').rotation.x=Math.PI/2;
      const rays=part(g,'nanoRays',[0,0,0],[1,1,1],m.nanoRays,'Rank 3 gold rays');rays.castShadow=rays.receiveShadow=false;
    }
    for(const x of [-.10,.10])b(g,x,-.24,-.035,.065,.10,.17,m.steel,'Power coupling');
    return g;
  }
  function gun(type){
    const g=new T.Group(),model=createWeaponModel(type);model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model);model.position.z=-(bounds.min.z+bounds.max.z)/2;
    g.name=model.name;g.userData.weaponType=type;g.add(model);g.rotation.y=-Math.PI/2;
    return g;
  }
  return {m,b,ell,cy,ring,part,ammo,grenade,double,armor,nanoShield,gun};
}

export function createStationBuilder({world,colliders,solidMeshes,interactables,label}){
  const kit=createModelKit(),{m,b,ell,cy,ring}=kit,visuals=[];
  function add(def){
    const {x,z,y=0,rotation=0,type,id}=def,weapon=type==='shotgun'||type==='smg'||type==='bushmaster',kind=type==='perk'?id:type==='powerup'?def.power:type;
    const g=new T.Group();g.name=def.name;g.position.set(x,y,z);g.rotation.y=rotation;world.add(g);
    const accent=({iron:m.red,quick:m.green,eye:m.gold,stride:m.blue,ammo:m.green,armor:m.blue,shotgun:m.gold,smg:m.blue,bushmaster:m.gold,double:m.gold,grenades:m.violet,upgrade:m.violet})[kind];
    const bareForge=kind==='upgrade'&&def.pedestal===false,forgeOffset=bareForge?-.635:0;
    const w=weapon?1.7:type==='ammo'?1.45:type==='upgrade'?1.65:1.0,d=type==='upgrade'?(bareForge?.56:1.2):type==='ammo'?.65:weapon?.9:.8,h=weapon?1.85:type==='ammo'?1.65:type==='upgrade'?2.5+forgeOffset:2.3;
    if(!bareForge){
      b(g,0,.36,0,w,.72,d,m.wood,kind==='upgrade'?'Charred oak anvil block':'Cabinet plinth');
      b(g,0,.06,0,w+.04,.10,d+.03,m.brass,'Foot trim');b(g,0,.75,0,w+.04,.09,d+.03,m.brass,'Counter trim');
      if(kind==='upgrade'){
        for(const yy of [.15,.64])b(g,0,yy,d/2+.02,w,.065,.035,m.iron,'Anvil block iron band');
        for(const xx of [-.65,.65])for(const yy of [.15,.64])ell(g,xx,yy,d/2+.045,.022,.022,.018,m.brass,'Block rivet');
      }else for(const side of [-1,1])b(g,side*(w/2-.08),.4,d/2+.012,.035,.53,.025,accent,'Inlaid stripe');
    }
    function exhibit(model,pos,scale=1){model.position.set(...pos);model.scale.setScalar(scale);g.add(model);return model;}
    let core=null,collectible=null,nanoModel=null,nanoRank2Model=null,nanoRank3Model=null;const plates=[];
    if(weapon){
      b(g,0,1.29,-.30,1.62,1.04,.10,m.wood,'Weapon rack back');for(const x of [-.52,.50])b(g,x,1.13,-.06,.07,.18,.34,m.brass,'Rack hook');exhibit(kit.gun(type),[0,1.35,.08],1.02);
      const rounds=type==='shotgun'?4:2;for(let i=0;i<rounds;i++)if(type==='shotgun')cy(g,-.3+i*.14,.87,.22,.043,.17,m.red,'Spare shell');else b(g,-.18+i*.3,.91,.23,.12,.24,.12,m.iron,'Spare magazine');
    }else if(kind==='ammo')exhibit(kit.ammo(),[0,.96,0],1.65);
    else if(kind==='armor'){
      collectible=exhibit(kit.armor(),[0,1.38,0],1.25);collectible.rotation.y=Math.PI;
      collectible.traverse(o=>{o.userData.dynamic=true;o.userData.collectible=true;});
      nanoModel=exhibit(kit.nanoShield(),[0,1.32,0],1.25);nanoModel.rotation.y=Math.PI;
      nanoRank2Model=exhibit(kit.nanoShield(2),[0,1.32,0],1.25);nanoRank2Model.rotation.y=Math.PI;
      nanoRank3Model=exhibit(kit.nanoShield(3),[0,1.32,0],1.25);nanoRank3Model.rotation.y=Math.PI;
    }
    else if(kind==='iron'){
      ell(g,-.115,1.48,.03,.16,.18,.12,m.red,'Heart lobe');ell(g,.115,1.48,.03,.16,.18,.12,m.red,'Heart lobe');const heart=ell(g,0,1.32,.03,.19,.23,.12,m.red,'Heart point');heart.rotation.z=.05;
      for(const x of [-.36,.36]){cy(g,x,1.46,0,.027,1.17,m.brass,'Protective cage');b(g,x,1.47,.02,.06,.06,.42,m.brass,'Cage brace');}for(const yy of [.92,1.98]){const r=ring(g,0,yy,0,.39,m.brass,'Heart chamber');r.rotation.x=Math.PI/2;}
      b(g,0,1.02,.33,.27,.10,.06,accent,'Heartbeat monitor');
    }else if(kind==='quick'){
      for(const side of [-1,1]){b(g,side*.22,1.33,0,.14,.58,.19,m.steel,'Quick-change magazine').rotation.z=side*.24;cy(g,side*.22,1.65,0,.026,.11,m.brass,'Feed cartridge');const r=ring(g,side*.22,1.08,.15,.15,m.brass,'Reload gear');for(let i=0;i<8;i++)b(g,side*.22+Math.cos(i*Math.PI/4)*.15,1.08+Math.sin(i*Math.PI/4)*.15,.15,.065,.065,.04,m.brass,'Gear tooth');}
      for(const side of [-1,1])b(g,side*.09,1.77,.08,.045,.27,.08,m.green,'Reload bolt').rotation.z=side*.6;
    }else if(kind==='eye'){
      for(const radius of [.33,.22,.10])ring(g,0,1.53,0,radius,m.gold,'Deadeye target');b(g,0,1.53,.025,.78,.025,.025,m.steel,'Crosshair');b(g,0,1.53,.025,.025,.78,.025,m.steel,'Crosshair');
      cy(g,0,1.03,.25,.055,.29,m.brass,'Heavy cartridge');kit.part(g,'cone',[0,1.225,.25],[.055,.12,.055],m.gold,'Bullet tip');
    }else if(kind==='stride'){
      for(const side of [-1,1]){b(g,side*.21,1.13,.02,.23,.34,.27,m.iron,'Boot shaft');ell(g,side*.21,.96,.15,.13,.12,.25,m.blue,'Boot toe');b(g,side*.21,.85,.13,.28,.055,.44,m.brass,'Boot sole');for(let i=0;i<3;i++){const wing=b(g,side*(.33+i*.04),1.22+i*.11,0,.065,.36-i*.035,.08,m.blue,'Wing feather');wing.rotation.z=-side*.55;}}
      for(const yy of [1.77,1.95])for(const side of [-1,1])b(g,side*.065,yy,.05,.035,.19,.055,m.blue,'Speed chevron').rotation.z=side*.75;
    }else if(kind==='upgrade'){
      kit.part(g,'anvil',[-.12,.80+forgeOffset,0],[1,1,1],m.anvil,'Forged iron anvil');
      b(g,-.195,1.455+forgeOffset,0,.94,.045,.52,m.steel,'Anvil face');
      const horn=kit.part(g,'cone',[.53,1.335+forgeOffset,0],[.14,.54,.11],m.steel,'Tapered anvil horn');horn.rotation.z=-Math.PI/2;
      b(g,-.49,1.488+forgeOffset,.06,.10,.008,.10,m.iron,'Hardy hole');
      for(const side of [-1,1]){
        const rune=b(g,-.15+side*.10,1.489+forgeOffset,0,.022,.008,.22,m.violet,'Soul rune');rune.rotation.y=side*.45;
      }
      core=new T.Group();core.name='Hovering soul stone';core.position.set(-.15,2.02+forgeOffset,0);g.add(core);
      const stone=kit.part(core,'soulStone',[0,0,0],[.22,.32,.22],m.soulStone,'Faceted soul stone');stone.receiveShadow=false;
      const edges=new T.LineSegments(new T.EdgesGeometry(stone.geometry),new T.LineBasicMaterial({color:0xa8fff0}));
      edges.scale.copy(stone.scale).multiplyScalar(1.018);edges.name='Soul stone luminous seams';core.add(edges);
      for(const side of [-1,1])kit.part(core,'soulStone',[side*.34,side*.08,.035],[.028,.048,.028],m.soulEmber,'Orbiting soul ember');
      core.traverse(o=>{o.userData.dynamic=true;});
      core.userData.hoverHeight=2.02+forgeOffset;
    }else if(kind==='double'||kind==='grenades'){
      const r=ring(g,0,1.45,-.10,.39,accent,'Relic halo');exhibit(kind==='double'?kit.double():kit.grenade(),[0,1.43,.08],1.12);cy(g,0,.97,0,.17,.34,m.brass,'Relic stand');
    }
    if(!bareForge){
      const plateWidth=w-.27,titleHeight=.225,detailHeight=.265;
      const plate=new T.Mesh(new T.PlaneGeometry(plateWidth,titleHeight),kind==='upgrade'?m.brass:label(def.name,def.hex||'#d4b77a',1024,{width:plateWidth,height:titleHeight,kind:'title',maxLines:1}));plate.position.set(0,.53,d/2+.047);g.add(plate);
      plates.push(plate);
      const text=(def.modelCaption||def.desc||'').replaceAll(' · ','\n');
      const caption=new T.Mesh(new T.PlaneGeometry(plateWidth,detailHeight),kind==='upgrade'?m.brass:label(text,def.hex||'#d4b77a',1024,{width:plateWidth,height:detailHeight,kind:'detail',maxLines:3}));caption.position.set(0,.2475,d/2+.047);g.add(caption);
      plates.push(caption);
    }
    // One vertically bounded collision volume protects the whole exhibit.
    const cosine=Math.abs(Math.cos(rotation)),sine=Math.abs(Math.sin(rotation));
    colliders.push({x,z,w:(w+.04)*cosine+(d+.04)*sine,d:(w+.04)*sine+(d+.04)*cosine,minY:y,maxY:y+h});
    const station={...def,y,modelKind:kind,modelHeight:h};interactables.push(station);
    if(collectible){station.model=collectible;station.used=false;}
    if(nanoModel)configureArmorStation(station,{nanoModel,nanoRank2Model,nanoRank3Model,plates,label});
    if(kind==='upgrade'&&plates.length)configureForgeStation(station,{plates,label});
    const parts=[];g.traverse(o=>{if(o.isMesh)parts.push(o);});solidMeshes.push(...parts.filter(p=>!p.userData.collectible));
    visuals.push({station,group:g,parts,core});return {station,group:g,core};
  }
  function update(time){
    kit.m.soulStone.emissiveIntensity=1.8+Math.sin(time*1.7)*.3;
    for(const {station,core} of visuals)if(core){core.position.y=core.userData.hoverHeight+Math.sin(time*1.4+station.y)*.06;core.rotation.y=time*.65+station.y;}
  }
  function reset(){for(const {station} of visuals){if(station.type==='armor')station.setArmorTier(0);if(station.type==='upgrade')station.setForgeRank(0);}}
  return {add,visuals,update,reset};
}
export function drawStationMarker(c,s,x,z){
  const symbol=s.type==='bell'?'BL':s.type==='kennel'?'B':s.type==='mausoleumDoor'?'T':s.type==='nuke'?'NU':s.type==='lmg'?'LM':s.type==='armor'?(s.armorTier>0?'N'+Math.min(s.armorTier,3):'AR'):s.type==='cellarDoor'?'↓':s.type==='perk'?s.icon:s.type==='shotgun'?'SG':s.type==='smg'?'SM':s.type==='bushmaster'?'BM':s.type==='ammo'?'A':s.type==='upgrade'?'F':s.power==='double'?'×2':'∞';
  c.fillStyle='#09151e';c.fillRect(x-8,z-7,16,14);c.strokeStyle=s.hex||'#d4b77a';c.lineWidth=1;c.strokeRect(x-8,z-7,16,14);c.fillStyle=s.hex||'#d4b77a';c.font='bold 9px Arial';c.textAlign='center';c.fillText(symbol,x,z+3);
}
