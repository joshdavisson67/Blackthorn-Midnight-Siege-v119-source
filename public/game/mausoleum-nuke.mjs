import * as T from './three.module.js';
import {MAUSOLEUM} from './graveyard-layout.mjs?v=28';

export const MAUSOLEUM_NUKE=Object.freeze({price:20000,x:MAUSOLEUM.x+3.45,z:MAUSOLEUM.frontZ-2.4});

export function createMausoleumNuke({world,colliders,solidMeshes,interactables,label,batchArticulated}){
  const group=new T.Group();group.name='The Last Dawn / mausoleum nuke';group.position.set(MAUSOLEUM_NUKE.x,0,MAUSOLEUM_NUKE.z);group.rotation.y=-Math.PI/2;group.visible=false;world.add(group);
  const fixed=new T.Group();fixed.name='Bomb casing and console';group.add(fixed);
  const mat=(color,metalness=.5,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const m={body:mat(0x526044,.35,.63),steel:mat(0x65747a,.8,.38),iron:mat(0x202c30,.6,.62),yellow:mat(0xdbb646,.45,.46),red:mat(0xc74332,.25,.4),green:mat(0x60dec0,.2,.4)};
  m.red.emissive.setHex(0xff3220);m.red.emissiveIntensity=.6;m.green.emissive.setHex(0x69ffd6);m.green.emissiveIntensity=1.5;
  const geo={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,24),sphere:new T.SphereGeometry(1,20,14)};
  const parts=[];
  function part(kind,x,y,z,w,h,d,material,name){const o=new T.Mesh(geo[kind],material);o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;fixed.add(o);parts.push(o);return o;}
  const b=(x,y,z,w,h,d,material,name)=>part('box',x,y,z,w,h,d,material,name);
  const cy=(x,y,z,r,h,material,name)=>part('cylinder',x,y,z,r,h,r,material,name);
  b(0,.075,0,.58,.15,.62,m.iron,'Anchored bomb stand');b(0,.85,-.26,.075,1.56,.075,m.steel,'Device cradle');
  for(const y of [.92,1.48])b(0,y,-.10,.44,.045,.36,m.steel,'Cradle clamp');
  cy(0,1.30,0,.211,.77,m.body,'Olive atomic casing');part('sphere',0,1.71,0,.212,.25,.212,m.body,'Rounded bomb nose');
  cy(0,.88,0,.14,.19,m.steel,'Tail assembly');
  for(const side of [-1,1]){b(side*.205,.83,0,.14,.30,.035,m.body,'Tail fin');b(0,.83,side*.205,.035,.30,.14,m.body,'Tail fin');}
  for(const y of [1.04,1.51]){
    cy(0,y,0,.218,.065,m.yellow,'Hazard band');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const stripe=b(Math.sin(a)*.22,y,Math.cos(a)*.22,.055,.069,.01,m.iron,'Hazard stripe');stripe.rotation.y=a;}
  }
  const emblem=document.createElement('canvas');emblem.width=emblem.height=256;const c=emblem.getContext('2d');
  c.fillStyle='#e8bd48';c.fillRect(0,0,256,256);c.strokeStyle='#1c282b';c.lineWidth=8;c.beginPath();c.arc(128,128,113,0,Math.PI*2);c.stroke();
  c.fillStyle='#1c282b';for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;c.beginPath();c.arc(128,128,92,a-.5,a+.5);c.arc(128,128,36,a+.5,a-.5,true);c.closePath();c.fill();}c.beginPath();c.arc(128,128,21,0,Math.PI*2);c.fill();
  const radiation=new T.CanvasTexture(emblem);radiation.colorSpace=T.SRGBColorSpace; radiation.anisotropy=8;
  const badge=new T.Mesh(new T.PlaneGeometry(.29,.29),new T.MeshBasicMaterial({map:radiation}));badge.name='Radiation warning emblem';badge.position.set(0,1.27,.226);fixed.add(badge);parts.push(badge);
  b(0,.49,.065,.52,.44,.36,m.iron,'Activation console');b(0,.58,.254,.47,.105,.032,m.steel,'Console screen bezel');
  part('sphere',.16,.41,.264,.057,.057,.031,m.red,'Red activation button');part('sphere',-.16,.41,.264,.031,.031,.022,m.green,'Armed indicator');
  function plate(text,y,z,width,height,color,name){const o=new T.Mesh(new T.PlaneGeometry(width,height),label(text,color,512,{width,height,kind:'title',maxLines:2}));o.name=name;o.position.set(0,y,z);group.add(o);parts.push(o);return o;}
  const armed=plate('ARMED',.58,.273,.43,.08,'#78e4c0','Armed display'),spent=plate('SPENT',.58,.274,.43,.08,'#b07b67','Spent display');spent.visible=false;
  b(0,2.17,.075,.70,.34,.035,m.iron,'Nuke placard backing');for(const side of [-1,1])b(side*.305,1.99,.05,.026,.30,.028,m.steel,'Nuke placard support');
  plate('THE LAST DAWN\n20,000 ESSENCE',2.17,.108,.64,.28,'#e8c57d','Nuke name and price');plate('ONE USE',.305,.266,.46,.07,'#dfc484','One-use warning');
  group.updateMatrixWorld(true);batchArticulated?.(fixed);
  group.traverse(o=>{o.userData.dynamic=true;});
  const renderParts=[];group.traverse(o=>{if(o.isMesh)renderParts.push(o);});
  // Closed-tomb geometry stays out of both rendering and weapon raycasts.
  for(const o of renderParts)o.raycast=function(ray,hits){if(group.visible&&this.visible)T.Mesh.prototype.raycast.call(this,ray,hits);};
  solidMeshes.push(...renderParts);
  const collider={x:MAUSOLEUM_NUKE.x,z:MAUSOLEUM_NUKE.z,w:.74,d:.74,minY:0,maxY:2.36,disabled:true};colliders.push(collider);
  const station={type:'nuke',name:'THE LAST DAWN / NUKE',x:MAUSOLEUM_NUKE.x,z:MAUSOLEUM_NUKE.z,y:0,price:MAUSOLEUM_NUKE.price,hex:'#ffc973',locked:true,used:false};interactables.push(station);
  let pulse=0;
  function unlock(){station.locked=false;group.visible=true;collider.disabled=false;}
  function spend(){if(station.locked||station.used)return false;station.used=true;armed.visible=false;spent.visible=true;m.body.color.setHex(0x303a32);m.red.emissiveIntensity=m.green.emissiveIntensity=0;return true;}
  function update(dt){if(station.locked||station.used)return;pulse+=dt;m.green.emissiveIntensity=1.5+Math.sin(pulse*3)*.25;}
  function reset(){station.locked=true;station.used=false;group.visible=false;collider.disabled=true;armed.visible=true;spent.visible=false;pulse=0;m.body.color.setHex(0x526044);m.red.emissiveIntensity=.6;m.green.emissiveIntensity=1.5;}
  return {group,station,collider,parts:renderParts,details:parts,unlock,spend,update,reset};
}
