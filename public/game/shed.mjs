import * as T from './three.module.js';
import {SHED,SHED_FRONT} from './shed-layout.mjs?v=76';
import {createWeaponModel} from './weapon-models.mjs?v=117';

export function buildShed({world,M,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated}){
  const {x,z,w,d,height,wall,doorWidth,doorHeight}=SHED,front=SHED_FRONT,back=z-d/2;
  const timber=M.wood.clone();timber.name='Weathered shed timber';timber.color.setHex(0x9d9c86);
  const boards=timber.clone();boards.color.setHex(0x797f71);
  const iron=M.dark.clone();iron.color.setHex(0x4f4941);iron.roughness=.84;iron.metalness=.42;
  const roof=M.roof.clone();roof.color.setHex(0x39474b);
  const shell=[];
  function buildingBox(xx,yy,zz,ww,hh,dd,material=timber,collision=false){
    const object=box(xx,yy,zz,ww,hh,dd,material,world,collision);object.userData.shed=true;shell.push(object);return object;
  }
  // Level threshold and a generous clear aisle to the rear weapon rack.
  buildingBox(x,-.08,z,w,.16,d,M.floor);
  buildingBox(x,height/2,back+wall/2,w,height,wall,timber,true);
  buildingBox(x-w/2+wall/2,height/2,z,wall,height,d,timber,true);
  const right=x+w/2-wall/2,windowWidth=1.6,windowBottom=1.2,windowTop=2.5;
  buildingBox(right,windowBottom/2,z,wall,windowBottom,d,timber);
  buildingBox(right,(windowTop+height)/2,z,wall,height-windowTop,d,timber);
  for(const side of [-1,1])buildingBox(right,height/2,z+side*(d+windowWidth)/4,wall,height,(d-windowWidth)/2,timber);
  // The glazed opening admits light but cannot be used to bypass the door.
  colliders.push({x:right,z,w:wall,d,minY:0,maxY:height});
  solidMeshes.push(...shell.slice(-4));
  const pane=new T.MeshStandardMaterial({color:0xa7bbc2,roughness:.22,metalness:.05,transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide});
  const glass=mesh(new T.PlaneGeometry(windowWidth,windowTop-windowBottom),pane,[x+w/2-.1,(windowBottom+windowTop)/2,z]);
  glass.rotation.y=Math.PI/2;glass.castShadow=false;glass.receiveShadow=false;
  for(const side of [-1,1]){
    buildingBox(x+w/2,(windowBottom+windowTop)/2,z+side*(windowWidth/2+.06),.18,windowTop-windowBottom+.2,.12);
    buildingBox(x+w/2,side<0?windowBottom-.06:windowTop+.06,z,.18,.12,windowWidth);
  }
  buildingBox(x+w/2+.025,(windowBottom+windowTop)/2,z,.10,windowTop-windowBottom,.05,iron);
  buildingBox(x+w/2+.025,(windowBottom+windowTop)/2,z,.10,.05,windowWidth,iron);
  // Front wall bays include the parked doors; their fixed bounds never jump
  // into the player's space when the leaves are blown back against the wall.
  const wing=(w-doorWidth)/2;
  for(const side of [-1,1]){
    solidMeshes.push(buildingBox(x+side*(doorWidth/2+wing/2),height/2,front-wall/2,wing,height,wall,timber));
    colliders.push({x:x+side*(doorWidth/2+wing/2),z:front-.025,w:wing,d:.55,minY:0,maxY:height});
  }
  buildingBox(x,(height+doorHeight)/2,front-wall/2,doorWidth,height-doorHeight,wall,timber,true);
  for(const side of [-1,1])for(const end of [back,front])buildingBox(x+side*(w/2-.07),height/2,end,.18,height,.26,iron);
  for(const side of [-1,1])buildingBox(x+side*(doorWidth/2+.065),doorHeight/2,front+.05,.13,doorHeight,.2,iron);
  buildingBox(x,doorHeight+.065,front+.05,doorWidth+.26,.13,.2,iron);
  // Raised battens and separated trim avoid coplanar texture flicker.
  for(let xx=x-w/2+.4;xx<x+w/2;xx+=.55){
    buildingBox(xx,height/2,back-.023,.055,height,.04,boards);
    if(Math.abs(xx-x)>doorWidth/2+.15)buildingBox(xx,height/2,front+.023,.055,height,.04,boards);
  }
  for(let zz=back+.35;zz<front;zz+=.55){
    buildingBox(x-w/2-.023,height/2,zz,.04,height,.055,boards);
    if(Math.abs(zz-z)>windowWidth/2+.15)buildingBox(x+w/2+.023,height/2,zz,.04,height,.055,boards);
  }
  // A sealed, black gable roof with a solid ceiling underneath it.
  buildingBox(x,height-.07,z,w-wall*2,.14,d-wall*2,boards,true);
  const half=w/2+.3,rise=1.1,angle=Math.atan2(rise,half),slope=Math.hypot(half,rise);
  for(const side of [-1,1]){
    const panel=buildingBox(x+side*half/2,height+rise/2,z,slope,.13,d+.6,roof);panel.rotation.z=-side*angle;
    for(const end of [back,front]){
      const trim=buildingBox(x+side*half/2,height+rise/2,end+Math.sign(end-z)*.33,slope,.15,.12,iron);trim.rotation.z=-side*angle;
    }
  }
  buildingBox(x,height+rise+.07,z,.18,.12,d+.68,iron);
  const gable=new T.BufferGeometry();gable.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,0,w/2,0,0,0,rise,0],3));
  gable.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));gable.computeVertexNormals();
  const gableMaterial=boards.clone();gableMaterial.side=T.DoubleSide;
  for(const end of [back,front]){const triangle=mesh(gable,gableMaterial,[x,height,end]);triangle.userData.shed=true;shell.push(triangle);}

  const doors=[];
  for(const side of [-1,1]){
    const hinge=new T.Group();hinge.name='Shed blast door';hinge.position.set(x+side*doorWidth/2,0,front+.035);world.add(hinge);
    const leaf=doorWidth/2-.035,cx=-side*leaf/2;
    box(cx,doorHeight/2,-.11,leaf,doorHeight,.12,timber,hinge);
    if(side<0)box(leaf+.018,doorHeight/2,-.018,.11,doorHeight,.10,iron,hinge);
    for(const dy of [.26,doorHeight-.26])box(cx,dy,-.018,leaf-.08,.15,.09,iron,hinge);
    const brace=box(cx,doorHeight/2,-.018,.14,doorHeight-.65,.09,boards,hinge);brace.rotation.z=side*.36;
    for(const yy of [.5,doorHeight-.5]){box(-side*.20,yy,-.025,.4,.10,.08,iron,hinge);cylinder(0,yy,0,.055,.28,iron,hinge);}
    box(-side*(leaf-.16),1.3,-.015,.045,.26,.09,iron,hinge);
    batchArticulated(hinge);hinge.traverse(o=>{o.userData.dynamic=true;if(o.isMesh)solidMeshes.push(o);});hinge.userData.lightingBlocker=true;
    doors.push({hinge,side});
  }
  const gate={x,z:front-.09,w:doorWidth,d:.34,minY:0,maxY:doorHeight,disabled:false,shedDoor:true};colliders.push(gate);
  const barPieces=[];
  for(const side of [-1,1]){
    const piece=box(x+side*.65,1.55,front+.13,1.28,.15,.14,timber);piece.name='Broken shed locking bar';piece.userData.dynamic=true;
    barPieces.push({piece,side});
  }
  const lock=new T.Group();lock.position.set(x,1.38,front+.24);world.add(lock);
  mesh(new T.TorusGeometry(.095,.025,8,14),iron,[0,.13,0],null,lock);box(0,0,0,.20,.22,.10,iron,lock);
  batchArticulated(lock);lock.traverse(o=>{o.userData.dynamic=true;});
  const sealed=mesh(new T.PlaneGeometry(1.4,.34),label('SEALED · WAVE 7','#d6b281',512,{width:1.4,height:.34,kind:'detail',maxLines:1}),[x,2.38,front+.075]);
  sealed.userData.dynamic=true;
  mesh(new T.PlaneGeometry(2,.34),label('GROUNDSKEEPER’S SHED','#c4c9a9',512,{width:2,height:.34,kind:'detail',maxLines:1}),[x,3.43,front+.16]);

  // Mount the M4 on the existing back-wall rack, with its price on the bench.
  // The window, entrance and central aisle remain clear.
  const benchZ=back+.58;
  buildingBox(x,.87,benchZ,3,.14,.75,timber);
  for(const xx of [x-1.25,x+1.25])for(const zz of [benchZ-.25,benchZ+.25])buildingBox(xx,.41,zz,.10,.82,.10,iron);
  colliders.push({x,z:benchZ,w:3,d:.75,minY:0,maxY:.94,furnishing:true});
  buildingBox(x,1.72,back+.15,3,.92,.12,boards);
  for(const xx of [x-.42,x+.42])buildingBox(xx,1.46,back+.30,.10,.07,.22,iron);
  const rifle=createWeaponModel('rifle');rifle.updateMatrixWorld(true);
  const rifleBounds=new T.Box3().setFromObject(rifle);rifle.position.z=-(rifleBounds.min.z+rifleBounds.max.z)/2;
  const rack=new T.Group();rack.name='Shed M4 weapon display';rack.position.set(x,1.64,back+.51);rack.rotation.y=-Math.PI/2;world.add(rack);rack.add(rifle);
  batchArticulated(rack);rack.updateMatrixWorld(true);
  const displayBounds=new T.Box3().setFromObject(rack);
  rack.traverse(o=>{if(o.isMesh)solidMeshes.push(o);});
  for(const side of [-1,1])buildingBox(x+side*.38,1.06,benchZ+.12,.12,.24,.08,iron);
  buildingBox(x,.54,benchZ+.40,1.30,.44,.06,iron);
  mesh(new T.PlaneGeometry(1.2,.40),label('M4\n4,500 ESSENCE','#e6bf61',512,{width:1.2,height:.40,kind:'detail',maxLines:2}),[x,.54,benchZ+.44]);
  const weapon={type:'rifle',name:'M4 / ASSAULT RIFLE',x,z:benchZ,y:0,price:4500,hex:'#e6bf61',shedWeapon:true,purchased:false,model:rack,displayBounds,get locked(){return !open;}};
  interactables.push(weapon);
  const bulb=buildingBox(x,3.28,z-.8,.12,.14,.12,new T.MeshStandardMaterial({color:0xffd69d,emissive:0xffc170,emissiveIntensity:1.4}));bulb.castShadow=false;
  buildingBox(x,3.47,z-.8,.035,.25,.035,iron);
  const shade=mesh(new T.ConeGeometry(.32,.19,12,1,true),iron,[x,3.37,z-.8]);shade.castShadow=false;
  const fixtures=[{x,y:3.2,z:z-.8,color:0xffc788,intensity:8,distance:10}];
  let open=false,progress=0;
  function update(dt){
    if(!open||progress===1)return;
    progress=Math.min(1,progress+dt/.75);
    const swing=1-(1-progress)**3;
    for(const {hinge,side} of doors){hinge.rotation.y=side*Math.PI*swing;hinge.updateMatrixWorld(true);}
    const fall=Math.min(1,progress*1.15);
    for(const {piece,side} of barPieces){
      piece.position.set(x+side*(.65+fall*.55),.10+(1-fall)*(1.45+fall*1.2),front+.13+fall*.75);
      piece.rotation.set(fall*1.3,side*fall*.45,side*fall*.035);piece.updateMatrixWorld(true);
    }
    lock.position.set(x+.22*fall,.14+(1-fall)*(1.24+fall*.5),front+.24+fall*.7);lock.rotation.set(fall*Math.PI/2,fall*1.8,0);lock.updateMatrixWorld(true);
  }
  function unlock(){if(open)return false;open=true;gate.disabled=true;sealed.visible=false;return true;}
  function reset(){
    open=false;progress=0;gate.disabled=false;sealed.visible=true;weapon.purchased=false;
    for(const {hinge} of doors){hinge.rotation.y=0;hinge.updateMatrixWorld(true);}
    for(const {piece,side} of barPieces){piece.position.set(x+side*.65,1.55,front+.13);piece.rotation.set(0,0,0);piece.updateMatrixWorld(true);}
    lock.position.set(x,1.38,front+.24);lock.rotation.set(0,0,0);lock.updateMatrixWorld(true);
  }
  return {doors,gate,shell,glass,barPieces,lock,sealed,fixtures,weapon,unlock,update,reset,get open(){return open;},get progress(){return progress;}};
}
