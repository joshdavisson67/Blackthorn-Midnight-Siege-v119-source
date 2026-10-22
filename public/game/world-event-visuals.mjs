import * as T from './three.module.js';
import {EVENT_RULES} from './world-events.mjs?v=135';
export const EVENT_VISUAL_BUDGET=Object.freeze({markers:3,essence:16,lights:0,textures:0});
export function createWorldEventVisuals(world){
  const root=new T.Group();root.name='Pooled world event effects';root.userData.dynamic=true;world.add(root);
  const slabGeometry=new T.BoxGeometry(1.08,.035,1.72),ringGeometry=new T.RingGeometry(.44,.50,24),coinGeometry=new T.OctahedronGeometry(.19,0);
  const stone=new T.MeshStandardMaterial({color:0x283734,roughness:1}),coinMaterial=new T.MeshStandardMaterial({color:0xf6c45a,emissive:0xb98423,emissiveIntensity:1,roughness:.36,metalness:.45});
  const markers=Array.from({length:EVENT_VISUAL_BUDGET.markers},(_,i)=>{
    const group=new T.Group(),slab=new T.Mesh(slabGeometry,stone),ring=new T.Mesh(ringGeometry,new T.MeshBasicMaterial({color:0xacf4c3,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide}));
    group.name=`Awakening grave ${i+1}`;group.visible=false;slab.position.y=.075;ring.rotation.x=-Math.PI/2;ring.position.y=.13;ring.scale.set(.88,1.45,1);group.add(slab,ring);root.add(group);
    group.traverse(o=>{o.userData.dynamic=true;});return {group,slab,ring,x:0,z:0};
  });
  const coins=Array.from({length:EVENT_VISUAL_BUDGET.essence},(_,i)=>{
    const mesh=new T.Mesh(coinGeometry,coinMaterial);mesh.name='Grave bonus essence';mesh.visible=false;mesh.userData.dynamic=true;root.add(mesh);
    return {mesh,type:'essence',value:EVENT_RULES.graveBonus,y:0,life:0,phase:i*.7,eventPool:true};
  });
  function clearMarkers(){for(const m of markers)m.group.visible=false;}
  return {
    root,markers,coins,geometries:[slabGeometry,ringGeometry,coinGeometry],
    mark(graves){clearMarkers();graves.forEach((grave,i)=>{const m=markers[i];m.x=grave.x;m.z=grave.z;m.group.position.set(m.x,0,m.z);m.group.visible=true;});},
    update(event){
      if(event.id!=='awakening'||(event.phase!=='warning'&&event.phase!=='active')){clearMarkers();return;}
      const warning=event.phase==='warning',fade=warning?1:Math.max(0,1-event.age/6);
      for(let i=0;i<markers.length;i++){
        const m=markers[i];if(!m.group.visible)continue;
        m.group.position.set(m.x+Math.sin(event.age*23+i)*.018*fade,0,m.z+Math.cos(event.age*19+i)*.012*fade);
        m.slab.rotation.z=Math.sin(event.age*21+i)*.016*fade;
        m.ring.material.opacity=fade*(.5+.35*Math.sin(event.age*6+i)**2);
      }
    },
    dropEssence(x,z,y,pickups){
      let coin=coins.find(p=>p.life<=0);
      if(!coin){coin=coins.reduce((a,b)=>a.life<b.life?a:b);const index=pickups.indexOf(coin);if(index>=0)pickups.splice(index,1);}
      coin.y=y;coin.life=30;coin.mesh.position.set(x,y+.8,z);coin.mesh.visible=true;pickups.push(coin);return coin;
    },
    release(coin){coin.life=0;coin.mesh.visible=false;},
    clearMarkers,
    reset(){clearMarkers();for(const coin of coins){coin.life=0;coin.mesh.visible=false;}},
    warm(){
      const saved=markers.map(m=>m.group.visible),coinVisible=coins[0].mesh.visible;
      for(const m of markers)m.group.visible=true;coins[0].mesh.visible=true;
      return ()=>{markers.forEach((m,i)=>m.group.visible=saved[i]);coins[0].mesh.visible=coinVisible;};
    },
  };
}
