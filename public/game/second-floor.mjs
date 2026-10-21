import * as T from './three.module.js';
import {drawStationMarker} from './station-models.mjs?v=129';
import {UPPER_Y as Y,UPPER_HEIGHT,UPPER_CEILING,UPPER_TILES,UPPER_ROOMS,STAIR,EXTERIOR_STAIRS,OLIVIA_ATTIC} from './vertical.mjs?v=131';
import {prepareUpperShell,UPPER_SLAB_THICKNESS,UPPER_SLAB_BOTTOM} from './upper-shell.mjs?v=131';
import {buildExteriorStairs} from './exterior-stairs.mjs?v=109';
export function buildSecondFloor({scene,world,M,box,mesh,cylinder,sphere,label,colliders,solidMeshes,interactables,station,furnishings,rugs}){
  const shellReport=prepareUpperShell(world,colliders,solidMeshes);
  const windowOpenings=[],doors=[],banisters=[];
  const group=new T.Group();group.name='Second floor';world.add(group);
  const glass=new T.MeshStandardMaterial({color:0xb5ccd0,transparent:true,opacity:.065,roughness:.14,metalness:.05,depthWrite:false,side:T.DoubleSide});
  const cream=M.wall.clone();cream.color.set(0x9e9583);const blue=M.wall.clone();blue.color.set(0x65747a);
  const fixtures=[];
  function block(x,y,z,w,h,d,m=M.wood,solid=false){const o=box(x,y,z,w,h,d,m,group);if(solid){colliders.push({x,z,w,d,minY:y-h/2,maxY:y+h/2});solidMeshes.push(o);}return o;}
  function floor(t){const o=block(t.x,Y-UPPER_SLAB_THICKNESS/2,t.z,t.w,UPPER_SLAB_THICKNESS,t.d,M.floor);solidMeshes.push(o);o.userData.upperFloor=true;}
  UPPER_TILES.forEach(floor);
  const exteriorStairs=buildExteriorStairs({world,M,box,colliders,solidMeshes,stairs:EXTERIOR_STAIRS,y:Y,slab:UPPER_SLAB_THICKNESS});
  const RAIL_HEIGHT=.72,RAIL_BEAM=.075,POST_HEIGHT=RAIL_HEIGHT-RAIL_BEAM;
  // Correct rise/tread dimensions. A separate continuous walking surface avoids
  // camera bumps while these twenty real steps remain visible and raycastable.
  const run=(STAIR.bottomZ-STAIR.topZ)/STAIR.steps;
  for(let i=0;i<STAIR.steps;i++){
    const top=Y*(i+1)/STAIR.steps,z=STAIR.bottomZ-(i+.5)*run;
    solidMeshes.push(block(STAIR.x,top-.11,z,STAIR.w,.22,run,M.wood));
    block(STAIR.x,top+.003,z+run*.43,STAIR.w,.009,.018,M.gold);
  }
  // A continuous banister and matching sloped collider avoid the old tall,
  // overlapping collision boxes at each tread. Its top is the balcony height.
  const depth=STAIR.bottomZ-STAIR.topZ,midZ=(STAIR.bottomZ+STAIR.topZ)/2,angle=Math.atan2(Y,depth),slope=-Y/depth;
  const stairPostHeight=RAIL_HEIGHT-RAIL_BEAM/Math.cos(angle);
  for(const side of [-1,1]){
    const x=STAIR.x+side*(STAIR.w/2+.045);
    const beam=block(x,Y/2+RAIL_HEIGHT-RAIL_BEAM/(2*Math.cos(angle)),midZ,RAIL_BEAM,RAIL_BEAM,Math.hypot(Y,depth),M.gold);
    beam.rotation.x=angle;banisters.push(beam);
    for(let i=0;i<STAIR.steps;i++){
      const z=STAIR.bottomZ-(i+.5)*run,base=Y*(i+.5)/STAIR.steps;
      cylinder(x,base+stairPostHeight/2,z,.024,stairPostHeight,M.gold,group);
    }
    colliders.push({x,z:midZ,w:.09,d:depth,minY:-.25,maxY:Y+RAIL_HEIGHT,railing:true,slope,baseY:Y/2,topY:Y/2+RAIL_HEIGHT});
  }
  for(const side of [-1,1]){const stringer=block(STAIR.x+side*(STAIR.w/2-.1),Y/2-.17,(STAIR.bottomZ+STAIR.topZ)/2,.16,.20,Math.hypot(Y,STAIR.bottomZ-STAIR.topZ),M.wood);stringer.rotation.x=Math.atan2(Y,STAIR.bottomZ-STAIR.topZ);solidMeshes.push(stringer);}
  // Keep the balcony guarded while letting the existing jump clear its top.
  function rail(x,z,w,d){
    block(x,Y+RAIL_HEIGHT-RAIL_BEAM/2,z,w,RAIL_BEAM,d,M.gold);
    const long=w>d,count=Math.ceil((long?w:d)/.48);
    for(let i=0;i<=count;i++){const off=(i/count-.5)*(long?w:d);cylinder(x+(long?off:0),Y+POST_HEIGHT/2,z+(long?0:off),.021,POST_HEIGHT,M.gold,group);}
    colliders.push({x,z,w,d,minY:Y,maxY:Y+RAIL_HEIGHT,railing:true});
  }
  rail(.3,-9,5.8,.09);rail(.05,9,6.3,.09);rail(3.2,0,.09,18);rail(-3.1,3.4,.09,11.2);rail(-5.6,-5.6,.09,6.8);
  // One consistent shell: 2.90m clear height, real openings and aligned trim.
  const DOOR_HEIGHT=2.34,DOOR_WIDTH=2.8;
  // Exterior faces meet the clipped ground shell on its cut plane. Interior
  // caps stay inside the slab, clear of the visible downstairs ceiling face.
  const WALL_BOTTOM=UPPER_SLAB_BOTTOM,WALL_HEIGHT=UPPER_CEILING-WALL_BOTTOM;
  const BASE_INSET=.03,PARTITION_BOTTOM=UPPER_SLAB_BOTTOM+BASE_INSET;
  function buryExteriorCap(o,axis,outward){
    // Raise only the inward bottom edge of this unit box. The outer face still
    // meets the old wall, while the cap over the floor is buried in the slab.
    const geometry=o.geometry.clone(),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)<0){
      const across=axis==='x'?p.getX(i):p.getZ(i);
      p.setY(i,p.getY(i)+(.5-across*outward)*BASE_INSET/o.scale.y);
    }
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();o.geometry=geometry;return o;
  }
  function wall(x,z,w,d,m=cream,bottom=PARTITION_BOTTOM){
    const height=UPPER_CEILING-bottom;
    const o=block(x,bottom+height/2,z,w,height,d,m,true);
    // Recess the ends of each molding instead of sharing wall end-cap faces.
    const alongX=w>d,trimW=alongX?w-.10:w+.035,trimD=alongX?d+.035:d-.10;
    block(x,Y+.12,z,trimW,.18,trimD,M.wood);
    block(x,UPPER_CEILING-.075,z,alongX?w-.10:w+.045,.10,alongX?d+.045:d-.10,M.trim);
    return o;
  }
  function partition(axis,fixed,a,b,openings,m=cream){
    let cursor=a;const horizontal=axis==='x';
    const segment=(lo,hi)=>{if(hi>lo){const mid=(lo+hi)/2;wall(horizontal?mid:fixed,horizontal?fixed:mid,horizontal?hi-lo:.20,horizontal?.20:hi-lo,m);}};
    for(const {at,width} of openings.map(o=>typeof o==='number'?{at:o,width:DOOR_WIDTH}:o).sort((a,b)=>a.at-b.at)){
      segment(cursor,at-width/2);
      const x=horizontal?at:fixed,z=horizontal?fixed:at,header=UPPER_HEIGHT-DOOR_HEIGHT;
      block(x,Y+DOOR_HEIGHT+header/2,z,horizontal?width:.20,header,horizontal?.20:width,m,true);
      for(const side of [-1,1])block(x+(horizontal?side*width/2:0),Y+DOOR_HEIGHT/2,z+(horizontal?0:side*width/2),horizontal?.10:.28,DOOR_HEIGHT,horizontal?.28:.10,M.wood);
      block(x,Y+DOOR_HEIGHT,z,horizontal?width+.1:.28,.10,horizontal?.28:width+.1,M.wood);
      doors.push({x,z,axis,width,height:DOOR_HEIGHT});cursor=at+width/2;
    }segment(cursor,b);
  }
  for(const side of [-1,1]){
    const left=side<0?-41.76:14.1,right=side<0?-14.1:41.76;
    partition('x',-2,left,right,[side*35,side*21]);
    partition('x',2,left,right,[side*28]);
    wall(side*28,-7,.20,9.8,blue);
    // Rear doors fit entirely on the landing, clear of the stair banisters.
    partition('z',side*5.6,-11.76,11.76,[{at:-10.35,width:2.4},4],blue);
    partition('z',side*14,-11.76,11.76,[0],blue);
  }
  buryExteriorCap(wall(0,-12,84,.48,blue,WALL_BOTTOM),'z',-1);
  // The wall is built around each window; there is no opaque backing panel.
  const SILL=Y+.85,HEAD=UPPER_CEILING-.25,WINDOW_WIDTH=2.4;
  function exterior(axis,fixed,a,b,centers,outward,exit=null){
    const horizontal=axis==='x',thickness=.48;
    const part=(lo,hi,y,h,base=false)=>{if(hi>lo){const o=block(horizontal?(lo+hi)/2:fixed,y,horizontal?fixed:(lo+hi)/2,horizontal?hi-lo:thickness,h,horizontal?thickness:hi-lo,blue,true);if(base)buryExteriorCap(o,horizontal?'z':'x',outward);}};
    let cursor=a;
    for(const at of centers){
      if(exit&&at===0){
        const lo=-exit.doorWidth/2,hi=exit.doorWidth/2,head=Y+exit.doorHeight;
        part(cursor,lo,WALL_BOTTOM+WALL_HEIGHT/2,WALL_HEIGHT,true);
        part(lo,hi,(head+UPPER_CEILING)/2,UPPER_CEILING-head);
        for(const edge of [-1,1])block(fixed,Y+exit.doorHeight/2,edge*exit.doorWidth/2,.58,exit.doorHeight,.07,exteriorStairs.steel);
        block(fixed,head,0,.58,.07,exit.doorWidth+.07,exteriorStairs.steel);
        doors.push({x:fixed,z:0,axis,width:exit.doorWidth,height:exit.doorHeight,exterior:true});cursor=hi;continue;
      }
      const lo=at-WINDOW_WIDTH/2,hi=at+WINDOW_WIDTH/2,x=horizontal?at:fixed,z=horizontal?fixed:at;
      part(cursor,lo,WALL_BOTTOM+WALL_HEIGHT/2,WALL_HEIGHT,true);part(lo,hi,(WALL_BOTTOM+SILL)/2,SILL-WALL_BOTTOM,true);part(lo,hi,(HEAD+UPPER_CEILING)/2,UPPER_CEILING-HEAD);
      for(const edge of [-1,1])block(x+(horizontal?edge*WINDOW_WIDTH/2:0),(SILL+HEAD)/2,z+(horizontal?0:edge*WINDOW_WIDTH/2),horizontal?.10:.55,HEAD-SILL+.12,horizontal?.55:.10,M.wood);
      for(const yy of [SILL,HEAD])block(x,yy,z,horizontal?WINDOW_WIDTH+.16:.62,.10,horizontal?.62:WINDOW_WIDTH+.16,M.wood);
      block(x,(SILL+HEAD)/2,z,horizontal?.045:.08,HEAD-SILL,horizontal?.08:.045,M.gold);
      const pane=mesh(new T.PlaneGeometry(WINDOW_WIDTH-.1,HEAD-SILL-.1),glass,[x,(SILL+HEAD)/2,z],[1,1,1],group);if(!horizontal)pane.rotation.y=Math.PI/2;
      pane.castShadow=false;pane.userData.dynamic=true;pane.name='Clear upstairs window';
      colliders.push({x,z,w:horizontal?WINDOW_WIDTH:thickness,d:horizontal?thickness:WINDOW_WIDTH,minY:SILL,maxY:HEAD});
      windowOpenings.push({x,z,axis,outward,width:WINDOW_WIDTH,sill:SILL,head:HEAD,pane});cursor=hi;
    }part(cursor,b,WALL_BOTTOM+WALL_HEIGHT/2,WALL_HEIGHT,true);
    if(exit){
      for(const [lo,hi] of [[a,-exit.doorWidth/2],[exit.doorWidth/2,b]])block(fixed,Y+.12,(lo+hi)/2,.53,.18,hi-lo-.07,M.wood);
    }else block(horizontal?(a+b)/2:fixed,Y+.12,horizontal?fixed:(a+b)/2,horizontal?b-a-.10:.53,.18,horizontal?.53:b-a-.10,M.wood);
    block(horizontal?(a+b)/2:fixed,UPPER_CEILING-.07,horizontal?fixed:(a+b)/2,horizontal?b-a-.10:.55,.1,horizontal?.55:b-a-.10,M.trim);
  }
  exterior('x',12,-42,42,[-36,-28,-20,-10,0,10,20,28,36],1);
  for(const s of EXTERIOR_STAIRS){
    exterior('z',s.doorX,-11.76,11.76,[-7,0,7],s.side,s);
    // Share the existing stair placard texture rather than allocating another
    // signage sheet. The whole panel stays below the ceiling trim.
    const plaque=mesh(new T.PlaneGeometry(3,.28),label('STAIRS · GROUND FLOOR','#d9c9ab',1024,{width:3,height:.28,kind:'room',maxLines:1}),[s.side*41.70,Y+2.68,0],[1,1,1],group);plaque.rotation.y=-s.side*Math.PI/2;
  }
  // The west wing slabs leave a hatch opening for Olivia's attic stairs (v131).
  function holedSlab(x,y,z,w,h,d,m,hole){
    const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,hx0=hole.x-hole.w/2,hx1=hole.x+hole.w/2,hz0=hole.z-hole.d/2,hz1=hole.z+hole.d/2,parts=[];
    const piece=(a,b,c,e)=>{if(b-a>1e-3&&e-c>1e-3)parts.push(block((a+b)/2,y,(c+e)/2,b-a,h,e-c,m));};
    piece(x0,hx0,z0,z1);piece(hx1,x1,z0,z1);piece(hx0,hx1,z0,hz0);piece(hx0,hx1,hz1,z1);return parts;
  }
  for(const x of [-28,0,28]){
    if(x===-28){for(const c of holedSlab(x,UPPER_CEILING+.12,0,28,.24,24,cream,OLIVIA_ATTIC.hole))solidMeshes.push(c);holedSlab(x,UPPER_CEILING+.40,0,28.35,.30,24.35,M.roof,OLIVIA_ATTIC.hole);continue;}
    const ceiling=block(x,UPPER_CEILING+.12,0,28,.24,24,cream);solidMeshes.push(ceiling);
    if(x!==0)block(x,UPPER_CEILING+.40,0,28.35,.30,24.35,M.roof);
  }
  // A narrow attic fascia seals the gap beneath the raised pitched roof.
  for(const z of [-12,12])block(0,UPPER_CEILING+.38,z,28,.28,.48,M.stone);
  function sign(text,x,z,rotation=0,width=2.4){
    const height=.28,plaque=mesh(new T.PlaneGeometry(width,height),label(text,'#d9c9ab',1024,{width,height,kind:'room',maxLines:1}),[x,Y+2.58,z],[1,1,1],group);plaque.rotation.y=rotation;
  }
  for(const side of [-1,1])sign(side<0?'WEST WING':'EAST WING',side*13.85,0,side<0?Math.PI/2:-Math.PI/2);
  for(const [x,name] of [[-35,'WEST BEDCHAMBER'],[-21,'DRESSING ROOM'],[21,'EAST STUDY'],[35,'NURSERY']])sign(name,x,-1.84);
  sign('FAMILY GALLERY',-28,1.84,Math.PI);sign('RELIQUARY',28,1.84,Math.PI);
  sign('STAIRS · GROUND FLOOR',0,-11.69,0,3.0);
  const bed=(x,z,kind='double')=>furnishings.bed(x,z,{y:Y,kind});
  const table=(x,z,w=1.8,d=.85,rotation=0)=>furnishings.table(x,z,{y:Y,w,d,desk:true,rotation});
  const chair=(x,z,rotation=0)=>furnishings.chair(x,z,{y:Y,rotation});
  const cabinet=(x,z,w=1.8,h=.98)=>furnishings.cabinet(x,z,{y:Y,w,h});
  function frame(x,z,title){block(x,Y+1.55,z,1.65,.85,.08,M.wood);const art=mesh(new T.PlaneGeometry(1.48,.69),label(title,'#c4b195',1024,{width:1.48,height:.69,kind:'memorial',maxLines:2}),[x,Y+1.55,z-.075],[1,1,1],group);art.rotation.y=Math.PI;}
  // Furnish each room for its purpose; leave halls and station approaches open.
  bed(-36,-9.9);cabinet(-38.05,-10.45,.55,.68);cabinet(-24,-11.2,2.1);
  furnishings.cabinet(-15.1,-9.5,{y:Y,w:1.7,h:2.03,rotation:-Math.PI/2});
  table(-20.8,-9.8,1.5,.70);chair(-20.8,-8.75);
  cabinet(-32,10.9,2.0);furnishings.bust(-32,10.9,{y:Y+1.0,pedestal:false,collision:false,rotation:Math.PI});cabinet(-16,9.5,1.8);
  table(20,-10.2,1.8,.82);chair(20,-9.10);cabinet(24,-11.2,2.2);bed(36,-10.0,'single');cabinet(37.35,-10.45,.55,.68);cabinet(31,-11.2,1.5,.72);
  cabinet(32,10.9,1.8);furnishings.globe(32,10.9,{y:Y+1.0});cabinet(16,9.5,1.8);
  for(const x of [-32,-24,24,32])frame(x,11.70,x<0?'BLACKTHORN\nFAMILY':'ESTATE\nRELICS');
  for(const side of [-1,1]){
    cabinet(side*10,-11.25,2.0,.95);furnishings.bookcase(side*13.25,-7,{y:Y,rotation:side<0?Math.PI/2:-Math.PI/2});rugs.add(side*10,3.6,4,7,Y);
  }
  table(-10,8.8,1.8,.78,Math.PI);chair(-10,7.7,Math.PI);
  furnishings.sofa(10,8.6,{y:Y});furnishings.table(10,6.8,{y:Y,w:1.4,d:.65,h:.42});
  for(const x of [-28,28])rugs.add(x,0,25,2.25,Y);
  for(const [x,z] of [[-37,0],[-22,0],[-10,2],[10,2],[22,0],[37,0],[0,-10.5],[0,10.5],[-35,-7],[35,-7],[-21,-7],[21,-7],[-28,7],[28,7]]){
    cylinder(x,UPPER_CEILING-.065,z,.24,.10,M.gold,group);const bulb=sphere(x,UPPER_CEILING-.19,z,.15,.15,.15,M.white,group);bulb.castShadow=false;fixtures.push({x,y:UPPER_CEILING-.3,z,floor:Y});
  }
  // Place supplies along each gallery's solid corridor wall, away from its door.
  // Leave clearance for the ammunition case's rearward-tilted lid.
  for(const x of [-23,23])station(x,2.575,'UPPER AMMUNITION','ammo',350,Y);
  return {group,fixtures,windowOpenings,doors,banisters,exteriorStairs,shellReport,ceiling:UPPER_CEILING};
}

export function drawUpperMap(canvas,player,interactables,yaw){
  const c=canvas.getContext('2d'),scale=7,px=x=>canvas.width/2+x*scale,pz=z=>canvas.height/2+z*scale;
  c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#101b20';c.fillRect(0,0,canvas.width,canvas.height);
  for(const t of UPPER_TILES){c.fillStyle='#3c514e';c.fillRect(px(t.x-t.w/2),pz(t.z-t.d/2),t.w*scale,t.d*scale);c.strokeStyle='#ae987977';c.strokeRect(px(t.x-t.w/2),pz(t.z-t.d/2),t.w*scale,t.d*scale);}
  for(const s of EXTERIOR_STAIRS){const l=s.landing;c.fillStyle='#81979b';c.fillRect(px(l.x-l.w/2),pz(l.z-l.d/2),l.w*scale,l.d*scale);c.fillRect(px(s.x-s.w/2),pz(s.topZ),s.w*scale,(s.bottomZ-s.topZ)*scale);c.strokeStyle='#253d43';for(let i=1;i<s.steps;i+=2){const z=s.topZ+i*(s.bottomZ-s.topZ)/s.steps;c.beginPath();c.moveTo(px(s.x-s.w/2),pz(z));c.lineTo(px(s.x+s.w/2),pz(z));c.stroke();}}
  c.fillStyle='#d6b983';c.fillRect(px(STAIR.x-STAIR.w/2),pz(STAIR.topZ),STAIR.w*scale,(STAIR.bottomZ-STAIR.topZ)*scale);
  c.fillStyle='#ddd6bd';c.textAlign='center';c.font='11px Arial';for(const r of UPPER_ROOMS)c.fillText(r.name,px(r.x),pz(r.z));
  c.fillStyle='#0d191e';c.fillText('OPEN TO GRAND HALL',px(0),pz(0));c.fillStyle='#ffe0a2';c.fillText('STAIRS',px(STAIR.x),pz(-5));
  for(const s of interactables)if(s.y>2&&!s.used&&!s.secret)drawStationMarker(c,s,px(s.x),pz(s.z));
  c.save();c.translate(px(player.x),pz(player.z));c.rotate(-yaw);c.fillStyle='#82f5df';c.beginPath();c.moveTo(0,-9);c.lineTo(-6,6);c.lineTo(6,6);c.closePath();c.fill();c.restore();
  c.fillStyle='#d7c6a4';c.font='18px Arial';c.fillText('SECOND FLOOR · FRONT WINGS',canvas.width/2,80);c.font='13px Arial';c.fillText('A AMMO · AR ARMOR · SG SHOTGUN · SM SMG · BM BUSHMASTER',canvas.width/2,canvas.height-100);c.fillText('N1 / N2 / N3 NANO SHIELD RANKS · B BELLA · ×2 DAMAGE · ∞ GRENADES',canvas.width/2,canvas.height-78);
}
