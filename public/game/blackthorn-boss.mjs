import * as T from './three.module.js';
import {SARCOPHAGUS} from './graveyard-layout.mjs?v=28';

// Sir Blackthorn (v130): the estate's first lord, woken by The Last Dawn. He
// climbs out of the mausoleum sarcophagus, hurls grave lances from range,
// summons Gravewarden tanks and drives nearby undead into a fury with a war
// cry. Defeating him at the highest unlocked curse rank unlocks the next.
export const BOSS=Object.freeze({
  name:'SIR BLACKTHORN',title:'FIRST LORD OF THE ESTATE',
  scale:1.5,              // a walker rig at brute height (BRUTE.height)
  healthMultiplier:110,   // × the wave's walker health, curse health included
  speed:.82,              // × the wave's walker speed
  enragedSpeed:1.3,
  meleeMultiplier:1.6,    // × the wave's contact damage
  // Waking: the lid slides off, he rises out of the tomb, then steps down.
  wakeDelay:1.4,lidTime:1.2,riseTime:2.4,stepTime:.8,
  rest:{x:SARCOPHAGUS.x,z:SARCOPHAGUS.z},
  front:{x:SARCOPHAGUS.x,z:SARCOPHAGUS.z+SARCOPHAGUS.d/2+.9},
  lance:Object.freeze({minRange:4.5,maxRange:32,windup:.75,cooldown:[3.2,4.8],speed:15,damage:.85,hitRadius:.62,spread:.17,volleyBelow:.5,life:3}),
  summonAt:Object.freeze([.75,.4]),
  cry:Object.freeze({firstDelay:6,cooldown:15,radius:18,duration:10,speed:1.35,damage:1.3,windup:1}),
  enrageBelow:.3,enragedCooldown:.65,
  reward:5000
});
export const WARDEN=Object.freeze({
  name:'GRAVEWARDEN',
  scale:1.1,              // × the brute scale; collision stays brute-sized
  healthMultiplier:4,     // × a brute's health at this wave
  speed:.62,              // × the wave's walker speed (brutes use .77)
  damageMultiplier:1.25,  // × a brute's contact damage
  shieldFactor:.25,       // damage taken through the tower shield
  emergeTime:1.6,emergeDepth:3.2,
  reward:750
});

// ---- Decisions (pure, so they can be tested directly) -----------------------------
export function bossPhase(fraction){return fraction<=BOSS.enrageBelow?'enraged':fraction<=BOSS.lance.volleyBelow?'wounded':'fresh';}
// How many summon thresholds have been crossed beyond those already used.
export function dueSummons(fraction,done){let due=0;for(let i=done;i<BOSS.summonAt.length;i++)if(fraction<=BOSS.summonAt[i])due++;else break;return due;}
export function lanceVolley(fraction){return fraction<=BOSS.lance.volleyBelow?3:1;}
export function cooldownScale(fraction){return fraction<=BOSS.enrageBelow?BOSS.enragedCooldown:1;}
// Distance from point p to the segment a→b (all THREE.Vector3).
const ab=new T.Vector3(),ap=new T.Vector3();
export function segmentDistance(a,b,p){ab.subVectors(b,a);ap.subVectors(p,a);const l=ab.lengthSq();const t=l?Math.min(1,Math.max(0,ap.dot(ab)/l)):0;return ap.addScaledVector(ab,-t).length();}
// Waking timeline: lid → rise → step down.
export function wakeStep(t){
  const lidStart=BOSS.wakeDelay,riseStart=lidStart+BOSS.lidTime,stepStart=riseStart+BOSS.riseTime,end=stepStart+BOSS.stepTime;
  if(t<lidStart)return {stage:'rumble',lid:0};
  if(t<riseStart)return {stage:'lid',lid:(t-lidStart)/BOSS.lidTime};
  if(t<stepStart)return {stage:'rise',lid:1,rise:(t-riseStart)/BOSS.riseTime};
  if(t<end)return {stage:'step',lid:1,step:(t-stepStart)/BOSS.stepTime};
  return {stage:'done',lid:1};
}
export const WAKE_DURATION=BOSS.wakeDelay+BOSS.lidTime+BOSS.riseTime+BOSS.stepTime;

// ---- Armor ---------------------------------------------------------------------------
// Built once and shared by every boss and warden, so nothing needs disposing.
// These materials are not in the rage map, so they keep their colors in fury.
let kit=null;
function armorKit(){
  if(kit)return kit;
  const std=(color,metalness,roughness,extra={})=>new T.MeshStandardMaterial({color,metalness,roughness,...extra});
  kit={
    iron:std(0x6c7377,.55,.5),dark:std(0x1f2427,.7,.55),gold:std(0xa07d3f,.82,.34),
    cloak:std(0x3d1518,0,.94,{side:T.DoubleSide}),stone:std(0x59625f,.15,.86),
    blade:std(0x9aa6a6,.9,.28),soul:new T.MeshBasicMaterial({color:0x8dffd0}),
    box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,16,12),cyl:new T.CylinderGeometry(1,1,1,16),cone:new T.ConeGeometry(1,1,6),
    cloakGeo:(()=>{const g=new T.PlaneGeometry(1,1,6,6),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,-Math.cos(x*Math.PI)*.08*(y+.5));if(y<-.45)p.setY(i,y+Math.sin(x*23)*.04);}g.computeVertexNormals();return g;})()
  };
  return kit;
}
function piece(parent,geo,mat,pos,scale,rot){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.armor=true;parent.add(m);return m;}

// A crowned, cloaked knight with a long sword and a soul-fire hand.
export function dressKnight(rig){
  const k=armorKit(),parts=[];
  const add=(...a)=>{const m=piece(...a);parts.push(m);return m;};
  add(rig.spine,k.box,k.iron,[0,.31,.01],[.47,.32,.31]);                 // breastplate
  add(rig.spine,k.box,k.gold,[0,.155,.012],[.49,.035,.325]);             // gold belt band
  add(rig.spine,k.box,k.gold,[0,.31,.163],[.05,.26,.012]);               // gold ridge
  add(rig.spine,k.box,k.dark,[0,.03,0],[.43,.16,.29]);                   // faulds
  add(rig.spine,k.cloakGeo,k.cloak,[0,.08,-.175],[.58,1.0,1]);          // cloak
  for(const [i,arm] of rig.arms.entries()){
    const s=i?1:-1;
    add(arm.pivot,k.sphere,k.iron,[s*.02,.0,0],[.11,.075,.12]);          // pauldron
    add(arm.pivot,k.box,k.gold,[s*.03,-.06,0],[.2,.02,.21]);
    add(arm.forearm,k.cyl,k.iron,[0,-.15,0],[.062,.2,.062]);             // vambrace
  }
  // Crown of iron spikes with a gold band.
  add(rig.head,k.cyl,k.gold,[0,.135,0],[.125,.05,.125]);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(rig.head,k.cone,k.iron,[Math.sin(a)*.11,.2,Math.cos(a)*.11],[.022,.09,.022]);}
  // Sword in the right hand; the left hand carries the grave lance.
  const sword=rig.arms[1].hand;
  add(sword,k.box,k.blade,[0,-.5,.03],[.045,.78,.012]);
  add(sword,k.box,k.gold,[0,-.08,.03],[.2,.03,.045]);
  add(sword,k.sphere,k.gold,[0,.02,.03],[.03,.03,.03]);
  const orb=new T.Mesh(k.sphere,k.soul);orb.position.set(0,-.08,.04);orb.scale.setScalar(.001);orb.castShadow=false;orb.raycast=()=>{};rig.arms[0].hand.add(orb);
  return {parts,orb};
}

// An iron-clad tank with a heavy helm and a tower shield on its left arm.
export function dressWarden(rig){
  const k=armorKit(),parts=[],shield=[];
  const add=(...a)=>{const m=piece(...a);parts.push(m);return m;};
  add(rig.head,k.cyl,k.dark,[0,.06,0],[.15,.2,.15]);                    // helm
  add(rig.head,k.box,k.soul,[0,.07,.15],[.13,.018,.01]);                 // visor glow
  add(rig.spine,k.box,k.stone,[0,.3,.02],[.5,.36,.33]);                  // stone chest plate
  for(let i=0;i<3;i++)add(rig.spine,k.box,k.iron,[0,.18+i*.1,.18],[.4,.02,.01]);
  for(const [i,arm] of rig.arms.entries()){const s=i?1:-1;add(arm.pivot,k.box,k.iron,[s*.03,0,0],[.22,.12,.24]);}
  const forearm=rig.arms[0].forearm,sh=[[k.box,k.iron,[-.11,-.14,.06],[.06,.78,.5]],[k.box,k.gold,[-.15,-.14,.06],[.012,.7,.06]],[k.box,k.gold,[-.15,-.14,.06],[.012,.06,.42]]];
  for(const [g,m,p,s] of sh)shield.push(add(forearm,g,m,p,s));
  return {parts,shield};
}

// ---- Effects --------------------------------------------------------------------------
export function createBossEffects(world){
  const k=armorKit();
  const glow=new T.MeshBasicMaterial({color:0x6dffc0,transparent:true,opacity:.35,depthWrite:false,blending:T.AdditiveBlending});
  const cryMat=new T.MeshBasicMaterial({color:0xff3a22,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  const summonMat=new T.MeshBasicMaterial({color:0x7dffc4,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  const quiet=o=>{o.castShadow=o.receiveShadow=false;o.raycast=()=>{};o.userData.dynamic=true;o.matrixAutoUpdate=true;return o;};
  const bolts=Array.from({length:8},()=>{
    const g=quiet(new T.Group()),core=quiet(new T.Mesh(k.sphere,k.soul)),halo=quiet(new T.Mesh(k.sphere,glow));
    core.scale.setScalar(.13);halo.scale.setScalar(.3);g.add(core,halo);
    const trail=Array.from({length:5},(_,i)=>{const t=quiet(new T.Mesh(k.sphere,glow));t.scale.setScalar(.2-i*.03);world.add(t);t.visible=false;return t;});
    g.visible=false;world.add(g);return {group:g,trail,pos:new T.Vector3(),prev:new T.Vector3(),vel:new T.Vector3(),life:0,history:[]};
  });
  const ringGeo=new T.RingGeometry(.94,1,64);ringGeo.rotateX(-Math.PI/2);
  const cryRing=quiet(new T.Mesh(ringGeo,cryMat));cryRing.visible=false;world.add(cryRing);
  const summonRings=[0,1].map(()=>{const r=quiet(new T.Mesh(ringGeo,summonMat.clone()));r.visible=false;world.add(r);return {mesh:r,life:0};});
  let cryLife=0;
  function launch(from,dir){
    const bolt=bolts.find(b=>b.life<=0);if(!bolt)return null;
    bolt.pos.copy(from);bolt.prev.copy(from);bolt.vel.copy(dir).normalize().multiplyScalar(BOSS.lance.speed);bolt.life=BOSS.lance.life;bolt.history.length=0;
    bolt.group.visible=true;bolt.group.position.copy(from);return bolt;
  }
  function cry(at){cryRing.position.set(at.x,at.y+.06,at.z);cryLife=.8;cryRing.visible=true;}
  function summon(at){const r=summonRings.find(s=>s.life<=0)||summonRings[0];r.mesh.position.set(at.x,at.y+.05,at.z);r.life=1.6;r.mesh.visible=true;}
  // hit(prev,next) → true when the bolt struck the player; blocked(pos) → wall.
  function update(dt,{hit,blocked}){
    for(const b of bolts){
      if(b.life<=0)continue;
      b.life-=dt;b.prev.copy(b.pos);b.pos.addScaledVector(b.vel,dt);
      b.history.unshift(b.prev.clone());if(b.history.length>b.trail.length)b.history.pop();
      let end=b.life<=0;
      if(!end&&hit(b.prev,b.pos))end=true;
      else if(!end&&blocked(b.pos))end=true;
      b.group.position.copy(b.pos);b.group.children[1].scale.setScalar(.28+Math.sin(b.life*30)*.04);
      for(const [i,t] of b.trail.entries()){const h=b.history[i];t.visible=!end&&!!h;if(h)t.position.copy(h);}
      if(end){b.life=0;b.group.visible=false;for(const t of b.trail)t.visible=false;}
    }
    if(cryLife>0){cryLife=Math.max(0,cryLife-dt);const f=1-cryLife/.8;cryRing.scale.setScalar(.5+f*BOSS.cry.radius);cryMat.opacity=.45*(1-f)*(1-f);cryRing.visible=cryLife>0;}
    for(const r of summonRings){if(r.life<=0)continue;r.life=Math.max(0,r.life-dt);const f=1-r.life/1.6;r.mesh.scale.setScalar(.6+f*1.8);r.mesh.material.opacity=.6*Math.sin(f*Math.PI);r.mesh.rotation.y+=dt*2;r.mesh.visible=r.life>0;}
  }
  function clear(){for(const b of bolts){b.life=0;b.group.visible=false;for(const t of b.trail)t.visible=false;}cryLife=0;cryRing.visible=false;for(const r of summonRings){r.life=0;r.mesh.visible=false;}}
  return {launch,cry,summon,update,clear,get activeBolts(){return bolts.filter(b=>b.life>0);}};
}
