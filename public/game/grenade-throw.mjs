import * as T from './three.module.js';

export const GRENADE_THROW={release:.42,duration:.84};

// The held grenade and every projectile share the same warmed model.
export function createGrenadeAssets(batch){
  const template=new T.Group();template.name='Fragmentation grenade';
  const olive=new T.MeshStandardMaterial({color:0x59624a,roughness:.78,metalness:.24});
  const groove=new T.MeshStandardMaterial({color:0x323d2c,roughness:.88,metalness:.15});
  const steel=new T.MeshStandardMaterial({color:0x84908d,roughness:.42,metalness:.72});
  const yellow=new T.MeshStandardMaterial({color:0xc5aa58,roughness:.75,metalness:.12});
  const sphere=new T.SphereGeometry(1,20,14),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,16);
  function part(geo,material,position,scale,name){const m=new T.Mesh(geo,material);m.position.set(...position);if(scale)m.scale.set(...scale);m.name=name;template.add(m);return m;}
  part(sphere,olive,[0,0,0],[.036,.047,.036],'Olive grenade body');
  for(const y of [-.028,-.012,.012,.028]){
    const radius=.036*Math.sqrt(1-(y/.047)**2),ring=part(new T.TorusGeometry(radius,.0017,6,24),groove,[0,y,0],null,'Body groove');ring.rotation.x=Math.PI/2;
  }
  for(let i=0;i<8;i++){
    const rib=part(sphere,groove,[0,0,0],[.0366,.044,.0013],'Vertical body groove');rib.rotation.y=i*Math.PI/4;
  }
  part(cylinder,steel,[0,.054,0],[.013,.023,.013],'Fuse collar');
  part(box,steel,[.009,.07,0],[.045,.008,.017],'Safety lever crown');
  const lever=part(box,steel,[.035,.027,0],[.009,.087,.014],'Safety lever');lever.rotation.z=-.16;
  part(new T.TorusGeometry(.012,.0021,6,24),steel,[-.026,.067,0],null,'Pull ring');
  const band=part(new T.TorusGeometry(.029,.0026,6,24),yellow,[0,.028,0],null,'Identification band');band.rotation.x=Math.PI/2;
  if(batch)batch(template);
  return {template,create:()=>template.clone(true)};
}

// Camera-space key poses: bring up the grenade, draw back, throw, and retract.
const keys=[
  {t:0,w:[.32,-.74,-.34],r:[.10,-.10,.10],lower:0},
  {t:.12,w:[.23,-.18,-.43],r:[-.10,.08,-.12],lower:.80},
  {t:.28,w:[.31,.12,-.36],r:[-.32,.12,.10],lower:1},
  {t:GRENADE_THROW.release,w:[.14,.06,-.57],r:[.12,-.08,-.15],lower:1},
  {t:.57,w:[0,-.13,-.61],r:[.33,-.12,-.42],lower:.87},
  {t:GRENADE_THROW.duration,w:[.30,-.78,-.31],r:[.08,0,.18],lower:0},
];
function sample(time,field,axis){
  let i=0;while(i<keys.length-2&&time>keys[i+1].t)i++;
  const a=keys[i],b=keys[i+1],before=keys[Math.max(0,i-1)],after=keys[Math.min(keys.length-1,i+2)];
  const value=k=>axis===undefined?k[field]:k[field][axis],u=T.MathUtils.clamp((time-a.t)/(b.t-a.t),0,1),u2=u*u,u3=u2*u;
  const av=value(a),bv=value(b),m0=(bv-value(before))/(b.t-before.t),m1=(value(after)-av)/(after.t-a.t),span=b.t-a.t;
  return (2*u3-3*u2+1)*av+(u3-2*u2+u)*span*m0+(-2*u3+3*u2)*bv+(u3-u2)*span*m1;
}

export function createGrenadeThrow(assets,batch){
  const root=new T.Group();root.name='Grenade throwing arm';
  const upper=new T.Group(),forearm=new T.Group(),hand=new T.Group();upper.name='Throwing upper arm';forearm.name='Throwing forearm';hand.name='Throwing hand';root.add(upper,forearm,hand);
  const sleeve=new T.MeshStandardMaterial({color:0x465044,roughness:.94});
  const seam=new T.MeshStandardMaterial({color:0x65705c,roughness:.96});
  const glove=new T.MeshStandardMaterial({color:0x303a32,roughness:.87});
  const pad=new T.MeshStandardMaterial({color:0x171f1c,roughness:.84});
  const ellipsoid=new T.SphereGeometry(1,14,10),box=new T.BoxGeometry(1,1,1);
  function part(parent,geo,mat,pos,scale,name){const m=new T.Mesh(geo,mat);m.name=name;m.position.set(...pos);if(scale)m.scale.set(...scale);parent.add(m);return m;}
  part(upper,new T.CylinderGeometry(.052,.063,1,20),sleeve,[0,0,0],null,'Sleeved upper arm');
  part(forearm,new T.CylinderGeometry(.037,.054,1,20),sleeve,[0,0,0],null,'Tapered sleeve');
  part(forearm,new T.CylinderGeometry(.040,.043,.16,20),pad,[0,.42,0],null,'Glove wrist cuff');
  part(forearm,box,seam,[0,.28,-.047],[.045,.018,.004],'Sleeve seam');
  part(forearm,box,pad,[.048,-.13,0],[.008,.19,.058],'Sleeve reinforcement');
  part(hand,ellipsoid,glove,[0,-.002,-.035],[.043,.027,.061],'Gloved palm');
  part(hand,ellipsoid,pad,[0,.023,-.038],[.037,.008,.048],'Padded glove back');
  const fingers=[],tips=[];
  for(let i=0;i<4;i++){
    const finger=new T.Group(),tip=new T.Group();finger.name='Throwing finger';tip.name='Finger tip joint';finger.position.set((i-1.5)*.018,-.008,-.079);hand.add(finger);tip.position.z=-.028;finger.add(tip);
    part(finger,ellipsoid,glove,[0,0,-.014],[.008,.009,.020],'Finger segment');
    part(tip,ellipsoid,glove,[0,0,-.012],[.0075,.008,.017],'Finger tip');
    part(hand,ellipsoid,pad,[(i-1.5)*.018,.016,-.080],[.010,.008,.012],'Glove knuckle pad');fingers.push(finger);tips.push(tip);
  }
  const thumb=new T.Group();thumb.name='Throwing thumb';thumb.position.set(-.043,-.008,-.043);thumb.rotation.y=-.6;hand.add(thumb);
  part(thumb,ellipsoid,glove,[0,-.011,-.014],[.011,.019,.025],'Thumb grip');
  part(thumb,ellipsoid,glove,[.004,-.027,-.036],[.010,.011,.019],'Thumb tip');
  const held=assets.create();held.name='Held grenade';held.position.set(0,-.052,-.086);held.rotation.z=-.12;hand.add(held);
  if(batch)batch(root);
  root.traverse(o=>{o.layers.set(1);if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;o.renderOrder=0;}});
  const shoulder=new T.Vector3(.38,-.42,-.08),wrist=new T.Vector3(),elbow=new T.Vector3(),direction=new T.Vector3(),bend=new T.Vector3(),axis=new T.Vector3(0,1,0);
  const pole=new T.Vector3(1,-.15,-.15),boneDirection=new T.Vector3(),handAxis=new T.Vector3(0,0,-1),wristRotation=new T.Quaternion(),wristEuler=new T.Euler(),upperLength=.39,foreLength=.38;
  let active=false,time=0,released=false,lower=0;
  function connect(group,from,to){group.position.copy(from).add(to).multiplyScalar(.5);boneDirection.copy(to).sub(from);group.scale.y=boneDirection.length();group.quaternion.setFromUnitVectors(axis,boneDirection.normalize());}
  function pose(seconds){
    wrist.set(sample(seconds,'w',0),sample(seconds,'w',1),sample(seconds,'w',2));direction.copy(wrist).sub(shoulder);
    const distance=T.MathUtils.clamp(direction.length(),.02,upperLength+foreLength-.001);direction.normalize();wrist.copy(shoulder).addScaledVector(direction,distance);
    const along=(upperLength*upperLength-foreLength*foreLength+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
    bend.copy(pole).addScaledVector(direction,-pole.dot(direction)).normalize();elbow.copy(shoulder).addScaledVector(direction,along).addScaledVector(bend,height);
    connect(upper,shoulder,elbow);connect(forearm,elbow,wrist);hand.position.copy(wrist);hand.quaternion.setFromUnitVectors(handAxis,boneDirection);
    wristEuler.set(sample(seconds,'r',0),sample(seconds,'r',1),sample(seconds,'r',2));hand.quaternion.multiply(wristRotation.setFromEuler(wristEuler));
    const open=T.MathUtils.smoothstep(seconds,GRENADE_THROW.release,GRENADE_THROW.release+.10);
    fingers.forEach(f=>f.rotation.x=T.MathUtils.lerp(-.94,.08,open));tips.forEach(f=>f.rotation.x=T.MathUtils.lerp(-1.0,-.06,open));thumb.rotation.z=T.MathUtils.lerp(.14,-.48,open);
    lower=T.MathUtils.clamp(sample(seconds,'lower'),0,1);
  }
  function cancel(){active=false;time=0;released=false;lower=0;root.visible=false;held.visible=true;pose(0);}
  cancel();
  return {root,hand,held,upper,forearm,shoulder,wrist,elbow,upperLength,foreLength,
    get active(){return active;},get time(){return time;},get lower(){return lower;},get released(){return released;},
    begin(){if(active)return false;active=true;time=0;released=false;held.visible=true;pose(0);root.visible=true;return true;},
    update(dt,onRelease){
      if(!active)return;const next=Math.min(GRENADE_THROW.duration,time+Math.max(0,dt));
      if(!released&&next>=GRENADE_THROW.release){
        pose(GRENADE_THROW.release);root.updateWorldMatrix(true,true);const position=held.getWorldPosition(new T.Vector3()),rotation=held.getWorldQuaternion(new T.Quaternion());
        released=true;held.visible=false;onRelease(position,rotation,next-GRENADE_THROW.release);
      }
      time=next;pose(time);if(time>=GRENADE_THROW.duration){active=false;root.visible=false;lower=0;}
    },warm(){held.visible=true;pose(.12);root.visible=true;},cancel};
}
