import * as T from './three.module.js';
import {applyHitReaction,springTo} from './zombies.mjs?v=138';
import {makeRedEyeMaterial,makeEyeGeometry} from './enemy-faces.mjs?v=133';
import {ENEMY_SURFACE,markEnemySurface} from './enemy-surfaces.mjs?v=134';
import {paint,tube,sweep,shard,uvWindow,pooledLump} from './enemy-sculpt.mjs?v=133';
const clamp=T.MathUtils.clamp;
export const DOG_SPEED_MULTIPLIER=1.25;
export const RARE_DOG_SPEED_MULTIPLIER=1.5;

export function createZombieDogRig({rng=Math.random,rare=false}={}){
  const group=new T.Group(),root=new T.Group();group.add(root);root.position.set(0,.56,-.28);
  const resources={geometries:new Set(),materials:new Set()},rand=(a,b)=>a+(b-a)*rng();
  const material=(color,roughness=.88)=>{const m=new T.MeshStandardMaterial({color,roughness,vertexColors:true});resources.materials.add(m);return m;};
  const fur=material(rare?0x20262c:[0x4a463c,0x3d4139,0x5a4e42][Math.floor(rng()*3)]),skin=material(rare?0x5f676d:0x6f6e60),dark=material(0x150e10),scar=material(0x59423c),teeth=material(0xb0a37f),leather=material(0x3a2c25),metal=material(0x6f6450,.55),gum=material(0x4c2026,.45),bone=material(0xb6aa8a,.66),eye=makeRedEyeMaterial(resources);
  for(const [m,tile] of [[fur,ENEMY_SURFACE.fur],[skin,ENEMY_SURFACE.skin],[scar,ENEMY_SURFACE.wound],[gum,ENEMY_SURFACE.wound],[teeth,ENEMY_SURFACE.bone],[bone,ENEMY_SURFACE.bone],[leather,ENEMY_SURFACE.leather]])markEnemySurface(m,tile);
  scar.color.setHex(0x70212b);scar.roughness=.48;
  function own(g,opts){resources.geometries.add(g);if(!g.attributes.color)paint(g,{amount:.18,ao:.3,...opts});return g;}
  const eyeGeo=own(makeEyeGeometry(),{amount:.03,ao:0}),bead=own(new T.SphereGeometry(1,8,6));
  function shape(p,geo,m,pos=[0,0,0],scale=[1,1,1],rot){const o=new T.Mesh(geo,m);o.position.set(...pos);o.scale.set(...scale);if(rot)o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  const L=(p,m,pos,s,opts={},rot)=>shape(p,own(pooledLump(rng,opts,.3,{amount:.18,ao:.3})),m,pos,s,rot);
  const S=(p,m,points,r,opts={})=>shape(p,own(uvWindow(sweep(rng,points,r,opts),rng,.25)),m);
  const dot=(p,m,pos,s,rot)=>shape(p,bead,m,pos,s,rot);
  const spike=(p,m,pos,s,rot,bend=.2)=>shape(p,own(shard(rng,{bend})),m,pos,s,rot);
  // A body tube laid along +Z: ring "depth" is vertical and the tube's front
  // (belly option) faces down.
  const along=(p,m,rings,opts,pos=[0,0,0])=>shape(p,own(tube(rng,rings,{sides:14,...opts}),{amount:.22,ao:.35}),m,pos,[1,1,1],[Math.PI/2,0,0]);
  const joint=(p,pos,name)=>{const j=new T.Group();j.name=name;j.position.set(...pos);p.add(j);return j;};
  // Bony haunches and jutting hip bones.
  L(root,fur,[0,.0,-.04],[.15,.15,.17],{rough:.22});
  for(const side of [-1,1])L(root,bone,[side*.085,.11,-.02],[.03,.025,.05],{rough:.2});
  const spine=joint(root,[0,.02,.42],'dog chest');
  // Starved hound: deep keel chest, a waist tucked up under the spine.
  const torso=along(spine,fur,[[-.44,.12,.12,{z:-.02}],[-.32,.085,.09,{z:-.07}],[-.2,.12,.15,{z:-.03}],[-.06,.15,.2,{z:.01}],[.07,.145,.21,{z:.02}],[.17,.11,.15,{z:-.03}]],{rough:.06,ribs:rare?.05:.09,ribRange:[.4,.85],ribFreq:30,folds:.04});
  // Ragged neck ruff and mangy tufts down the spine.
  along(spine,fur,[[.12,.1,.12,{z:-.06}],[.22,.09,.1,{z:-.12}],[.3,.075,.08,{z:-.17}]],{rough:.12,ragged:.02});
  for(let i=0;i<9;i++)L(spine,i%3?fur:skin,[0,.2-i*.012*(i>5?2:0)-(i>5?.04:0),-.36+i*.065],[.02,.022,.03],{rough:.25});
  for(let i=0;i<14;i++){const side=i%2?1:-1;spike(spine,fur,[side*rand(.05,.11),rand(.12,.2),rand(-.36,.2)],[.025,rand(.05,.09),.02],[-.9,0,side*rand(.3,.8)]);}
  // Torn hide on one flank: raw muscle and bare ribs.
  const torn=rng()<.5?-1:1;
  L(spine,scar,[torn*.135,-.01,-.02],[.03,.1,.13],{rough:.4});
  for(let i=0;i<4;i++)S(spine,bone,[[torn*.13,.11,-.12+i*.06],[torn*.155,.0,-.11+i*.06],[torn*.13,-.11,-.09+i*.06]],.009,{sides:5});
  for(const side of [-1,1])L(spine,scar,[side*.15,.06,.12],[.022,.05,.04],{rough:.4});
  const head=joint(spine,[0,.18,.32],'dog head');
  // A long, narrow skull: heavy brow, gaunt cheeks, a lipless muzzle.
  L(head,fur,[0,.03,.0],[.11,.11,.15],{rough:.12,pull:[0,0,-1]});
  L(head,skin,[0,-.01,.17],[.07,.055,.14],{rough:.1,pull:[0,0,1]});
  L(head,dark,[0,-.006,.3],[.05,.032,.028],{rough:.1});
  for(const s of [-1,1])dot(head,dark,[s*.016,-.004,.322],[.009,.008,.006]);
  for(const side of [-1,1]){
    dot(head,dark,[side*(rare?.115:.088),rare?.066:.05,rare?.153:.105],[.034,.024,.02],[0,0,side*.27]);
    const glow=shape(head,eyeGeo,eye,[side*(rare?.116:.092),rare?.066:.05,rare?.18:.12],rare?[.024,.012,.015]:[.019,.009,.012]);glow.rotation.z=side*.25;glow.name=rare?'Ashfang red eye':'Red eye';
    if(!rare){const brow=L(head,fur,[side*.075,.09,.105],[.045,.018,.035],{rough:.2});brow.rotation.z=side*.38;brow.name='Scowling brow';}
    // Ears: one pricked, one torn to a ragged stump.
    const ear=joint(head,[side*.07,.115,-.05],'dog ear');ear.rotation.z=side*-.3;ear.rotation.x=-.25;
    const tornEar=side===torn;
    spike(ear,fur,[0,0,0],[.05,tornEar?.08:.15,.03],[0,0,0],.15);spike(ear,scar,[0,.005,.012],[.028,tornEar?.06:.1,.012],[0,0,0],.15);
    L(head,skin,[side*.06,-.03,.12],[.022,.035,.09],{rough:.2});
    const lip=L(head,gum,[side*.05,-.04,.2],[.016,.012,.09],{rough:.3});lip.rotation.z=-side*.15;lip.name='Curled upper lip';
    L(head,dark,[side*.058,-.016,.165],[.006,.02,.04],{rough:.2},[0,0,side*.33]);
  }
  for(const z of [.181,.217])dot(head,fur,[0,.045,z],[.05,.008,.012]);
  const jaw=joint(head,[0,-.054,.043],'dog jaw');
  L(jaw,dark,[0,-.004,.121],[.06,.02,.14],{rough:.1});L(jaw,skin,[0,-.024,.12],[.06,.024,.15],{rough:.15});
  L(jaw,gum,[0,.008,.12],[.052,.008,.13],{rough:.2});
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const fang=i===0,z=fang?.255:.1+i*.035,len=fang?.06:.022+rng()*.012;
    if(!fang&&rng()<.2)continue;
    spike(head,teeth,[side*(.052-i*.004),-.05,z],[.009,len,.009],[Math.PI+rand(-.15,.15),0,0],.1);
    spike(jaw,teeth,[side*(.05-i*.004),.012,z-.15*(i?1:0)-(fang?.03:0)],[.008,fang?.045:len*.8,.008],[rand(-.15,.15),0,0],.1);
  }
  const collar=own(new T.TorusGeometry(.12,.022,6,20));shape(spine,collar,leather,[0,.15,.25],[1,1,1]).rotation.x=.32;
  L(spine,metal,[0,.01,.353],[.03,.036,.01],{rough:.1});
  // Definition (v134): a studded collar, strings of bloody drool, matted
  // haunches and one cheek torn back to the gums.
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,cx=Math.cos(a)*.13,cy=Math.sin(a)*.13;spike(spine,metal,[cx,.15+cy*Math.cos(.32),.25-cy*Math.sin(.32)],[.012,.03,.012],[.32+Math.PI/2*0,0,a-Math.PI/2],.0);}
  for(const side of [-1,1])S(head,gum,[[side*.045,-.06,.2],[side*.05,-.1,.19],[side*.048,-.15,.2]],t=>.0035*(1-t*.5),{sides:4,segments:5});
  for(let i=0;i<8;i++){const side=i%2?1:-1;spike(root,fur,[side*rand(.06,.13),rand(-.08,.08),rand(-.15,.04)],[.022,rand(.05,.08),.016],[2.4+rand(-.3,.3),0,side*rand(.2,.6)],.3);}
  L(head,dark,[torn*.06,-.04,.15],[.012,.02,.05],{rough:.3});L(head,scar,[torn*.064,-.03,.15],[.014,.024,.055],{rough:.5});
  // A thin, rat-like tail with a few clumps of fur.
  const tail=joint(root,[0,.045,-.21],'dog tail');tail.rotation.x=-.34;
  S(tail,skin,[[0,0,0],[0,-.04,-.12],[0,-.08,-.25]],t=>.03-t*.012,{sides:6,rough:.15});
  L(tail,fur,[0,-.03,-.08],[.032,.03,.06],{rough:.3});
  const tailTip=joint(tail,[0,-.09,-.30],'dog tail tip');
  S(tailTip,skin,[[0,.0,.02],[0,-.03,-.08],[0,-.06,-.17]],t=>.018*(1-t)+.003,{sides:5,rough:.15});
  const legs=[],arms=[],pieces=[{node:root,a:'pelvis',b:'chest',frame:true},{node:spine,a:'pelvis',b:'chest',frame:true},{node:head,a:'chest',b:'skull'}];
  const limb=(p,m,rings,opts={})=>shape(p,own(tube(rng,rings,{sides:9,rough:.1,...opts}),{amount:.2,ao:.3}),m);
  function paw(p,front){
    L(p,fur,[0,front?-.028:-.033,.04],[.045,.035,.075],{rough:.15,flat:-.5});
    for(let c=0;c<4;c++){const x=(c-1.5)*.02;L(p,fur,[x,front?-.04:-.045,.1],[.013,.016,.02],{rough:.2});spike(p,dark,[x,front?-.048:-.052,.118],[.007,.03,.007],[Math.PI/2+.4,0,0],.3);}
  }
  for(const [i,side] of [-1,1].entries()){
    const t=i?'R':'L';
    const rear=joint(root,[side*.14,-.015,-.045],t+' rear hip');
    limb(rear,fur,[[-.22,.035,.045,{z:.05}],[-.14,.055,.08,{z:.04}],[-.05,.07,.1,{z:.02}],[.04,.075,.11]],{folds:.08});
    const calf=joint(rear,[0,-.225,.055],t+' rear hock');
    L(calf,bone,[0,-.005,-.012],[.022,.026,.024],{rough:.2});
    limb(calf,skin,[[-.205,.02,.024,{z:-.045}],[-.1,.025,.03,{z:-.02}],[.0,.032,.036]],{ridge:.15,ridgeAngle:-Math.PI/2});
    const foot=joint(calf,[0,-.203,-.045],t+' rear paw');paw(foot,false);
    legs.push({pivot:rear,calf,foot});pieces.push({node:rear,a:t+'hip',b:t+'knee'},{node:calf,a:t+'knee',b:t+'ankle'},{node:foot,a:t+'ankle',b:t+'toe'});
    const front=joint(spine,[side*.155,-.04,.14],t+' foreleg');
    limb(front,fur,[[-.22,.032,.036],[-.12,.045,.055],[-.02,.06,.07],[.06,.07,.08]],{folds:.08});
    const forearm=joint(front,[0,-.22,0],t+' front elbow');
    L(forearm,bone,[0,0,-.02],[.024,.03,.024],{rough:.2});
    limb(forearm,skin,[[-.215,.022,.024,{z:.015}],[-.1,.024,.028],[.0,.03,.034]],{ridge:.15});
    const hand=joint(forearm,[0,-.21,.02],t+' front paw');paw(hand,true);
    arms.push({pivot:front,forearm,hand});pieces.push({node:front,a:t+'shoulder',b:t+'elbow'},{node:forearm,a:t+'elbow',b:t+'wrist'},{node:hand,a:t+'wrist',b:t+'palm'});
  }
  if(rare){
    const ember=material(0x8edbe0,.6);ember.emissive.set(0x40bbc7);ember.emissiveIntensity=.6;
    // A pale armored skull and swept horns change the silhouette, rather than
    // relying on a color swap to announce the faster hound.
    L(head,bone,[0,.07,.035],[.125,.105,.165],{rough:.12,pull:[0,0,.6]}).name='Ashfang skull mask';
    L(head,bone,[0,.02,.22],[.075,.05,.13],{rough:.12,pull:[0,0,1]}).name='Ashfang long muzzle';
    for(const side of [-1,1]){
      L(head,bone,[side*.108,-.005,.141],[.025,.05,.085],{rough:.2}).name='Ashfang cheek plate';
      spike(head,bone,[side*.1,.13,-.06],[.04,.24,.045],[-1.05,0,-side*.35],.35).name='Ashfang swept horn';
      const brow=L(head,bone,[side*.097,.1,.154],[.05,.022,.034],{rough:.2});brow.rotation.z=side*.38;brow.name='Ashfang scowling brow';
      L(spine,bone,[side*.15,.1,.12],[.05,.1,.11],{rough:.2}).name='Ashfang shoulder plate';
      for(let i=0;i<3;i++){const rib=S(spine,bone,[[side*.12,.12,-.23+i*.09],[side*.165,.0,-.22+i*.09],[side*.13,-.12,-.2+i*.09]],.012,{sides:5});rib.name='Ashfang exposed rib';}
      spike(jaw,bone,[side*.05,-.008,.25],[.014,.085,.014],[.1,0,0],.1).name='Ashfang saber fang';
    }
    for(let i=0;i<6;i++){
      spike(spine,bone,[0,.2,-.34+i*.106],[.04,.13+(i%2)*.055,.05],[-.5,0,0],.25).name='Ashfang dorsal ridge';
      L(spine,ember,[0,.19,-.33+i*.106],[.03,.012,.03],{rough:.2}).name='Ashfang spectral seam';
    }
    spike(tailTip,bone,[0,-.06,-.18],[.06,.19,.05],[-Math.PI/2,0,0],.1).name='Ashfang barbed tail';
  }
  group.scale.setScalar(rare?1.06+rng()*.045:.97+rng()*.06);
  return {group,root,spine,torso,head,jaw,tail,tailTip,legs,arms,pieces,resources,style:rare?'ashfang hound':'zombie dog',dog:true,rareDog:rare,brute:false,phase:rng()*Math.PI*2,stride:.75+rng()*.12,attackTime:-1,flinch:0,flinchDirection:0,legHit:0};
}

export function animateZombieDog(e,dt,distance,moved,look=null){
  const moving=clamp(moved/Math.max(dt*e.speed,.0001),0,1);e.motion=T.MathUtils.lerp(e.motion||0,moving,1-Math.exp(-dt*12));e.phase+=moved*7.2/e.stride;e.idle=(e.idle||0)+dt;
  const p=e.phase,w=e.motion;
  e.root.position.set(0,.56+Math.cos(p*2)*(e.rareDog?.042:.024)*w-(e.legHit>0?.045:0),-.28);
  // v136: lean into turns, a flexing spine, a head that tracks the player with
  // a lagging neck, a tail that trails on springs, and ragged panting.
  const turn=clamp(e.turnRate||0,-5,5);
  e.root.rotation.set(Math.sin(p)*(e.rareDog?.045:.025)*w,0,Math.sin(p)*.022*w-turn*.05);
  e.spine.rotation.set(Math.sin(p*2)*.03*w+springTo(e,'dogFlex',Math.cos(p*2)*.03*w,dt,10,.4),Math.sin(p)*.035*w+turn*.05,0);
  let yawTo=0,pitchTo=0;
  if(look&&e.group){const gp=e.group.position,dx=look.x-gp.x,dz=look.z-gp.z,rel=Math.atan2(dx,dz)-e.group.rotation.y;yawTo=clamp(Math.atan2(Math.sin(rel),Math.cos(rel)),-.7,.7);pitchTo=clamp(-Math.atan2(look.y-(gp.y+.7),Math.hypot(dx,dz)),-.5,.25);}
  e.head.rotation.set(springTo(e,'dogPitch',-.055+pitchTo*.55+Math.sin(e.idle*1.3)*.025-Math.sin(p*2)*.03*w,dt,12,.5),springTo(e,'dogYaw',yawTo*.7+Math.sin(p*.5)*.035,dt,8,.55),springTo(e,'dogRoll',Math.sin(e.idle*.8)*.025-turn*.04,dt,6,.4));
  e.tail.rotation.y=springTo(e,'tail',Math.sin(p*.5)*.12*w-turn*.12,dt,6,.3);e.tailTip.rotation.y=springTo(e,'tailTip',e.tail.rotation.y*1.3,dt,5,.25);
  e.tail.rotation.x=-.34+springTo(e,'tailLift',-Math.cos(p*2)*.06*w,dt,7,.3);
  e.jaw.rotation.x=(e.rareDog?.17:.14)+Math.max(0,Math.sin(e.idle*(7+w*5)))*(.05+w*.04);
  let contact=false,lunge=0;
  if(e.staggerLeft>0)e.attackTime=-1;
  if(!(e.staggerLeft>0)&&e.attackTime<0&&distance<1.5&&e.attack<=0){e.attackTime=0;e.attack=1.05;}
  if(e.attackTime>=0){const prev=e.attackTime;e.attackTime+=dt;contact=prev<.30&&e.attackTime>=.30;
    const windup=clamp(e.attackTime/.26,0,1),snap=clamp((e.attackTime-.26)/.16,0,1),recover=1-clamp((e.attackTime-.42)/.26,0,1);
    lunge=Math.sin(snap*Math.PI/2)*recover;e.root.position.y-=.07*windup*(1-snap);e.root.position.z+=.17*lunge;e.spine.rotation.x-=.1*lunge;e.head.rotation.x-=.12*lunge;e.jaw.rotation.x+=.42*windup*(1-snap)+.10*recover;
    if(e.attackTime>.68)e.attackTime=-1;
  }
  for(let i=0;i<2;i++){
    const f=Math.sin(p+i*(e.rareDog?.38:Math.PI)),r=e.rareDog?Math.sin(p+Math.PI+i*.38):-f,leg=e.legs[i],arm=e.arms[i];
    leg.pivot.rotation.x=r*.45*w;leg.calf.rotation.x=-.12-Math.max(0,r)*.52*w;leg.foot.rotation.x=-leg.calf.rotation.x*.5;
    arm.pivot.rotation.x=f*.47*w-.24*lunge;arm.forearm.rotation.x=.08+Math.max(0,-f)*.50*w;arm.hand.rotation.x=-arm.forearm.rotation.x*.55;
  }
  applyHitReaction(e,dt);return contact;
}
