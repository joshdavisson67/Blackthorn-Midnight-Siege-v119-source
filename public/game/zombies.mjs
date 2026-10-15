import * as T from './three.module.js';
import {BRUTE} from './brute.mjs?v=30';
import {makeRedEyeMaterial,makeEyeGeometry} from './enemy-faces.mjs?v=63';
import {ENEMY_SURFACE,markEnemySurface} from './enemy-surfaces.mjs?v=63';

const UP=new T.Vector3(0,1,0), clamp=T.MathUtils.clamp;
const styles=[
  {name:'groundskeeper',coat:0x505947,pants:0x343a30,skin:0x9d9f82,bulk:1.04,hat:true},
  {name:'footman',coat:0x343f49,pants:0x292e35,skin:0xa6a08c,bulk:.96,vest:true},
  {name:'fallen guest',coat:0x65504a,pants:0x393334,skin:0x989b87,bulk:.88,vest:true},
  {name:'caretaker',coat:0x777265,pants:0x42453c,skin:0xa4a389,bulk:1.08,apron:true},
];

// Each enemy owns its small geometry/material palette. Meshes are merged per joint
// by the game, retaining articulation, vertex colors, and precise hit regions.
export function createZombieRig({rng=Math.random,brute=false,feral=false}={}){
  const rand=(a,b)=>a+(b-a)*rng(),style=feral?{name:'feral stalker',coat:0x66553e,pants:0x302d29,skin:0xc3c4ac,bulk:.78}:brute?{name:'estate brute',coat:0x45493f,pants:0x30342e,skin:0x929879,bulk:1.3,apron:true}:styles[Math.floor(rng()*styles.length)];
  const group=new T.Group(),root=new T.Group();group.add(root);root.position.y=.92;
  const resources={geometries:new Set(),materials:new Set()};
  function material(color,roughness=.87,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness,vertexColors:true});resources.materials.add(m);return m;}
  const skin=markEnemySurface(material(style.skin,.78),ENEMY_SURFACE.skin),cloth=markEnemySurface(material(style.coat),ENEMY_SURFACE.cloth),pants=markEnemySurface(material(style.pants),ENEMY_SURFACE.leather),boot=markEnemySurface(material(0x252824,.7),ENEMY_SURFACE.leather),wound=markEnemySurface(material(0x70212b,.48),ENEMY_SURFACE.wound),bone=markEnemySurface(material(0xb4ac8e,.66),ENEMY_SURFACE.bone),hair=markEnemySurface(material(0x353930),ENEMY_SURFACE.fur),lining=markEnemySurface(material(0xaba08b),ENEMY_SURFACE.cloth),metal=material(0x83735b,.52,.5),recess=material(0x201519);
  const eyes=makeRedEyeMaterial(resources);
  function own(g){resources.geometries.add(g);return g;}
  // Organic, low-frequency surface color avoids flickering speckle and extra layers.
  function tint(g,amount=.09){const p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),v=1-amount*(.5+.5*Math.sin(x*13+y*7)*Math.cos(z*11-y*9));c.push(v,v*.995,v*.975);}g.setAttribute('color',new T.Float32BufferAttribute(c,3));return g;}
  const ellipsoid=own(tint(new T.SphereGeometry(1,14,10))),cube=own(tint(new T.BoxGeometry(1,1,1),.02)),eyeGeo=own(tint(makeEyeGeometry(),.03)),faceGeo=own(tint(new T.SphereGeometry(1,12,8),.08));
  function shape(parent,geo,mat,pos,scale){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const ell=(p,m,pos,s)=>shape(p,ellipsoid,m,pos,s),box=(p,m,pos,s)=>shape(p,cube,m,pos,s);
  const detail=(p,m,pos,s)=>shape(p,faceGeo,m,pos,s);
  const joint=(parent,pos,name)=>{const j=new T.Group();j.name=name;j.position.set(...pos);parent.add(j);return j;};
  // Tailored ring profiles produce a shoulder line, waist and irregular torn hem.
  function garment(parent,mat,profiles,ragged=false){const v=[],uv=[],idx=[],n=20;for(let j=0;j<profiles.length;j++){const [y,w,d]=profiles[j];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;v.push(Math.cos(a)*w,y+(ragged&&j===0?Math.sin(a*7+.6)*.035:0),Math.sin(a)*d);uv.push(i/n,j/(profiles.length-1));}}for(let j=0;j<profiles.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,b,b+1,a+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return shape(parent,own(tint(geo,.16)),mat,[0,0,0],[1,1,1]);}
  const spine=joint(root,[0,.09,0],'spine');
  const bulk=style.bulk;
  garment(root,pants,[[-.12,.16*bulk,.115],[0,.18*bulk,.13],[.11,.155*bulk,.115]]);
  const torso=garment(spine,feral?skin:cloth,[[-.08,.19*bulk,.13],[.05,.17*bulk,.12],[.18,.185*bulk,.135],[.34,.24*bulk,.145],[.43,.24*bulk,.125],[.49,.075,.067]],!feral);
  ell(spine,skin,[0,.5,0],[.069,.095,.067]);
  box(root,boot,[0,.055,.126],[.32*bulk,.05,.026]);box(root,metal,[.015,.055,.146],[.045,.046,.015]);
  if(style.vest){garment(spine,lining,[[.02,.161*bulk,.135],[.32,.2*bulk,.15],[.41,.13,.125]]);for(const s of [-1,1]){const lapel=box(spine,cloth,[s*.102,.32,.155],[.07,.27,.024]);lapel.rotation.z=s*-.28;}for(let i=0;i<4;i++)ell(spine,metal,[0,.1+i*.065,.154],[.012,.013,.009]);}
  else if(!feral){for(let i=0;i<5;i++)ell(spine,metal,[.045,.025+i*.077,.147],[.008,.010,.005]);box(spine,cloth,[-.115,.29,.145],[.10,.098,.014]);box(spine,lining,[-.115,.337,.155],[.096,.005,.004]);}
  if(!feral)for(const s of [-1,1]){const collar=box(spine,lining,[s*.063,.443,.075],[.077,.051,.017]);collar.rotation.z=s*.42;}
  if(style.apron){garment(spine,lining,[[-.2,.18*bulk,.153],[.1,.18*bulk,.157],[.33,.13,.155]],true);ell(spine,wound,[.06,.14,.165],[.046,.085,.01]);}
  // Raised seams, ragged openings and cloth folds have real depth, no coplanar decals.
  for(const s of [-1,1]){if(!feral){const fold=detail(spine,cloth,[s*.127,.05,.121],[.008,.068,.009]);fold.rotation.z=s*.16;}detail(spine,wound,[s*.195*bulk,.33,.102],[.008,.036,.010]);}
  if(feral){
    const ribs=joint(spine,[0,0,0],'feral ribcage');
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const rib=ell(ribs,bone,[side*(.065+i*.012),.31-i*.045,.131],[.065,.012,.022]);rib.rotation.z=side*-.28;
      const slash=ell(spine,wound,[side*.06,.12+i*.043,.146],[.016,.03,.009]);slash.rotation.z=side*.4;
    }
    for(let i=0;i<5;i++)ell(spine,bone,[0,.08+i*.075,-.14],[.022,.025,.035]);
  }
  const head=joint(spine,[0,.66,.026],'head');head.scale.setScalar(brute?.90:.86);
  const skullGeo=own(tint(new T.SphereGeometry(1,40,30),.10));const positions=skullGeo.attributes.position;
  skullGeo.userData.enemySurfaceTile=ENEMY_SURFACE.face;
  const gaussian=(x,y,cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
  for(let i=0;i<positions.count;i++){
    let x=positions.getX(i)*.143,y=positions.getY(i)*.194,z=positions.getZ(i)*.136;
    const taper=y<-.012?1-.24*T.MathUtils.smoothstep(-y,.012,.185):1;
    x*=taper;
    if(z>0){
      const front=T.MathUtils.smoothstep(z,0,.07),ax=Math.abs(x);
      // Continuous orbital rims, cheekbones, hollow temples, nasolabial planes
      // and tapered mandible replace the disconnected spherical face pieces.
      let sculpt=gaussian(ax,y,.076,.031+ax*.23,.042,.016)*.032;
      sculpt-=gaussian(ax,y,.077,.023,.031,.025)*.018;
      sculpt+=gaussian(ax,y,.095,-.046,.030,.025)*.019;
      sculpt-=gaussian(ax,y,.088,-.086,.030,.029)*.011;
      sculpt-=gaussian(ax,y,.126,.025,.022,.05)*.010;
      sculpt+=gaussian(x,y,0,.048,.015,.075)*.010;
      sculpt+=gaussian(x,y,0,-.079,.060,.024)*.015;
      sculpt-=gaussian(x,y,0,-.112,.062,.028)*.018;
      sculpt+=gaussian(x,y,0,-.159,.053,.024)*.026;
      z+=sculpt*front;
    }
    // Tiny low-frequency asymmetry reads as damaged flesh, without noise spikes.
    x+=.0015*Math.sin(y*38)*Math.max(0,z/.14);positions.setXYZ(i,x,y,z);
  }skullGeo.computeVertexNormals();shape(head,skullGeo,skin,[0,0,0],[1,1,1]);
  const browWeight=brute?1.24:feral?1.1:1,faceSnarl=feral?.18:brute?.14:.10;
  for(const side of [-1,1]){
    const socket=detail(head,recess,[side*.077,.023,.133],[.031,.014,.014]);socket.rotation.z=side*.23;
    const eye=shape(head,eyeGeo,eyes,[side*.077,.023,.153],[.023,.010,.010]);eye.rotation.z=side*.22;eye.name='Red eye';
    const brow=detail(head,skin,[side*.073,.048,.139],[.036,.004*browWeight,.006]);brow.rotation.z=side*.25;brow.name='Scowling brow';
    const lid=detail(head,skin,[side*.077,.007,.141],[.032,.004,.006]);lid.rotation.z=side*.17;
    const fold=detail(head,skin,[side*.040,-.066,.129],[.006,.026,.008]);fold.rotation.z=side*.30;
    ell(head,skin,[side*.145,-.012,-.007],[.019,.041,.022]);detail(head,wound,[side*.157,-.011,.007],[.004,.019,.008]);
    detail(head,skin,[side*.145,-.043,.001],[.013,.014,.014]);
  }
  // A tapered nasal bridge joins a small tip and alae instead of three large balls.
  const nose=garment(head,skin,[[-.055,.013,.007],[-.045,.024,.015],[-.032,.023,.018],[-.008,.014,.018],[.028,.011,.010],[.055,.006,.004]]);
  const np=nose.geometry.attributes.position;for(let i=0;i<np.count;i++){const y=np.getY(i);np.setZ(i,np.getZ(i)+.132+.025*Math.exp(-(((y+.032)/.043)**2)));}nose.geometry.computeVertexNormals();
  for(const side of [-1,1])detail(head,recess,[side*.014,-.052,.166],[.006,.003,.004]);
  detail(head,recess,[0,-.116,.132],[.065,.021,.012]);
  const jaw=joint(head,[0,-.09,.016],'jaw');ell(jaw,skin,[0,-.052,.066],[brute?.087:.079,.037,.064]);
  detail(head,wound,[0,-.095,.141],[.058,.005,.009]);detail(jaw,wound,[0,-.025,.126],[.061,.005,.008]);
  const lipPoints=[[-.060,-.108,.123],[-.043,-.098,.141],[-.021,-.094,.151],[0,-.096,.154],[.022,-.093,.150],[.044,-.101,.138],[.060,-.110,.122]].map(v=>new T.Vector3(...v));
  shape(head,own(tint(new T.TubeGeometry(new T.CatmullRomCurve3(lipPoints),18,.0035,5,false),.04)),wound,[0,0,0],[1,1,1]).name='Curled upper lip';
  const toothGeo=own(tint(new T.SphereGeometry(1,10,8),.07)),tp=toothGeo.attributes.position;
  for(let i=0;i<tp.count;i++)for(const axis of ['X','Y','Z']){const v=tp['get'+axis](i);tp['set'+axis](i,Math.sign(v)*Math.abs(v)**(axis==='Y'?.38:.55));}toothGeo.computeVertexNormals();
  for(let i=0;i<7;i++){
    const x=(i-3)*.016,z=.152-Math.abs(x)*.30,canine=i===0||i===6;
    const tooth=shape(head,toothGeo,bone,[x,-.108,z],[.0065,rand(.009,.012)+(canine?(feral?.008:.003):0),.006]);tooth.rotation.z=(i-3)*.035;
    if(i!==2&&i!==5)shape(jaw,toothGeo,bone,[x,-.025,z-.007],[.0055,canine?.009:.007,.0055]);
  }
  if(style.hat){ell(head,cloth,[0,.169,-.018],[.151,.056,.140]);const brim=ell(head,boot,[0,.145,.108],[.150,.009,.084]);brim.rotation.x=-.06;}
  else if(!feral){ell(head,hair,[0,.148,-.040],[.135,.056,.111]);for(const s of [-1,1])detail(head,hair,[s*.126,.071,-.069],[.020,.068,.056]);}
  const legs=[],arms=[],pieces=[{node:root,a:'pelvis',b:'chest',frame:true},{node:spine,a:'pelvis',b:'chest',frame:true},{node:head,a:'chest',b:'skull'}];
  for(const [index,side] of [-1,1].entries()){
    const tag=index?'R':'L';
    const leg=joint(root,[side*.123,-.035,0],tag+' hip');
    garment(leg,pants,[[-.405,.067,.079],[-.22,.089,.102],[-.02,.105*bulk,.113]]);
    const calf=joint(leg,[0,-.415,0],tag+' knee');
    ell(calf,index===0?skin:pants,[0,-.015,.012],[.064,.06,.071]);
    garment(calf,pants,[[-.325,.046,.051],[-.22,.057,.060],[-.10,.078,.078],[-.045,.067,.072]],index===0);
    for(let i=0;i<2;i++){const fold=detail(leg,pants,[side*.014,-.32-i*.029,.073],[.061,.007,.009]);fold.rotation.z=side*.07;}
    const foot=joint(calf,[0,-.345,0],tag+' ankle');
    ell(foot,boot,[0,-.018,.066],[.087,.081,.154]);box(foot,boot,[0,-.074,.059],[.17,.036,.29]);
    for(let i=0;i<3;i++)box(foot,lining,[0,.043,.037+i*.027],[.064,.007,.008]);
    legs.push({pivot:leg,calf,foot});pieces.push({node:leg,a:tag+'hip',b:tag+'knee'},{node:calf,a:tag+'knee',b:tag+'ankle'},{node:foot,a:tag+'ankle',b:tag+'toe'});
    const arm=joint(spine,[side*.238*bulk,.411,-.004],tag+' shoulder');
    garment(arm,feral?skin:cloth,[[-.303,.060,.064],[-.22,.070,.069],[-.105,.089,.084],[.02,.088,.080],[.055,.059,.057],[.072,.003,.003]],!feral);
    const forearm=joint(arm,[0,-.32,0],tag+' elbow');ell(forearm,skin,[0,-.015,0],[.053,.045,.053]);
    garment(forearm,skin,[[-.29,.036,.036],[-.235,.043,.040],[-.155,.058,.055],[-.07,.058,.053],[.027,.050,.049]]);
    const cut=detail(forearm,wound,[side*.022,-.115,.051],[.007,.033,.008]);cut.rotation.z=side*.24;
    for(const s of [-1,1]){const tendon=detail(forearm,skin,[s*.016,-.23,.028],[.004,.045,.005]);tendon.rotation.z=s*.07;}
    const hand=joint(forearm,[0,-.29,.014],tag+' wrist');ell(hand,skin,[0,-.039,.002],[.049,.061,.024]);
    for(let f=0;f<4;f++){const x=(f-1.5)*.024,finger=joint(hand,[x,-.081,.006],tag+' finger');finger.rotation.x=-rand(.17,.48);detail(finger,skin,[0,-.029,0],[.010,.033,.011]);detail(finger,skin,[0,-.063,.014],[.008,.025,.009]);detail(finger,bone,[0,-.078,.021],[.007,.008,.003]);detail(hand,skin,[x,-.071,-.016],[.011,.011,.01]);hand.updateWorldMatrix(true,true);for(const m of [...finger.children])hand.attach(m);hand.remove(finger);}
    if(feral)for(let f=0;f<4;f++){const claw=ell(hand,bone,[(f-1.5)*.026,-.225,.036],[.009,.054,.01]);claw.rotation.x=-.2;}
    const thumb=detail(hand,skin,[side*.049,-.034,.014],[.015,.039,.016]);thumb.rotation.z=side*.5;
    arms.push({pivot:arm,forearm,hand});pieces.push({node:arm,a:tag+'shoulder',b:tag+'elbow'},{node:forearm,a:tag+'elbow',b:tag+'wrist'},{node:hand,a:tag+'wrist',b:tag+'palm'});
  }
  const rig={group,root,spine,torso,head,jaw,legs,arms,pieces,resources,style:style.name,faceSnarl,phase:rand(0,6.28),limp:rand(.12,.4),lean:rand(-.12,.12),stride:rand(.85,1.15),attackHand:Math.floor(rng()*2),attackTime:-1,flinch:0,flinchDirection:1,brute,feral};
  // Uniform global scale keeps joint matrices free of shear when a ragdoll detaches.
  group.scale.setScalar(brute?BRUTE.scale:rand(.97,1.06));
  return rig;
}

export function tagZombie(rig,enemy){
  rig.group.traverse(o=>{if(o.isMesh){o.userData.enemy=enemy;o.userData.part='torso';o.userData.side=0;}});
  for(const [i,leg] of rig.legs.entries())leg.pivot.traverse(o=>{if(o.isMesh){o.userData.part='leg';o.userData.side=i?1:-1;o.userData.limb='rear';}});
  for(const [i,arm] of rig.arms.entries())arm.pivot.traverse(o=>{if(o.isMesh){o.userData.part=rig.dog?'leg':'arm';o.userData.side=i?1:-1;o.userData.limb='front';}});
  rig.head.traverse(o=>{if(o.isMesh){o.userData.head=true;o.userData.part='head';}});
  // Original geometries that were merged are no longer needed.
  if(rig.sharedAssets)return;
  const retained=new Set();rig.group.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});
  for(const geo of rig.resources.geometries)if(!retained.has(geo)){geo.dispose();rig.resources.geometries.delete(geo);}
}

export function reactToHit(e,impact={}){
  const yaw=e.group.rotation.y,dx=impact.direction?.x??0,dz=impact.direction?.z??-1;
  e.flinchDirection=clamp(dx*Math.cos(yaw)-dz*Math.sin(yaw),-1,1);
  e.flinchForward=clamp(dx*Math.sin(yaw)+dz*Math.cos(yaw),-1,1);
  e.flinchPart=impact.part||'torso';e.flinchSide=impact.side||((e.flinchDirection||1)>0?1:-1);e.flinchLimb=impact.limb;
  e.flinchDuration=e.flinchPart==='head'?.30:e.flinchPart==='leg'?.22:.25;e.flinch=e.flinchDuration;
  e.flinchStrength=clamp(impact.force??.8,.45,2)*(e.brute?.65:1);
  if(e.flinchPart==='head'&&e.staggerLeft>0)e.staggerPart='head';
  e.legHit=impact.part==='leg'?.32:(e.legHit||0);
}

// Additive reactions reuse the existing head, spine and limb joints. They never
// alter navigation or create a second animated/transparent copy of the enemy.
export function applyHitReaction(e,dt){
  e.flinch=Math.max(0,(e.flinch||0)-dt);e.legHit=Math.max(0,(e.legHit||0)-dt);
  if(e.flinch>0){
    const duration=e.flinchDuration||.25,age=duration-e.flinch;
    const f=(e.flinch/duration)*Math.min(1,age/.025)*(e.flinchStrength||.8),x=e.flinchDirection||0,z=e.flinchForward??-1;
    if(e.flinchPart==='head'){
      // A small neck snap lifts the chin without folding or lowering the body.
      e.head.rotation.x-=Math.min(f,.9)*(e.dog?.26:.30)*1.15;e.head.rotation.y-=x*f*.16;e.head.rotation.z-=x*f*.12;
      e.jaw.rotation.x+=f*.09;
    }else if(e.flinchPart==='arm'){
      const arm=e.arms[e.flinchSide>0?1:0];arm.pivot.rotation.x+=f*.42;arm.pivot.rotation.z+=e.flinchSide*f*.28;arm.forearm.rotation.x-=f*.35;
      e.spine.rotation.z-=e.flinchSide*f*.10;
    }else if(e.flinchPart==='leg'){
      const leg=(e.dog&&e.flinchLimb==='front'?e.arms:e.legs)[e.flinchSide>0?1:0];
      leg.pivot.rotation.x-=f*.20;(leg.calf||leg.forearm).rotation.x+=f*(e.dog?-.38:.46);
      (leg.foot||leg.hand).rotation.x-=f*.14;e.root.position.y-=f*(e.dog?.045:.055);
    }else{
      e.spine.rotation.x+=z*f*(e.dog?.15:.20);e.spine.rotation.z-=x*f*.20;e.head.rotation.x-=z*f*.10;
    }
  }
  if(e.staggerLeft>0&&e.staggerPart!=='head'){
    const f=Math.min(1,e.staggerLeft/.08);e.root.position.y-=f*(e.dog?.07:.10);e.spine.rotation.x+=f*(e.dog?.13:.22);
    if(!e.dog)for(const arm of e.arms)arm.forearm.rotation.x-=f*.18;
  }
}

// Distance-driven stride stays still against walls. Each individual has a limp,
// off-axis head pose, wrist drag, breathing and a wind-up/contact/recovery attack.
export function animateZombie(e,dt,distance,moved){
  const moving=clamp(moved/Math.max(dt*e.speed,.0001),0,1),blend=1-Math.exp(-dt*12);
  e.motion=T.MathUtils.lerp(e.motion||0,moving,blend);e.phase+=moved*6.4/e.stride;e.idle=(e.idle||0)+dt;
  const p=e.phase,w=e.motion,run=clamp((e.speed-1.1)/1.8,0,1);
  e.root.position.y=.92-Math.abs(Math.sin(p))*.025*w-(e.legHit>0?.055:0);
  e.root.rotation.set(.055+run*.08+(e.feral?.14:0),Math.sin(p)*.055*w,Math.sin(p)*e.limp*.1*w);
  e.spine.rotation.set(.1+run*.07+(e.feral?.12:0),Math.sin(p)*.095*w,e.lean*.3);
  e.head.rotation.set((e.feral?-.24:-.07)+Math.sin(e.idle*1.1)*.055,Math.sin(p*.5)*.065,e.lean+Math.sin(e.idle*.8)*.035);
  e.jaw.rotation.x=(e.faceSnarl??.14)+Math.sin(e.idle*2.3)*.025;
  let contact=false;
  if(e.staggerLeft>0)e.attackTime=-1;
  if(!(e.staggerLeft>0)&&e.attackTime<0&&distance<1.65&&e.attack<=0){e.attackTime=0;e.attackHand=1-e.attackHand;e.attack=.95+(e.brute?.25:0);}
  let strike=0,windup=0;
  if(e.attackTime>=0){const prev=e.attackTime;e.attackTime+=dt;const hit=e.brute?.46:.34;windup=clamp(e.attackTime/hit,0,1);strike=clamp((e.attackTime-hit)/.17,0,1);contact=prev<hit&&e.attackTime>=hit;
    e.spine.rotation.y+=(e.attackHand?1:-1)*Math.sin(Math.min(1,e.attackTime/.85)*Math.PI)*.33;
    e.spine.rotation.x+=Math.sin(strike*Math.PI)*.17;e.jaw.rotation.x+=.16*Math.sin(windup*Math.PI/2);
    if(e.attackTime>.85){e.attackTime=-1;strike=windup=0;}
  }
  for(let j=0;j<2;j++){
    const v=Math.sin(p+j*Math.PI),side=j?1:-1,limp=j===0?1-e.limp:1,leg=e.legs[j],arm=e.arms[j];
    leg.pivot.rotation.set(v*(.42+run*.16+(e.feral?.14:0))*w*limp,0,side*.025);leg.calf.rotation.x=Math.max(0,-v)*(.62+run*.25)*w+.04;leg.foot.rotation.x=-leg.calf.rotation.x*.35;
    arm.pivot.rotation.set(-.3-v*.22*w-run*.14,side*.09,side*(.10+Math.sin(p*.5)*.035));arm.forearm.rotation.set((e.feral?-.7:-.23)-Math.max(0,v)*.18*w,0,side*.055);arm.hand.rotation.set(-.17,0,side*.13);
    if(e.attackTime>=0&&(j===e.attackHand||e.brute)){
      const recover=1-clamp((e.attackTime-.54)/.31,0,1);
      arm.pivot.rotation.x+=(-.55*windup-1.05*Math.sin(strike*Math.PI/2))*recover;
      arm.pivot.rotation.z+=side*.3*windup*recover;arm.forearm.rotation.x-=.8*windup*(1-strike)*recover;arm.hand.rotation.x-=.3*recover;
    }
  }
  if(e.brute&&e.crouch>0){
    const crouch=clamp(e.crouch,0,1);
    e.root.position.y-=.39*crouch;e.spine.rotation.x+=.6*crouch;
    for(const leg of e.legs){leg.pivot.rotation.x-=crouch;leg.calf.rotation.x+=2*crouch;leg.foot.rotation.x-=crouch;}
  }
  applyHitReaction(e,dt);return contact;
}

const forceScale=force=>clamp(force??1,.5,4)*1.5;
const pointWorld=(node,offset=new T.Vector3())=>node.localToWorld(offset.clone());
const basisX=new T.Vector3(),basisY=new T.Vector3(),basisZ=new T.Vector3(),basisMatrix=new T.Matrix4(),bodyRotation=new T.Quaternion(),limbRotation=new T.Quaternion(),limbDirection=new T.Vector3();
function bodyBasis(points,target=new T.Quaternion()){
  basisX.copy(points.Rshoulder.p).sub(points.Lshoulder.p).normalize();basisY.copy(points.chest.p).sub(points.pelvis.p).normalize();basisZ.crossVectors(basisX,basisY).normalize();basisY.crossVectors(basisZ,basisX).normalize();
  return target.setFromRotationMatrix(basisMatrix.makeBasis(basisX,basisY,basisZ));
}

// Position-based ragdoll: fixed-step Verlet integration, distance constraints,
// limb extension limits, ground friction and the game's wall collision.
export function beginZombieDeath(e,impact={},rng=Math.random){
  e.group.updateMatrixWorld(true);
  const points={},constraints=[],scale=e.group.scale.y,origin=e.group.getWorldPosition(new T.Vector3());
  function add(name,p,r,mass=1){points[name]={p:p.clone(),prev:p.clone(),radius:r*scale,invMass:1/mass};}
  add('pelvis',pointWorld(e.root),.15,2.5);add('chest',pointWorld(e.spine,new T.Vector3(0,e.dog?.04:.36,e.dog?.08:0)),.18,3);add('skull',pointWorld(e.head,new T.Vector3(0,.04,0)),.16,1.2);
  add('back',pointWorld(e.spine,new T.Vector3(0,e.dog?.17:.26,-.13)),.1,1.5);
  for(let i=0;i<2;i++){const t=i?'R':'L',l=e.legs[i],a=e.arms[i];add(t+'hip',pointWorld(l.pivot),.09,1.5);add(t+'knee',pointWorld(l.calf),.085);add(t+'ankle',pointWorld(l.foot),.10);add(t+'toe',pointWorld(l.foot,new T.Vector3(0,0,e.dog?.10:.17)),e.dog?.045:.09);add(t+'shoulder',pointWorld(a.pivot),.11,1.5);add(t+'elbow',pointWorld(a.forearm),.075);add(t+'wrist',pointWorld(a.hand),.045,.65);add(t+'palm',pointWorld(a.hand,new T.Vector3(0,e.dog?0:-.12,e.dog?.10:.025)),.045,.45);}
  function link(a,b,stiffness=1,minRatio=1){constraints.push({a,b,length:points[a].p.distanceTo(points[b].p),stiffness,minRatio});}
  const body=['pelvis','chest','Lhip','Rhip','Lshoulder','Rshoulder','back'];for(let i=0;i<body.length;i++)for(let j=i+1;j<body.length;j++)link(body[i],body[j]);
  link('chest','skull');link('back','skull',.65);link('Lshoulder','skull',.65,.82);link('Rshoulder','skull',.65,.82);
  for(const t of ['L','R']){link(t+'hip',t+'knee');link(t+'knee',t+'ankle');link(t+'ankle',t+'toe');link(t+'shoulder',t+'elbow');link(t+'elbow',t+'wrist');link(t+'wrist',t+'palm');link(t+'hip',t+'ankle',.65,.50);link(t+'shoulder',t+'wrist',.55,.35);link(t+'knee',t+'toe',.8,.85);}
  const direction=impact.direction?.clone()||new T.Vector3(0,0,-1).applyQuaternion(e.group.quaternion);direction.y=0;if(direction.lengthSq()<.001)direction.set(.1,0,-1);direction.normalize();
  const side=new T.Vector3(direction.z,0,-direction.x);
  let type=impact.source==='grenade'?'blast':impact.part==='leg'?'buckle':['recoil','stumble','left shoulder','right shoulder','twist'][Math.floor(rng()*5)];
  if(impact.part==='arm'&&impact.side&&rng()<.7)type=impact.side<0?'left shoulder':'right shoulder';
  if(impact.part==='head'&&impact.source!=='grenade')type=['recoil','left shoulder','right shoulder','twist'][Math.floor(rng()*4)];
  if(impact.source==='shotgun'&&impact.part==='torso'&&rng()<.65)type='recoil';
  const torque=impact.point?new T.Vector3().subVectors(impact.point,points.chest.p).cross(direction).multiplyScalar(forceScale(impact.force)):new T.Vector3();torque.clampLength(0,2.4);
  const sign=type==='left shoulder'?-1:type==='right shoulder'?1:rng()<.5?-1:1,force=clamp(impact.force??1,0.5,4),lateral=type.includes('shoulder')?1.05:.32;
  // Different momentum at the hips, shoulders and extremities creates torque;
  // the constraints resolve it into a fall instead of rotating one rigid model.
  for(const [name,p] of Object.entries(points)){
    const height=clamp((p.p.y-origin.y)/scale,0,2),velocity=direction.clone().multiplyScalar((.4+height*.85)*force);
    velocity.addScaledVector(side,sign*lateral*height);velocity.add(new T.Vector3().crossVectors(torque,p.p.clone().sub(points.chest.p)));
    if(type==='stumble')velocity.multiplyScalar(-.65);
    if(type==='buckle'){velocity.multiplyScalar(.35);velocity.y=-1.3;}
    if(type==='twist'){velocity.addScaledVector(direction,name.startsWith('L')?1.4:name.startsWith('R')?-1.0:0);}
    if(type==='blast'){velocity.y=2.4+height*.7;velocity.addScaledVector(side,(rng()-.5)*1.2);}
    if(name==='skull'&&impact.part==='head')velocity.addScaledVector(direction,2.1);
    if(name.includes('wrist')||name.includes('palm'))velocity.addScaledVector(side,sign*.6);
    p.prev.copy(p.p).addScaledVector(velocity,-1/120);
  }
  const initialBasis=bodyBasis(points),pieces=e.pieces.map(({node,a,b,frame})=>({node,a,b,frame,offset:node.getWorldPosition(new T.Vector3()).sub(points[a].p),direction:points[b].p.clone().sub(points[a].p).normalize(),rotation:node.getWorldQuaternion(new T.Quaternion()),scale:node.getWorldScale(new T.Vector3())}));
  // Detach only articulated segment roots; fingers and jaw stay with their segment.
  for(const piece of pieces)piece.node.removeFromParent();e.group.clear();e.group.position.set(0,0,0);e.group.rotation.set(0,0,0);e.group.scale.set(1,1,1);
  for(const piece of pieces)e.group.add(piece.node);
  e.ragdoll={points,pointList:Object.values(points),constraints,pieces,initialBasis,inverseBasis:initialBasis.clone().invert(),type,accumulator:0,age:0,life:8+rng()*2,asleep:false,restTime:0,scale};
  renderRagdoll(e.ragdoll);return e.ragdoll;
}

function renderRagdoll(r){
  const bodyDelta=bodyBasis(r.points,bodyRotation).multiply(r.inverseBasis);
  for(const piece of r.pieces){limbDirection.copy(r.points[piece.b].p).sub(r.points[piece.a].p).normalize();const q=piece.frame?bodyDelta:limbRotation.setFromUnitVectors(piece.direction,limbDirection);piece.node.position.copy(piece.offset).applyQuaternion(q).add(r.points[piece.a].p);piece.node.quaternion.copy(q).multiply(piece.rotation);piece.node.scale.copy(piece.scale);}
}

export function updateZombieDeath(e,dt,isBlocked=()=>false,floorHeight=()=>.11){
  const r=e.ragdoll;r.age+=dt;e.death=r.age;if(r.age>r.life)return true;
  if(!r.asleep){r.accumulator+=Math.min(dt,.05);const h=1/120;while(r.accumulator>=h){r.accumulator-=h;let motion=0;
    for(const p of r.pointList){const x=p.p.x,y=p.p.y,z=p.p.z;p.p.x+=(x-p.prev.x)*.993;p.p.y+=(y-p.prev.y)*.993-12*h*h;p.p.z+=(z-p.prev.z)*.993;p.prev.set(x,y,z);}
    for(let iteration=0;iteration<10;iteration++){
      for(const c of r.constraints){const a=r.points[c.a],b=r.points[c.b],dx=b.p.x-a.p.x,dy=b.p.y-a.p.y,dz=b.p.z-a.p.z,len=Math.sqrt(dx*dx+dy*dy+dz*dz);if(len<1e-6)continue;const target=clamp(len,c.length*c.minRatio,c.length),correction=(len-target)/len*c.stiffness/(a.invMass+b.invMass),wa=correction*a.invMass,wb=correction*b.invMass;a.p.x+=dx*wa;a.p.y+=dy*wa;a.p.z+=dz*wa;b.p.x-=dx*wb;b.p.y-=dy*wb;b.p.z-=dz*wb;}
      for(const p of r.pointList){
        const ground=floorHeight(p.p.x,p.p.z,p.p.y)+p.radius,onGround=p.p.y<ground;if(onGround){p.p.y=ground;p.prev.y=Math.min(p.prev.y,p.p.y);}
        if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y)){const x=p.p.x;p.p.x=p.prev.x;if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y)){p.p.x=x;p.p.z=p.prev.z;if(isBlocked(p.p.x,p.p.z,p.radius,p.p.y))p.p.x=p.prev.x;}p.prev.x=p.p.x;p.prev.z=p.p.z;}
        // Apply floor friction after wall correction, so a constraint cannot
        // drag the previous contact point a little farther into a nearby wall.
        if(onGround){p.prev.x=T.MathUtils.lerp(p.prev.x,p.p.x,.22);p.prev.z=T.MathUtils.lerp(p.prev.z,p.p.z,.22);}
      }
    }
    for(const p of r.pointList)motion=Math.max(motion,p.p.distanceToSquared(p.prev)/(h*h));
    r.restTime=motion<.008?r.restTime+h:0;if(r.restTime>.45||r.age>4.5){r.asleep=true;break;}
  }renderRagdoll(r);}
  // Opaque corpses disappear only after settling; no transparent ghost trails.
  if(r.age>r.life-.65)e.group.position.y=-((r.age-(r.life-.65))/.65)*.6;
  return r.age>r.life;
}
