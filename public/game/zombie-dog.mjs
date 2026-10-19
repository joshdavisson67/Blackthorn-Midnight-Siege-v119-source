import * as T from './three.module.js';
import {applyHitReaction} from './zombies.mjs?v=124';
import {makeRedEyeMaterial,makeEyeGeometry} from './enemy-faces.mjs?v=63';
import {ENEMY_SURFACE,markEnemySurface} from './enemy-surfaces.mjs?v=63';
const clamp=T.MathUtils.clamp;
export const DOG_SPEED_MULTIPLIER=1.25;
export const RARE_DOG_SPEED_MULTIPLIER=1.5;

export function createZombieDogRig({rng=Math.random,rare=false}={}){
  const group=new T.Group(),root=new T.Group();group.add(root);root.position.set(0,.56,-.28);
  const resources={geometries:new Set(),materials:new Set()};
  const material=(color,roughness=.88)=>{const m=new T.MeshStandardMaterial({color,roughness,vertexColors:true});resources.materials.add(m);return m;};
  const fur=material(rare?0x252d35:[0x514e43,0x444940,0x64584b][Math.floor(rng()*3)]),skin=material(rare?0x6f7880:0x858675),dark=material(0x20171a),scar=material(0x59423c),teeth=material(0xc3b79b),leather=material(0x3e3029),metal=material(0x897f64,.55),eye=makeRedEyeMaterial(resources);
  for(const [m,tile] of [[fur,ENEMY_SURFACE.fur],[skin,ENEMY_SURFACE.skin],[scar,ENEMY_SURFACE.wound],[teeth,ENEMY_SURFACE.bone],[leather,ENEMY_SURFACE.leather]])markEnemySurface(m,tile);
  scar.color.setHex(0x70212b);scar.roughness=.48;
  function own(g){const p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const v=.87+.13*Math.sin(p.getX(i)*7+p.getZ(i)*9)**2;c.push(v,v*.99,v*.96);}g.setAttribute('color',new T.Float32BufferAttribute(c,3));resources.geometries.add(g);return g;}
  const ellipsoid=own(new T.SphereGeometry(1,16,12)),cone=own(new T.ConeGeometry(1,1,8)),cube=own(new T.BoxGeometry(1,1,1)),eyeGeo=own(makeEyeGeometry()),faceGeo=own(new T.SphereGeometry(1,12,8));
  function shape(parent,geo,m,pos,scale){const o=new T.Mesh(geo,m);o.position.set(...pos);o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const ell=(p,m,pos,s)=>shape(p,ellipsoid,m,pos,s),box=(p,m,pos,s)=>shape(p,cube,m,pos,s),joint=(p,pos,name)=>{const j=new T.Group();j.name=name;j.position.set(...pos);p.add(j);return j;};
  const detail=(p,m,pos,s)=>shape(p,faceGeo,m,pos,s);
  ell(root,fur,[0,0,-.03],[.17,.17,.24]);ell(root,skin,[0,.02,.17],[.13,.13,.21]);
  const spine=joint(root,[0,.02,.42],'dog chest');
  const torso=ell(spine,fur,[0,.005,-.08],[.20,.23,.35]);
  ell(spine,fur,[0,.065,.19],[.145,.205,.16]);
  // Gaunt flank, coarse fur silhouette, old wounds and raised rib contours.
  for(const side of [-1,1]){
    ell(spine,skin,[side*.163,.01,-.18],[.03,.135,.21]);
    for(let i=0;i<4;i++){const rib=ell(spine,fur,[side*.18,-.004,-.27+i*.087],[.025,.142,.014]);rib.rotation.z=side*.14;}
    ell(spine,scar,[side*.17,.07,.125],[.025,.075,.057]);
    for(let i=0;i<4;i++){const tuft=shape(spine,cone,fur,[side*.13,.18,-.24+i*.11],[.034,.075,.05]);tuft.rotation.z=side*-.4;}
  }
  const head=joint(spine,[0,.18,.32],'dog head');
  ell(head,fur,[0,.018,.015],[.135,.148,.18]);ell(head,fur,[0,-.023,.15],[.095,.07,.19]);
  ell(head,skin,[0,-.005,.21],[.081,.055,.10]);ell(head,dark,[0,-.014,.306],[.068,.043,.037]);
  for(const side of [-1,1]){
    const socket=ell(head,dark,[side*(rare?.115:.110),rare?.066:.049,rare?.153:.109],[.039,.026,.021]);socket.rotation.z=side*.27;
    const glow=shape(head,eyeGeo,eye,[side*(rare?.115:.114),rare?.066:.047,rare?.173:.135],[.025,.012,.015]);glow.rotation.z=side*.25;glow.name=rare?'Ashfang red eye':'Red eye';
    if(!rare){const brow=ell(head,fur,[side*.097,.086,.120],[.054,.025,.043]);brow.rotation.z=side*.38;brow.name='Scowling brow';}
    const ear=joint(head,[side*.084,.119,-.048],'dog ear');ear.rotation.z=side*-.24;ear.rotation.x=-.13;
    shape(ear,cone,fur,[0,.064,0],[.064,.18,.069]);shape(ear,cone,scar,[0,.059,.027],[.034,.12,.026]);
    ell(head,scar,[side*.096,-.039,.135],[.025,.04,.064]);
    const lip=detail(head,skin,[side*.064,-.034,.221],[.024,.016,.090]);lip.rotation.z=-side*.15;lip.name='Curled upper lip';
    const fold=detail(head,dark,[side*.080,-.016,.174],[.007,.026,.043]);fold.rotation.z=side*.33;
  }
  for(const z of [.181,.217])detail(head,fur,[0,.042,z],[.069,.009,.013]);
  const jaw=joint(head,[0,-.054,.043],'dog jaw');
  ell(jaw,dark,[0,-.006,.121],[.079,.023,.15]);ell(jaw,fur,[0,-.027,.116],[.078,.03,.16]);
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const upper=shape(head,cone,teeth,[side*(.062-i*.007),i===0?-.077:-.067,i===0?.262:.115+i*.04],[.010,i===0?.068:.030,.012]);upper.rotation.z=Math.PI;
    shape(jaw,cone,teeth,[side*(.059-i*.007),.016,.077+i*.04],[.010,i===0?.048:.025,.011]);
  }
  const collar=own(new T.TorusGeometry(.126,.026,8,24));shape(spine,collar,leather,[0,.15,.25],[1,1,1]).rotation.x=.32;
  ell(spine,metal,[0,.01,.353],[.033,.04,.009]);
  const tail=joint(root,[0,.045,-.21],'dog tail');tail.rotation.x=-.34;
  const tailBase=ell(tail,fur,[0,-.04,-.16],[.053,.057,.20]);tailBase.rotation.x=-.24;
  const tailTip=joint(tail,[0,-.09,-.30],'dog tail tip');ell(tailTip,fur,[0,-.04,-.10],[.032,.04,.13]);
  const legs=[],arms=[],pieces=[{node:root,a:'pelvis',b:'chest',frame:true},{node:spine,a:'pelvis',b:'chest',frame:true},{node:head,a:'chest',b:'skull'}];
  for(const [i,side] of [-1,1].entries()){
    const t=i?'R':'L';
    const rear=joint(root,[side*.14,-.015,-.045],t+' rear hip');
    ell(rear,fur,[0,-.105,.023],[.078,.145,.096]);
    const calf=joint(rear,[0,-.225,.055],t+' rear hock');ell(calf,skin,[0,-.095,-.021],[.036,.11,.042]);
    const foot=joint(calf,[0,-.203,-.045],t+' rear paw');ell(foot,fur,[0,-.033,.05],[.054,.051,.093]);
    for(let c=0;c<3;c++)ell(foot,dark,[(c-1)*.028,-.031,.126],[.009,.009,.022]);
    legs.push({pivot:rear,calf,foot});pieces.push({node:rear,a:t+'hip',b:t+'knee'},{node:calf,a:t+'knee',b:t+'ankle'},{node:foot,a:t+'ankle',b:t+'toe'});
    const front=joint(spine,[side*.155,-.04,.14],t+' foreleg');ell(front,fur,[0,-.10,0],[.056,.135,.07]);
    const forearm=joint(front,[0,-.22,0],t+' front elbow');ell(forearm,skin,[0,-.10,.013],[.032,.126,.035]);
    const hand=joint(forearm,[0,-.21,.02],t+' front paw');ell(hand,fur,[0,-.025,.045],[.058,.051,.089]);
    for(let c=0;c<3;c++)ell(hand,dark,[(c-1)*.03,-.026,.119],[.01,.009,.023]);
    arms.push({pivot:front,forearm,hand});pieces.push({node:front,a:t+'shoulder',b:t+'elbow'},{node:forearm,a:t+'elbow',b:t+'wrist'},{node:hand,a:t+'wrist',b:t+'palm'});
  }
  if(rare){
    const bone=markEnemySurface(material(0xd6cbb4,.72),ENEMY_SURFACE.bone),ember=material(0x8edbe0,.6);ember.emissive.set(0x40bbc7);ember.emissiveIntensity=.6;
    // A pale armored skull and swept horns change the silhouette, rather than
    // relying on a color swap to announce the faster hound.
    ell(head,bone,[0,.063,.048],[.141,.125,.18]).name='Ashfang skull mask';
    ell(head,bone,[0,.023,.224],[.081,.055,.129]).name='Ashfang long muzzle';
    for(const side of [-1,1]){
      const cheek=ell(head,bone,[side*.113,-.005,.141],[.027,.057,.09]);cheek.name='Ashfang cheek plate';
      const horn=shape(head,cone,bone,[side*.117,.164,-.10],[.038,.21,.043]);horn.rotation.x=-.65;horn.rotation.z=-side*.3;horn.name='Ashfang swept horn';
      const brow=ell(head,bone,[side*.097,.100,.154],[.054,.025,.037]);brow.rotation.z=side*.38;brow.name='Ashfang scowling brow';
      ell(spine,bone,[side*.172,.105,.12],[.055,.117,.12]).name='Ashfang shoulder plate';
      for(let i=0;i<3;i++){const rib=ell(spine,bone,[side*.187,-.01,-.23+i*.09],[.026,.15,.018]);rib.rotation.z=side*.17;rib.name='Ashfang exposed rib';}
      shape(jaw,cone,bone,[side*.058,-.008,.26],[.014,.085,.014]).name='Ashfang saber fang';
    }
    for(let i=0;i<6;i++){
      const spike=shape(spine,cone,bone,[0,.235,-.34+i*.106],[.040,.13+(i%2)*.055,.060]);spike.rotation.x=-.5;spike.name='Ashfang dorsal ridge';
      ell(spine,ember,[0,.217,-.33+i*.106],[.035,.013,.034]).name='Ashfang spectral seam';
    }
    const barb=shape(tailTip,cone,bone,[0,-.06,-.23],[.065,.19,.055]);barb.rotation.x=-Math.PI/2;barb.name='Ashfang barbed tail';
  }
  group.scale.setScalar(rare?1.06+rng()*.045:.97+rng()*.06);
  return {group,root,spine,torso,head,jaw,tail,tailTip,legs,arms,pieces,resources,style:rare?'ashfang hound':'zombie dog',dog:true,rareDog:rare,brute:false,phase:rng()*Math.PI*2,stride:.75+rng()*.12,attackTime:-1,flinch:0,flinchDirection:0,legHit:0};
}

export function animateZombieDog(e,dt,distance,moved){
  const moving=clamp(moved/Math.max(dt*e.speed,.0001),0,1);e.motion=T.MathUtils.lerp(e.motion||0,moving,1-Math.exp(-dt*12));e.phase+=moved*7.2/e.stride;e.idle=(e.idle||0)+dt;
  const p=e.phase,w=e.motion;
  e.root.position.set(0,.56+Math.cos(p*2)*(e.rareDog?.042:.024)*w-(e.legHit>0?.045:0),-.28);
  e.root.rotation.set(Math.sin(p)*(e.rareDog?.045:.025)*w,0,Math.sin(p)*.022*w);
  e.spine.rotation.set(Math.sin(p*2)*.025*w,Math.sin(p)*.035*w,0);
  e.head.rotation.set(-.055+Math.sin(e.idle*1.3)*.025,Math.sin(p*.5)*.035,Math.sin(e.idle*.8)*.025);
  e.tail.rotation.y=Math.sin(p*.5)*.1*w;e.tailTip.rotation.y=Math.sin(p*.5-.4)*.11*w;
  e.jaw.rotation.x=(e.rareDog?.17:.14)+Math.sin(e.idle*2.1)*.020;
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
