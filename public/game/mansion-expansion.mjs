import {drawGraveyardMap} from './graveyard.mjs?v=130';
import * as T from './three.module.js';
import {drawStationMarker} from './station-models.mjs?v=129';
import {ESTATE_ROOMS} from './estate-layout.mjs?v=28';
import {CELLAR} from './cellar-layout.mjs?v=28';
import {SHED,SHED_FRONT} from './shed-layout.mjs?v=76';
import {EXTERIOR_STAIRS} from './vertical.mjs?v=116';

export function buildMansionExpansion({scene,world,M,box,mesh,cylinder,sphere,painting,sofa,bookcase,label,station,colliders,furnishings,rugs}){
  const fixtures=[],doors=[];
  const plaster=new Map(ESTATE_ROOMS.map(r=>{const m=M.wall.clone();m.color.setHex(r.tint);return [r.id,m];}));
  const bronze=M.gold, windowMat=new T.MeshStandardMaterial({color:0x728fa3,roughness:.7,emissive:0x35495d,emissiveIntensity:.55});
  const flameMat=new T.MeshBasicMaterial({color:0xffce8c});
  function fixture(x,z,cool=false,lower=false){
    const drop=lower?2.5:0;
    cylinder(x,6.15-drop,z,.026,1.15,bronze);
    box(x,5.55-drop,z,.7,.18,.7,bronze);
    sphere(x,5.34-drop,z,.24,.28,.24,flameMat);
    // The light sits in the globe, so its strength follows the real mounting
    // height: low lamps in the wing rooms no longer glare like ceiling lamps.
    fixtures.push({x,y:5.12-drop,z,floor:0,color:cool?0xa5c8de:0xffc38d});
  }
  const bench=(x,z,rot=0,w=2.6)=>furnishings.bench(x,z,{rotation:rot,w});
  const bed=(x,z,kind='single',rotation=0)=>furnishings.bed(x,z,{kind,rotation});
  const table=(x,z,w=2.4,d=.9)=>furnishings.table(x,z,{w,d});
  const planter=(x,z)=>furnishings.planter(x,z);
  // A single wall owns each boundary; floor edges meet without overlapping.
  function boundary(x,z,length,axis,door,material){
    const horizontal=axis==='x',depth=.48,opening=6;
    const piece=(offset,width,height=6.8,y=height/2,mat=material,thickness=depth)=>box(x+(horizontal?offset:0),y,z+(horizontal?0:offset),horizontal?width:thickness,height,horizontal?thickness:width,mat,world,height>4&&y<4);
    if(door){
      doors.push({x,z,axis,width:opening,height:4.12});
      const wing=(length-opening)/2;
      piece(-(opening+wing)/2,wing);piece((opening+wing)/2,wing);
      piece(0,opening,2.6,5.5);
      for(const side of [-1,1])piece(side*3.08,.17,4.12,2.06,bronze,.62);
      piece(0,6.32,.16,4.2,bronze,.62);
    }else piece(0,length);
    // Door trim projects 7cm beyond both wall faces; jambs stop at the lintel.
    // Baseboards are split at doorways instead of crossing the opening.
    const spans=door?[[-(length+opening)/4,(length-opening)/2],[(length+opening)/4,(length-opening)/2]]:[[0,length]];
    for(const [offset,width] of spans){
      for(const side of [-1,1])box(x+(horizontal?offset:side*.26),.28,z+(horizontal?side*.26:offset),horizontal?width-.10:.06,.35,horizontal?.06:width-.10,M.wood);
    }
  }
  // Internal passages form loops through all twelve sections.
  for(const x of [-14,14])for(const z of [-24,-48,-72])boundary(x,z,24,'z',true,M.wall);
  for(const z of [-12,-36,-60])for(const x of [-28,0,28])if(!(z===-12&&x===0))boundary(x,z,28,'x',true,M.wall);
  for(const x of [-42,42])for(const z of [0,-24,-48,-72])boundary(x,z,24,'z',z===-48,M.wall);
  for(const x of [-28,28])boundary(x,12,28,'x',true,M.wall);
  for(const x of [-28,0,28])boundary(x,-84,28,'x',x===0,M.wall);

  for(const r of ESTATE_ROOMS){
    if(r.id==='original')continue;
    const {x,z}=r, wallMat=plaster.get(r.id);
    const floor=box(x,.02,z,28,.15,24,M.floor);floor.userData.floorSection=r.id;
    if(r.id==='rotunda'||r.id==='observatory'){
      const outline=new T.Shape();outline.moveTo(-14,-12);outline.lineTo(14,-12);outline.lineTo(14,12);outline.lineTo(-14,12);outline.closePath();
      const opening=new T.Path();opening.absarc(0,0,6.2,0,Math.PI*2,true);outline.holes.push(opening);
      const ceiling=mesh(new T.ExtrudeGeometry(outline,{depth:.34,bevelEnabled:false,curveSegments:48}),M.wood,[x,6.84,z]);ceiling.rotation.x=-Math.PI/2;
      const domeMat=windowMat.clone();domeMat.side=T.DoubleSide;
      mesh(new T.SphereGeometry(6.5,32,16,0,Math.PI*2,0,Math.PI/2),domeMat,[x,6.86,z]);
    }else{
      // Recess ceiling end caps inside the walls. At the rear of the upper
      // wings, full-width caps otherwise share the exposed wall-end plane.
      box(x,6.96,z,27.92,.24,23.92,M.wood);
      box(x,7.22,z,27.92,.28,23.92,M.roof);
    }
    // Border panels and ceiling beams define each room without narrowing the routes.
    for(const side of [-1,1]){
      for(const offset of [-8.5,8.5]){
        box(x+offset,1.15,z+side*11.72,10.4,2.1,.08,wallMat);
        box(x+offset,.2,z+side*11.64,10.4,.15,.08,bronze);
        box(x+side*13.72,1.15,z+offset, .08,2.1,5.5,wallMat);
      }
      box(x+side*12.7,6.56,z,.2,.32,23.4,bronze);
      box(x,6.56,z+side*10.8,25.6,.32,.2,bronze);
    }
    for(const xx of [-7,0,7])if(xx!==0||!['rotunda','observatory'].includes(r.id))box(x+xx,6.75,z,.19,.2,22,M.wood);
    // A physical plaque marks the room from both travel directions.
    const signWidth=3.6,signHeight=.62,sign=label(r.name,'#ddc798',1024,{width:signWidth,height:signHeight,kind:'room',maxLines:1});
    // The front wings have a 4.06m ground-floor ceiling. Mount their plaques
    // beside the openings, on solid wall, rather than above the upstairs slab.
    const signX=r.z===0?x-5.35:x,signY=r.z===0?2.85:4.92;
    // The first rear row borders the upper-floor shell too. Its front signs
    // belong below that slab; the gallery plaque uses the strip beside its
    // portrait frames, keeping the artwork and room name separate.
    const lowFront=r.z===-24,frontWidth=lowFront&&r.id==='portraits'?2.4:signWidth;
    const frontX=lowFront?x-(r.id==='portraits'?12:5.35):signX,frontY=lowFront?2.85:signY;
    const front=mesh(new T.PlaneGeometry(frontWidth,signHeight),frontWidth===signWidth?sign:label(r.name,'#ddc798',1024,{width:frontWidth,height:signHeight,kind:'room',maxLines:1}),[frontX,frontY,z+11.69]);front.rotation.y=Math.PI;
    mesh(new T.PlaneGeometry(signWidth,signHeight),sign,[signX,r.id==='chapel'?5.50:signY,z-11.69]);
    for(const xx of [-7,7])for(const zz of [-6,6])fixture(x+xx,z+zz,r.id==='conservatory'||r.id==='observatory',r.z===0);
    rugs.add(x,z,4.8,18);
    // Opaque inset windows avoid transparency sorting and layer interference.
    if(Math.abs(x)===28)for(const zz of [-8,-4,4,8]){
      const side=Math.sign(x),wx=x+side*13.7;
      box(wx,3.65,z+zz,.1,3.1,1.95,M.wood);
      box(wx-side*.065,3.65,z+zz,.025,2.8,1.68,windowMat);
      for(const dz of [-.57,0,.57])box(wx-side*.09,3.65,z+zz+dz,.035,2.84,.045,bronze);
    }
    if(z===0)for(const xx of [-9,-5,5,9]){
      box(x+xx,3.65,12.29,1.9,3.2,.08,M.wood);
      box(x+xx,3.65,12.345,1.65,2.95,.025,windowMat);
      box(x+xx,3.65,12.365,.06,2.97,.02,bronze);
    }
    if(z===-72)for(const xx of [-9,-5,5,9]){
      box(x+xx,3.65,-83.63,1.9,3.2,.08,M.wood);
      box(x+xx,3.65,-83.57,1.65,2.95,.025,windowMat);
    }
    switch(r.id){
      case 'ballroom':
        for(const xx of [-9,9])for(const zz of [-7,7]){cylinder(x+xx,3.4,z+zz,.32,6.8,M.stone);cylinder(x+xx,.28,z+zz,.48,.36,M.stone);colliders.push({x:x+xx,z:z+zz,w:1,d:1});}
        for(const zz of [-8,8]){sofa(x-7,z+zz,zz<0?Math.PI:0);sofa(x+7,z+zz,zz<0?Math.PI:0);}
        // Full frames fit below the 4.06m slab. The outer-wall portrait moves
        // onto solid wall, clear of the paired windows and the room plaque.
        painting(x+7.4,2.25,z-11.65,3.8,3.2);
        painting(x+13.62,2.25,z-6,3.8,3.2,-Math.PI/2);
        break;
      case 'conservatory':
        for(const xx of [-12.6,12.6])for(const zz of [-7,-3.8,3.8,7])planter(x+xx,z+zz);
        bench(x-6,z-8,Math.PI);bench(x+6,z+8);
        break;
      case 'portraits':
        for(const xx of [-9,-5,5,9]){
          painting(x+xx,3.35,z-11.65,2.7,3.5);
          // This wall borders the upstairs wing. Resize the complete frame
          // proportionally, leaving room under the slab and beside its plaque.
          painting(x+xx,2.35,z+11.65,2.16,2.8,Math.PI);
        }
        for(const xx of [-7,7]){bench(x+xx,z-5);bench(x+xx,z+5,Math.PI);}
        break;
      case 'rotunda':
        for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,xx=x+Math.cos(a)*9,zz=z+Math.sin(a)*8;cylinder(xx,3.4,zz,.38,6.8,M.stone);cylinder(xx,.28,zz,.58,.4,M.stone);colliders.push({x:xx,z:zz,w:1.15,d:1.15});}
        break;
      case 'music':
        furnishings.grandPiano(x-8,z-6);furnishings.bench(x-8,z-4.18,{w:1.15,back:false});
        for(const zz of [-7,-3,3,7])furnishings.musicStand(x+8,z+zz);
        break;
      case 'archives':
        for(const xx of [-12.9,12.9])for(const zz of [-8.2,-4.8,4.8,8.2])bookcase(x+xx,z+zz,xx<0?Math.PI/2:-Math.PI/2);
        furnishings.table(x-5,z-7,{w:1.9,d:.85,desk:true});furnishings.chair(x-5,z-5.92);furnishings.table(x+5,z+7,{w:1.9,d:.85,desk:true,rotation:Math.PI});furnishings.chair(x+5,z+5.92,{rotation:Math.PI});break;
      case 'north':
        for(const xx of [-8,8])for(const zz of [-7,7])furnishings.bust(x+xx,z+zz,{rotation:Math.atan2(-xx,-zz)});
        for(const xx of [-8,8])painting(x+xx,3.3,z-11.65,3.4,4);break;
      case 'infirmary':
        for(const xx of [-9,-5,5,9])for(const zz of [-8.8,8.8]){bed(x+xx,z+zz,'hospital',zz<0?0:Math.PI);furnishings.cabinet(x+xx+1.10,z+zz,{w:.54,h:.74,d:.42});}
        break;
      case 'chapel':
        for(const xx of [-8,8])for(const zz of [-7,-3,3,7])bench(x+xx,z+zz,0,4.4);
        table(x,z-9,3.5,1.1);box(x,3.5,z-11.55,.25,3.1,.16,bronze);box(x,4,z-11.55,1.8,.2,.16,bronze);break;
      case 'observatory':
        for(const xx of [-8,8]){furnishings.telescope(x+xx,z-7);table(x+xx,z+8,1.75,.90);furnishings.globe(x+xx,z+8,{y:.875});}break;
      case 'servants':
        for(const xx of [-9,-5,5,9]){bed(x+xx,z-9.4);furnishings.cabinet(x+xx+1.1,z-9.8,{w:.52,h:.74,d:.40});}
        for(const xx of [-8,8]){table(x+xx,z+7,2.5,.95);bench(x+xx,z+8.3,0,2.3);}
        break;
    }
  }
  // Supply points keep the remote wings viable during later waves.
  // Face these exhibits into their rooms, with their backs clear of wall panels.
  // Leave the infirmary's exterior entrance and the chapel's pew aisles open.
  station(-41.22,-24,'GALLERY AMMUNITION','ammo',350,0,Math.PI/2);
  station(41.22,-54,'INFIRMARY AMMUNITION','ammo',350,0,-Math.PI/2);
  station(13.22,-77,'NORTH AMMUNITION','ammo',350,0,-Math.PI/2);
  station(-14.85,-79,'M12 SHOTGUN','shotgun',1200,0,-Math.PI/2);
  // The shared environment light pool selects fixtures across the whole estate.
  return {fixtures,doors};
}

export function drawEstateMap(canvas,player,interactables,lookYaw){
  const c=canvas.getContext('2d'),scale=4.15,ox=canvas.width/2-13*scale,oz=canvas.height-160;
  const px=x=>ox+x*scale,pz=z=>oz+z*scale;
  c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#101b20';c.fillRect(0,0,canvas.width,canvas.height);
  c.strokeStyle='#7a897955';c.lineWidth=2;c.strokeRect(px(-54),pz(-108),108*scale,138*scale);
  for(const r of ESTATE_ROOMS){
    c.fillStyle=r.id==='original'?'#45594c':'#283b40';c.fillRect(px(r.x-14)+2,pz(r.z-12)+2,28*scale-4,24*scale-4);
    c.strokeStyle='#9d9a7866';c.strokeRect(px(r.x-14),pz(r.z-12),28*scale,24*scale);
    c.fillStyle='#eee1bd';c.font='12px Arial';c.textAlign='center';
    const words=r.name.replace('THE ','').split(' ');c.fillText(words.slice(0,words.length>1?-1:1).join(' '),px(r.x),pz(r.z)-7);
    if(words.length>1)c.fillText(words.at(-1),px(r.x),pz(r.z)+10);
  }
  c.strokeStyle='#cdb686';c.lineWidth=5;
  for(const x of [-14,14])for(const z of [0,-24,-48,-72]){c.beginPath();c.moveTo(px(x),pz(z-2.5));c.lineTo(px(x),pz(z+2.5));c.stroke();}
  for(const z of [-12,-36,-60])for(const x of [-28,0,28]){c.beginPath();c.moveTo(px(x-2.5),pz(z));c.lineTo(px(x+2.5),pz(z));c.stroke();}
  drawGraveyardMap(c,px,pz);
  for(const s of EXTERIOR_STAIRS){const l=s.landing;c.fillStyle='#81979b';c.fillRect(px(l.x-l.w/2),pz(l.z-l.d/2),l.w*scale,l.d*scale);c.fillRect(px(s.x-s.w/2),pz(s.topZ),s.w*scale,(s.bottomZ-s.topZ)*scale);c.font='10px Arial';c.textAlign='center';c.fillText('UP',px(s.x),pz(s.bottomZ)+13);}
  const shedOpen=interactables.find(s=>s.type==='shedDoor')?.open;
  c.fillStyle=shedOpen?'#4f6357':'#3c3932';c.fillRect(px(SHED.x-SHED.w/2),pz(SHED.z-SHED.d/2),SHED.w*scale,SHED.d*scale);
  c.strokeStyle=shedOpen?'#82f5df':'#d6b281';c.lineWidth=2;c.strokeRect(px(SHED.x-SHED.w/2),pz(SHED.z-SHED.d/2),SHED.w*scale,SHED.d*scale);
  c.fillStyle=c.strokeStyle;c.font='11px Arial';c.textAlign='center';c.fillText('SHED',px(SHED.x),pz(SHED.z)+7);c.fillText(shedOpen?'OPEN':'WAVE 7',px(SHED.x),pz(SHED_FRONT)+14);
  for(const s of interactables){
    if(s.y>2||s.y<0||s.used||s.locked||s.type==='shedDoor')continue;
    if(s.shedWeapon){const mx=px(s.x),mz=pz(s.z);c.fillStyle='#09151e';c.fillRect(mx-8,mz-7,16,14);c.strokeStyle=s.hex;c.lineWidth=1;c.strokeRect(mx-8,mz-7,16,14);c.fillStyle=s.hex;c.font='bold 9px Arial';c.textAlign='center';c.fillText('M4',mx,mz+3);}
    else drawStationMarker(c,s,px(s.x),pz(s.z));
  }
  c.fillStyle='#8ee0df';c.fillRect(px(CELLAR.x-CELLAR.stairWidth/2),pz(CELLAR.topZ),CELLAR.stairWidth*scale,(CELLAR.bottomZ-CELLAR.topZ)*scale);c.font='11px Arial';c.textAlign='left';c.fillText('STORM CELLAR · WAVE 10',px(CELLAR.x+3),pz(CELLAR.topZ));
  c.save();c.translate(px(player.x),pz(player.z));c.rotate(-lookYaw);c.fillStyle='#82f5df';c.beginPath();c.moveTo(0,-9);c.lineTo(-6,6);c.lineTo(6,6);c.closePath();c.fill();c.restore();
  c.fillStyle='#82f5df';c.textAlign='center';c.font='13px Arial';c.fillText('YOU',px(player.x),pz(player.z)+23);
  c.fillStyle='#bdbbaa';c.font='12px Arial';c.fillText('FRONT COURTYARD',px(0),pz(24));c.fillStyle='#d7c6a4';c.font='16px Arial';c.fillText('GROUND FLOOR · BLACKTHORN ESTATE',canvas.width/2,24);c.font='12px Arial';c.fillText('A AMMO · SG SHOTGUN · SM SMG · F FORGE · NU NUKE · ×2 DAMAGE · ∞ GRENADES',canvas.width/2,canvas.height-18);
}
