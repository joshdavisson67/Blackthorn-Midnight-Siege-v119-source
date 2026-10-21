import * as T from './three.module.js';
import {ESTATE_ROOMS} from './estate-layout.mjs?v=28';

const rotunda=ESTATE_ROOMS.find(room=>room.id==='rotunda');
export const ROTUNDA_BELL=Object.freeze({x:rotunda.x,z:rotunda.z,lipY:3,anchorY:13.32,pullX:1.65,pullZ:.75,handleY:1.30});
export const BELL_BUDGET=Object.freeze({meshes:3,triangles:9000});

// A hollow cast bell, real clapper and reachable rope. Everything is built and
// batched once; no additional textures, lights or frame updates are needed.
export function buildRotundaBell({world,solidMeshes,interactables,batchArticulated}){
  const group=new T.Group();group.name='Great Rotunda hanging bell';group.position.set(ROTUNDA_BELL.x,0,ROTUNDA_BELL.z);world.add(group);
  const bronze=new T.MeshStandardMaterial({color:0xbda16f,roughness:.56,metalness:.74,vertexColors:true});
  const iron=new T.MeshStandardMaterial({color:0x343d40,roughness:.68,metalness:.66});
  const rope=new T.MeshStandardMaterial({color:0x9f8a67,roughness:.95});
  const materials=[bronze,iron,rope],parts=[],solids=[];
  const add=(geometry,material,name,x=0,y=0,z=0,solid=false)=>{
    const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);parts.push(mesh);if(solid)solids.push(mesh);return mesh;
  };
  const box=(x,y,z,w,h,d,material,name)=>add(new T.BoxGeometry(w,h,d),material,name,x,y,z);
  const cylinder=(x,y,z,r,h,material,name)=>add(new T.CylinderGeometry(r,r,h,16),material,name,x,y,z);
  const ring=(x,y,z,r,tube,material,name,segments=32)=>add(new T.TorusGeometry(r,tube,6,segments),material,name,x,y,z);
  const profile=[
    [.17,1.92],[.31,1.82],[.53,1.67],[.67,1.45],[.75,1.18],[.82,.90],
    [.94,.59],[1.12,.25],[1.29,.08],[1.34,.045],[1.36,0],[1.36,-.09],
    [1.26,-.12],[1.19,-.075],[1.18,.03],[1.08,.17],[.93,.48],[.79,.84],
    [.71,1.17],[.63,1.40],[.49,1.63],[.29,1.76],[0,1.77],[0,1.92],[.17,1.92]
  ].reverse().map(([r,y])=>new T.Vector2(r,y));
  const shell=new T.LatheGeometry(profile,48),vertices=shell.attributes.position,colors=[];
  const warm=new T.Color(),patina=new T.Color(0x647a67);
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),angle=Math.atan2(x,z);
    const mottling=Math.sin(angle*7+y*5)*Math.cos(angle*11-y*3),grain=Math.sin(x*47+z*33+y*53);
    warm.setScalar(.88+mottling*.06+grain*.012);
    // Broad, muted oxidation in the shoulders, rather than noisy new maps.
    warm.lerp(patina,Math.max(0,mottling-.20)*.32*(y>.35?1:.3));colors.push(warm.r,warm.g,warm.b);
  }
  shell.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const body=add(shell,bronze,'Hollow bronze bell shell',0,ROTUNDA_BELL.lipY,0,true);
  for(const [y,r,t] of [[.11,1.25,.032],[1.49,.65,.023]]){
    const band=ring(0,ROTUNDA_BELL.lipY+y,0,r,t,bronze,'Raised cast bell band',48);band.rotation.x=Math.PI/2;
  }
  const clapperTop=ROTUNDA_BELL.lipY+1.74,clapperY=ROTUNDA_BELL.lipY+.08;
  cylinder(0,(clapperTop+clapperY)/2,0,.036,clapperTop-clapperY,iron,'Iron clapper stem');
  add(new T.SphereGeometry(.18,16,10),iron,'Round bell clapper',0,clapperY,0,true);
  for(const x of [-.19,.19]){
    const crown=ring(x,ROTUNDA_BELL.lipY+2.02,0,.18,.045,bronze,'Cast suspension crown',20);crown.scale.set(.65,1,1);
  }
  const yokeY=ROTUNDA_BELL.lipY+2.22;
  box(0,yokeY,0,.86,.14,.22,iron,'Bell suspension yoke');
  for(const x of [-.30,.30])cylinder(x,yokeY+.03,0,.045,.20,iron,'Yoke locking bolt');
  const hangerLow=yokeY+.15,hangerHigh=ROTUNDA_BELL.anchorY-.14;
  const linkGeometry=new T.TorusGeometry(.105,.023,4,16),links=28;
  for(let i=0;i<links;i++){
    const link=add(linkGeometry,iron,'Interlocking suspension chain',0,hangerLow+(hangerHigh-hangerLow)*i/(links-1),0);link.scale.y=1.65;if(i%2)link.rotation.y=Math.PI/2;
  }
  // The plate embeds into the apex of the existing 6.5m-radius dome.
  const plate=cylinder(0,ROTUNDA_BELL.anchorY,0,.32,.14,iron,'Dome anchor plate');
  const pullCurve=new T.CatmullRomCurve3([
    new T.Vector3(.41,yokeY+.015,0),new T.Vector3(1.0,4.7,.38),
    new T.Vector3(ROTUNDA_BELL.pullX,3.7,ROTUNDA_BELL.pullZ),
    new T.Vector3(ROTUNDA_BELL.pullX,ROTUNDA_BELL.handleY+.14,ROTUNDA_BELL.pullZ)
  ]);
  add(new T.TubeGeometry(pullCurve,36,.031,6,false),rope,'Bell pull rope');
  const handle=ring(ROTUNDA_BELL.pullX,ROTUNDA_BELL.handleY,ROTUNDA_BELL.pullZ,.11,.027,rope,'Reachable rope loop',20);handle.scale.set(.82,1.12,1);
  cylinder(ROTUNDA_BELL.pullX,ROTUNDA_BELL.handleY+.16,ROTUNDA_BELL.pullZ,.04,.10,rope,'Bound rope knot');
  group.updateWorldMatrix(true,true);
  const bounds=new T.Box3().setFromObject(group),bodyBounds=new T.Box3().setFromObject(body),handleBounds=new T.Box3().setFromObject(handle);
  const triangles=parts.reduce((sum,part)=>sum+(part.geometry.index?.count??part.geometry.attributes.position.count)/3,0);
  batchArticulated(group);group.updateWorldMatrix(true,true);
  // Big metal pieces stop bullets. The slender pull rope remains passable.
  // With the lip/clapper above 2.88m, players (including jumps) and brutes
  // retain the central ground route without a new floor collision obstacle.
  solidMeshes.push(...solids);
  // The bell no longer takes curse choices (v130); ranks are chosen on the title
  // screen. It stays as the rotunda's landmark and tolls when Sir Blackthorn falls.
  const station={type:'bell',name:'GREAT ROTUNDA BELL',x:ROTUNDA_BELL.x+ROTUNDA_BELL.pullX,z:ROTUNDA_BELL.z+ROTUNDA_BELL.pullZ,y:0,price:0,hex:'#cfb37a',used:false};
  return {group,station,bounds,bodyBounds,handleBounds,triangles,materials,solids,plate};
}
