import * as T from './three.module.js';
import {makeOptic} from './graphics.mjs?v=129';
import {GLOCK_GRIP,glockSlideGeometry,glockStippleGeometry,glockGripPoint,glockRearPlateGeometry} from './glock-model-parts.mjs?v=117';
import {weaponSurfaces,weaponSurfaceGeometry} from './weapon-surfaces.mjs?v=87';

// One set of meshes/materials supplies both the first-person guns and exhibits.
// The profiles are visual game assets, with forward along negative Z.
const references={glock:'Glock 21 .45 pistol',rifle:'M4 carbine',shotgun:'Walnut pump shotgun',smg:'MP5-style submachine gun',lmg:'M249-style squad automatic weapon',bushmaster:'AR-15 .450 Bushmaster precision rifle'};
let assets;
function getAssets(){
  if(assets)return assets;
  const mat=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const m={metal:mat(0x47515a,.78,.42),edge:mat(0x68747b,.8,.36),black:mat(0x171e23,.25,.7),polymer:mat(0x303a3d,.08,.8),rubber:mat(0x1d2729,0,.92),wood:mat(0x946647,.02,.64),brass:mat(0xb39558,.7,.37),copper:mat(0x977254,.62,.44),shell:mat(0x873a2b,.1,.66),canvas:mat(0x59624b,0,.95),glove:mat(0x465048,0,.94)};
  m.olive=mat(0x62684d,.12,.72);
  m.canvas.color.setHex(0xffffff);m.canvas.vertexColors=true;
  m.pistolSlide=mat(0x373c3e,.48,.53);m.pistolFrame=mat(0x303436,.03,.9);
  m.sightMark=new T.MeshBasicMaterial({color:0xdce8df});
  const surface=weaponSurfaces();
  for(const material of [m.metal,m.edge,m.pistolSlide,m.brass,m.copper]){material.map=surface.metal;material.roughnessMap=surface.metalFinish;}
  m.wood.color.setHex(0xffffff);m.wood.map=surface.wood;m.wood.roughnessMap=surface.woodFinish;m.wood.bumpMap=surface.woodFinish;m.wood.bumpScale=.00018;
  assets={m,box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,14,10),circle:new T.CircleGeometry(1,16),cylinder:new T.CylinderGeometry(1,1,1,20),cone:new T.ConeGeometry(1,1,12),profiles:new Map(),contours:new Map(),rings:new Map(),tubes:new Map(),openMaterials:new Map()};
  return assets;
}

export function createWeaponModel(type,{hands=false,optic=true}={}){
  if(!references[type])throw new Error('Unknown weapon model: '+type);
  const a=getAssets(),{m}=a,g=new T.Group(),body=new T.Group(),parts=[];
  g.name=references[type];body.name='Weapon body';g.add(body);
  function add(geo,material,x,y,z,scale,name,parent=body){
    const mesh=new T.Mesh(weaponSurfaceGeometry(geo,scale,material.map?.userData.weaponSurface),material);mesh.position.set(x,y,z);if(scale)mesh.scale.set(...scale);
    mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);parts.push(mesh);return mesh;
  }
  const box=(x,y,z,w,h,d,material,name)=>add(a.box,material,x,y,z,[w,h,d],name);
  const ell=(x,y,z,w,h,d,material,name)=>add(a.sphere,material,x,y,z,[w,h,d],name);
  function cylinder(x,y,z,r,length,material,name,axis='z'){
    const o=add(a.cylinder,material,x,y,z,[r,length,r],name);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;
  }
  function ring(x,y,z,r,t,material,name,radial=8,segments=24){
    const key=[r,t,radial,segments].join(':');let geo=a.rings.get(key);if(!geo){geo=new T.TorusGeometry(r,t,radial,segments);a.rings.set(key,geo);}return add(geo,material,x,y,z,null,name);
  }
  function profile(name,outline,width,material,bevel=.003,holes=[]){
    const key=JSON.stringify([name,outline,width,bevel,holes]);let geo=a.profiles.get(key);
    if(!geo){
      const shape=new T.Shape();outline.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
      for(const points of holes){const hole=new T.Path();points.forEach(([z,y],i)=>i?hole.lineTo(-z,y):hole.moveTo(-z,y));hole.closePath();shape.holes.push(hole);}
      geo=new T.ExtrudeGeometry(shape,{depth:width-2*bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:4});geo.translate(0,0,-(width-2*bevel)/2);geo.rotateY(Math.PI/2);geo.computeVertexNormals();a.profiles.set(key,geo);
    }
    return add(geo,material,0,0,0,null,name);
  }
  function tube(z,length,r,material,name,y=0){
    const key=[length,r].join(':');let geo=a.tubes.get(key);if(!geo){geo=new T.CylinderGeometry(r,r,length,24,1,true);geo.rotateX(Math.PI/2);a.tubes.set(key,geo);}
    let openMaterial=a.openMaterials.get(material);if(!openMaterial){openMaterial=material.clone();openMaterial.side=T.DoubleSide;a.openMaterials.set(material,openMaterial);}
    return add(geo,openMaterial,0,y,z,null,name);
  }
  function contour(name,sections,material){
    const key=JSON.stringify([name,sections]);let geo=a.contours.get(key);
    if(!geo){
      const positions=[],uvs=[],indices=[],segments=24,stride=segments+1,start=sections[0][0],length=sections.at(-1)[0]-start;
      for(const [z,y,width,height] of sections)for(let j=0;j<=segments;j++){
        const angle=j*2*Math.PI/segments,c=Math.cos(angle),s=Math.sin(angle);
        positions.push(Math.sign(c)*Math.abs(c)**.7*width/2,y+Math.sign(s)*Math.abs(s)**.7*height/2,z);uvs.push((z-start)/length*2,j/segments);
      }
      for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){
        const p=i*stride+j;indices.push(p,p+1,p+stride,p+1,p+stride+1,p+stride);
      }
      for(const end of [0,sections.length-1]){
        const center=positions.length/3,[z,y]=sections[end];positions.push(0,y,z);uvs.push((z-start)/length*2,.5);
        for(let j=0;j<segments;j++){const p=end*stride+j;end?indices.push(center,p,p+1):indices.push(center,p+1,p);}
      }
      geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
      const normals=geo.attributes.normal;for(let i=0;i<sections.length;i++){
        const first=i*stride,last=first+segments,n=new T.Vector3().fromBufferAttribute(normals,first).add(new T.Vector3().fromBufferAttribute(normals,last)).normalize();normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);
      }
      a.contours.set(key,geo);
    }
    return add(geo,material,0,0,0,null,name);
  }
  function rail(z,length,y=.094,w=.065){
    box(0,y-.012,z,w,.017,length,m.black,'Rail spine');
    const count=Math.floor(length/.024);for(let i=0;i<count;i++)box(0,y,z-length/2+(i+.5)*length/count,w+.008,.012,.012,m.metal,'Picatinny cross slot');
  }
  function pins(zs,y=0,x=.062){for(const z of zs){cylinder(x,y,z,.007,.007,m.edge,'Receiver pin','x');cylinder(-x,y,z,.007,.007,m.black,'Receiver pin','x');}}
  function screw(x,y,z,name='Recessed fastener',axis='x'){
    cylinder(x,y,z,.0045,.003,m.edge,name,axis);
    if(axis==='x')box(x+Math.sign(x)*.0018,y,z,.001,.0015,.006,m.black,'Fastener drive slot');
    else box(x,y+.0018,z,.006,.001,.0015,m.black,'Fastener drive slot');
  }
  function sling(x,y,z,name,lightweight=false){
    cylinder(x-Math.sign(x)*.007,y,z,.0045,.018,m.metal,'Sling mounting stud','x');
    const mount=ring(x,y,z,.011,.0025,m.metal,name,lightweight?4:8,lightweight?12:24);mount.rotation.y=Math.PI/2;return mount;
  }
  function grip(z=.065){
    profile('Contoured pistol grip',[[z-.03,-.048],[z+.045,-.055],[z+.105,-.205],[z+.07,-.224],[z-.015,-.19]],.065,m.polymer,.005);
    for(let i=0;i<5;i++)box(.035,-.085-i*.024,z+.018+i*.009,.003,.004,.045,m.rubber,'Grip checkering');
  }
  function trigger(z=0){
    profile('Open trigger guard',[[z+.073,-.055],[z+.063,-.132],[z-.052,-.132],[z-.075,-.09],[z-.063,-.055]],.026,m.black,.002,[[[z+.058,-.068],[z-.052,-.068],[z-.059,-.086],[z-.042,-.119],[z+.05,-.119]]]);
    const t=box(0,-.083,z+.026,.012,.041,.014,m.edge,'Curved trigger');t.rotation.x=-.30;
  }
  function ejection(z,width=.11,y=.017,x=.063){
    box(x,y,z,.003,.043,width,m.black,'Recessed ejection port');
    box(x+.002,y-.016,z,.004,.011,width*.89,m.edge,'Ejection port lower lip');
    box(x+.003,y+.018,z,.004,.003,width*.9,m.metal,'Ejection port rim');
  }
  function muzzle(z,r=.022,y=0){
    tube(z+.029,.054,r,m.metal,'Open muzzle device',y);ring(0,y,z,r*.96,.0024,m.edge,'Muzzle rim');
    cylinder(0,y,z+.055,r*.68,.004,m.black,'Recessed bore');
    for(const side of [-1,1])for(let i=0;i<3;i++)box(side*(r+.0008),y+.003,z+.014+i*.013,.003,.012,.004,m.black,'Muzzle vent');
    return new T.Vector3(0,y,z-.006);
  }
  let muzzlePoint,forehand,slide=null;

  if(type==='glock'){
    // Gen 5 / MOS styling: bevelled serrated slide, real chamber opening,
    // fitted cover plate and a rounded, stippled grip without finger grooves.
    slide=new T.Group();slide.name='Glock reciprocating slide';body.add(slide);
    const slideStart=parts.length;
    add(glockSlideGeometry(),m.pistolSlide,0,0,0,null,'Glock 21 steel slide');
    box(0,.075,.1575,.057,.0054,.053,m.black,'Recessed MOS cover plate');
    for(const z of [.143,.172]){
      cylinder(0,.0781,z,.0047,.0012,m.edge,'MOS cover screw','y');
      box(0,.0789,z,.006,.0003,.001,m.black,'MOS screw drive slot');
      box(0,.0789,z,.001,.0003,.006,m.black,'MOS screw drive slot');
    }
    add(glockRearPlateGeometry(),m.black,0,0,.24415,null,'Slide rear cover plate');
    for(let i=0;i<6;i++)box(0,.026+i*.0036,.2446,.039,.001,.0005,m.pistolSlide,'Backplate grip ridge');
    box(0,.021,.2448,.010,.004,.0006,m.black,'Backplate lower recess');
    // Caliber stamp uses tiny cached strokes rather than a new decal texture.
    const glyphs={2:[[0,1,1,1],[1,1,1,.5],[1,.5,0,.5],[0,.5,0,0],[0,0,1,0]],1:[[.2,.8,.55,1],[.55,1,.55,0],[.2,0,.9,0]],4:[[0,1,0,.5],[0,.5,1,.5],[.7,1,.7,0]],5:[[1,1,0,1],[0,1,0,.5],[0,.5,1,.5],[1,.5,1,0],[1,0,0,0]],'.':[[.4,0,.6,0]]};
    for(const [i,char] of [...'21 .45'].entries())for(const [u,v,uu,vv] of glyphs[char]||[]){
      const z=.039+i*.009+u*.0055,zz=.039+i*.009+uu*.0055,y=.026+v*.008,yy=.026+vv*.008,l=Math.hypot(zz-z,yy-y),r=.00022;
      const dz=-(yy-y)/l*r,dy=(zz-z)/l*r;
      const stamp=profile('Caliber stamp',[[z+dz,y+dy],[z-dz,y-dy],[zz-dz,yy-dy],[zz+dz,yy+dy]],.0004,m.black,0);stamp.position.x=-.0403;
    }
    // Factory U-notch and front dot stay seated and ride with the slide.
    box(0,.083,.199,.068,.012,.022,m.black,'Rear iron sight base');
    for(const side of [-1,1]){
      box(side*.017,.0915,.199,.022,.013,.022,m.black,'Rear iron sight wing');
      box(side*.010,.0915,.211,.002,.009,.001,m.sightMark,'Rear white sight marking');
    }
    box(0,.0868,.211,.022,.0015,.001,m.sightMark,'Rear white U-notch base');
    box(0,.0825,-.032,.014,.010,.022,m.black,'Front sight base');
    box(0,.0895,-.032,.009,.012,.018,m.black,'Front iron sight blade');
    add(a.circle,m.sightMark,0,.0915,-.022,[.0025,.0025,1],'Front white sight dot');
    box(.0405,.0455,.119,.004,.010,.027,m.pistolSlide,'Extractor claw');
    cylinder(.0428,.044,.133,.003,.0015,m.black,'Extractor pivot','x');
    for(const part of parts.slice(slideStart))slide.add(part);

    profile('Moulded Glock polymer frame',[[-.050,.004],[-.050,-.032],[-.022,-.049],[.042,-.059],[.106,-.039],[.190,-.036],[.242,-.053],[.256,-.020],[.233,.007],[-.048,.007]],.081,m.pistolFrame,.003);
    const grip=contour('Glock double-stack grip',GLOCK_GRIP,m.pistolFrame);grip.rotation.x=Math.PI/2;
    profile('Squared open pistol trigger guard',[[.128,-.051],[.127,-.108],[.094,-.120],[.026,-.111],[.018,-.081],[.035,-.051]],.031,m.pistolFrame,.003,[[[.113,-.062],[.041,-.062],[.032,-.082],[.041,-.099],[.093,-.107],[.115,-.099]]]);
    box(0,-.082,.098,.012,.035,.014,m.black,'Pistol trigger').rotation.x=-.24;
    box(0,-.0838,.0907,.004,.026,.004,m.edge,'Trigger safety blade').rotation.x=-.24;
    for(const angle of [0,Math.PI,-Math.PI/2,Math.PI/2])add(glockStippleGeometry(angle),m.rubber,0,0,0,null,'Grip stippling panel');
    for(const side of [-1,1]){
      box(side*.042,-.027,.106,.006,.014,.017,m.black,'Takedown tab');
      for(let i=0;i<3;i++)box(side*.046,-.030+i*.003,.106,.001,.001,.013,m.pistolFrame,'Takedown traction groove');
      cylinder(side*.042,-.038,.129,.005,.002,m.black,'Glock frame pin','x');
      cylinder(side*.042,-.057,.187,.0035,.002,m.black,'Trigger housing pin','x');
      box(side*.043,-.027,.165,.003,.011,.026,m.edge,'Ambidextrous slide release');
      for(let i=0;i<3;i++)box(side*.045,-.026,.157+i*.006,.001,.006,.002,m.black,'Slide release traction groove');
    }
    box(-.043,-.065,.137,.005,.019,.027,m.black,'Magazine release');
    for(let i=0;i<5;i++)box(-.046,-.065,.128+i*.004,.001,.015,.001,m.pistolFrame,'Magazine-release grip ridge');
    box(0,-.036,-.016,.074,.012,.063,m.pistolFrame,'Accessory rail underside');
    for(const z of [-.023,.005])box(0,-.043,z,.076,.003,.008,m.black,'Glock accessory rail slot');
    const socket=glockGripPoint(-.183,Math.PI/2,.0006);
    add(a.circle,m.black,...socket,[.004,.004,1],'Lanyard socket recess').rotation.x=-.26;
    box(0,-.200,.231,.089,.018,.115,m.black,'Flush 13-round magazine floorplate');
    box(0,-.205,.286,.068,.006,.006,m.rubber,'Magazine heel lip');
    // The chamber and barrel remain on the frame while the slide cycles.
    box(.006,.054,.070,.045,.020,.067,m.edge,'Exposed chamber hood');
    box(.006,.0645,.070,.035,.001,.048,m.pistolSlide,'Chamber caliber marking');
    tube(-.035,.048,.014,m.edge,'Pistol barrel',.035);ring(0,.035,-.055,.013,.0015,m.metal,'Pistol bore rim',5,20);
    cylinder(0,.035,-.041,.010,.002,m.black,'Recessed .45 bore');
    cylinder(0,.015,-.051,.0038,.002,m.black,'Recoil spring recess');
    muzzlePoint=new T.Vector3(0,.035,-.060);forehand=.045;
  }else if(type==='rifle'||type==='bushmaster'){
    const heavy=type==='bushmaster',furniture=heavy?m.olive:m.polymer;
    profile('Forged M4 upper receiver',[[-.235,-.033],[-.22,.059],[.115,.059],[.14,.027],[.14,-.029]],.118,m.metal,.004);
    profile('M4 lower and magazine well',[[-.23,-.028],[-.07,-.028],[-.055,-.054],[.13,-.054],[.125,-.07],[.045,-.07],[.018,-.112],[-.155,-.112],[-.16,-.088],[-.235,-.076]],.095,m.metal);
    grip(.062);trigger(.012);pins([-.18,.07],-.035);
    cylinder(0,.008,.19,.025,.16,m.metal,'Buffer tube');
    profile('Adjustable carbine stock',[[.14,.028],[.31,.028],[.365,-.019],[.37,-.18],[.332,-.18],[.276,-.13],[.204,-.108],[.174,-.025]],.083,furniture,.005,[[[.21,-.041],[.292,-.05],[.324,-.11],[.274,-.09],[.224,-.075]]]);
    box(0,-.08,.375,.09,.204,.019,m.rubber,'Textured buttpad');box(0,-.087,.204,.039,.03,.105,m.black,'Stock adjustment latch');
    for(let i=0;i<6;i++)box(0,-.163+i*.031,.386,.074,.005,.003,m.black,'Buttpad traction groove');
    for(const side of [-1,1]){
      screw(side*.043,-.092,.319,'Stock cheekpiece fastener');sling(side*.047,-.121,.315,'Stock sling socket');
      box(side*.046,-.017,.285,.001,.024,.074,m.rubber,'Moulded stock recess');
    }
    ejection(-.042,.10,.021,.061);box(.071,.026,.03,.019,.039,.031,m.metal,'Brass deflector');
    cylinder(.069,.018,.085,.015,.034,m.edge,'Forward assist','x');
    box(0,.067,.122,.12,.012,.017,m.black,'Charging handle');
    rail(-.057,.35,.077);
    const guardZ=heavy?-.402:-.378,guardLength=heavy?.30:.25,start=guardZ-guardLength/2,end=guardZ+guardLength/2;
    cylinder(0,0,guardZ,.015,guardLength+.04,m.metal,'Barrel visible through handguard');
    box(0,.051,guardZ,.103,.011,guardLength,m.black,'Handguard upper spine');
    box(0,-.051,guardZ,.103,.010,guardLength,m.black,'Handguard lower spine');
    rail(guardZ,heavy?.30:.255,.077,.063);
    for(const side of [-1,1]){
      const slots=[];
      for(const yy of [-.034,.034])for(let i=0;i<6;i++){
        const z=start+.025+i*(guardLength-.050)/6;
        slots.push([[z,yy-.006],[z+.023,yy-.006],[z+.023,yy+.006],[z,yy+.006]]);
      }
      const panel=profile('Vented handguard side panel',[[start,-.041],[start+.010,-.051],[end-.010,-.051],[end,-.041],[end,.041],[end-.010,.051],[start+.010,.051],[start,.041]],.006,m.metal,.0008,slots);panel.position.x=side*.053;
      box(side*.057,-.006,guardZ,.007,.034,guardLength-.035,furniture,'Rail cover');
      for(let i=0;i<8;i++)box(side*.062,-.006,start+.028+i*(guardLength-.056)/7,.004,.030,.005,m.rubber,'Handguard grip rib');
      screw(side*.058,.005,end-.014,'Handguard retaining screw');
    }
    for(const z of [start+.004,end-.004])ring(0,0,z,.050,.005,m.black,'Open handguard end collar');
    cylinder(0,0,heavy?-.63:-.574,heavy?.021:.015,heavy?.23:.175,m.metal,heavy?'Heavy .450 barrel':'Stepped carbine barrel');cylinder(0,0,heavy?-.551:-.503,.025,.034,m.black,'Barrel collar');
    if(!heavy){
      profile('Front sight tower',[[-.56,.013],[-.548,.14],[-.532,.148],[-.513,.013]],.017,m.metal,.002,[[[-.544,.042],[-.522,.042],[-.535,.114]]]);
      box(0,.143,-.539,.008,.014,.008,m.black,'Front sight post');
      cylinder(0,.043,-.397,.005,.27,m.edge,'Gas return tube');
      for(const side of [-1,1])box(side*.013,.141,-.539,.006,.023,.013,m.metal,'Front sight protective ear');
    }else{
      cylinder(0,.018,-.553,.025,.035,m.black,'Low-profile gas block');
      cylinder(0,.039,-.394,.005,.30,m.edge,'Precision gas return tube');
    }
    muzzlePoint=muzzle(heavy?-.80:-.70,heavy?.029:.022);forehand=heavy?-.42:-.39;
    if(heavy){
      profile('Straight 15-round .450 magazine',[[-.20,-.08],[-.094,-.08],[-.098,-.30],[-.21,-.30],[-.207,-.18]],.073,m.olive,.004);
      for(const side of [-1,1])for(let i=0;i<3;i++)box(side*.038,-.203,-.123-i*.027,.003,.158,.008,m.black,'Straight magazine channel');
      box(0,-.303,-.154,.081,.021,.124,m.black,'Heavy magazine floorplate');
      cylinder(.062,-.036,.058,.012,.007,m.brass,'Semi-auto selector marking','x');
    }else{
    profile('Curved STANAG magazine',[[-.195,-.08],[-.096,-.08],[-.106,-.18],[-.147,-.30],[-.182,-.341],[-.277,-.307],[-.222,-.183]],.069,m.edge,.004);
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const line=box(side*.036,-.223,-.158-i*.023,.003,.166,.004,m.metal,'Magazine pressed channel');line.rotation.x=-.27;
    }
    box(0,-.326,-.225,.076,.017,.10,m.black,'Magazine floorplate').rotation.x=-.32;
    }
    box(-.051,-.014,.055,.005,.027,.011,m.black,'Selector lever').rotation.x=.3;
    box(-.053,-.005,-.065,.007,.029,.026,m.edge,'Bolt catch paddle');
    box(-.053,-.031,-.059,.007,.009,.036,m.black,'Bolt catch linkage');
    box(.051,-.051,-.108,.007,.020,.034,m.black,'Magazine release fence');
    box(.056,-.051,-.106,.004,.011,.020,m.edge,'Magazine release button');
    for(const side of [-1,1])box(side*.060,-.025,-.046,.002,.003,.269,m.black,'Upper and lower receiver seam');
    sling(-.061,-.032,start+.020,'Front handguard sling socket');
  }else if(type==='shotgun'){
    profile('Rounded pump shotgun receiver',[[-.222,-.066],[-.222,.045],[-.187,.068],[.081,.068],[.13,.037],[.116,-.058],[.045,-.073]],.11,m.metal,.006);
    contour('Walnut shoulder stock',[[.095,-.006,.066,.062],[.13,-.027,.071,.12],[.17,-.063,.074,.156],[.203,-.088,.071,.162],[.24,-.066,.077,.138],[.28,-.062,.087,.156],[.36,-.066,.097,.188],[.42,-.089,.10,.236],[.444,-.092,.098,.22]],m.wood);
    box(0,-.093,.451,.098,.228,.021,m.rubber,'Stock recoil pad').rotation.x=-.11;trigger(.047);
    for(let i=0;i<7;i++)box(0,-.178+i*.028,.464,.076,.004,.003,m.black,'Recoil pad traction groove');
    for(const side of [-1,1]){
      const panel=profile('Walnut grip checkering inset',[[.135,-.040],[.177,-.068],[.199,-.124],[.170,-.125],[.143,-.097]],.001,m.black,.0003);panel.position.x=side*.037;
      for(let i=0;i<6;i++)box(side*.039,-.066-i*.008,.164+i*.003,.001,.003,.019,m.wood,'Fine stock checkering');
    }
    ejection(-.083,.133,.001,.057);pins([-.142,.029],-.03,.058);
    cylinder(0,.026,-.513,.021,.565,m.metal,'Shotgun barrel');
    cylinder(0,-.038,-.491,.024,.53,m.black,'Tubular magazine');
    cylinder(0,-.038,-.763,.029,.028,m.edge,'Magazine cap');
    contour('Ribbed pump',[[-.579,-.055,.077,.077],[-.563,-.055,.097,.101],[-.543,-.055,.108,.119],[-.33,-.055,.108,.119],[-.309,-.055,.097,.101],[-.296,-.055,.077,.077]],m.wood);
    for(let i=0;i<10;i++){
      const r=ring(0,-.05,-.55+i*.023,.056,.0025,m.black,'Pump groove');r.scale.y=.94;
    }
    for(const side of [-1,1])box(side*.042,-.052,-.258,.01,.012,.19,m.edge,'Pump action bar');
    box(0,.07,-.595,.01,.006,.41,m.metal,'Barrel sight rib');
    for(const z of [-.405,-.525,-.65,-.76])box(0,.055,z,.009,.026,.008,m.metal,'Vented rib support');
    ell(0,.077,-.785,.003,.004,.003,m.brass,'Front brass bead');
    box(0,-.075,-.047,.070,.002,.105,m.black,'Recessed loading port');
    box(0,-.077,-.043,.051,.002,.078,m.edge,'Cartridge elevator');
    cylinder(-.063,-.071,.045,.006,.012,m.edge,'Pump action release','x');
    box(0,.071,.088,.014,.006,.015,m.black,'Tang safety');
    for(const [yy,r] of [[.026,.024],[-.038,.027]])ring(0,yy,-.689,r,.003,m.metal,'Barrel and magazine clamp');
    box(0,-.004,-.689,.020,.037,.007,m.metal,'Barrel clamp bridge');
    sling(-.026,-.052,-.760,'Magazine cap sling swivel');sling(-.047,-.145,.366,'Stock sling swivel');
    box(-.064,-.002,-.088,.022,.081,.23,m.black,'Shell carrier');
    for(let i=0;i<5;i++){
      cylinder(-.079,0,-.188+i*.047,.017,.072,m.shell,'Shell side saddle','y');
      cylinder(-.079,-.039,-.188+i*.047,.018,.008,m.brass,'Shot shell base','y');
      box(-.098,0,-.188+i*.047,.010,.018,.028,m.metal,'Shell carrier retaining clip');
    }
    muzzlePoint=muzzle(-.81,.022,.026);forehand=-.427;
  }else if(type==='smg'){
    cylinder(0,.014,-.102,.049,.30,m.metal,'Stamped tubular receiver');
    profile('MP5 trigger housing',[[-.17,-.011],[.105,-.011],[.117,-.074],[.042,-.077],[.014,-.10],[-.148,-.104]],.088,m.polymer,.004);
    grip(.052);trigger(.002);pins([-.136,.087],-.055,.047);
    cylinder(0,.04,-.348,.022,.225,m.metal,'Cocking tube');
    box(-.042,.041,-.363,.009,.014,.073,m.black,'Charging handle slot');
    cylinder(-.054,.036,-.351,.01,.046,m.edge,'MP5 charging handle','x');
    profile('Tapered polymer forearm',[[-.445,.013],[-.232,.014],[-.231,-.073],[-.264,-.11],[-.421,-.09],[-.451,-.055]],.094,m.polymer,.006);
    for(const side of [-1,1])for(let i=0;i<7;i++)box(side*.049,-.06,-.415+i*.024,.004,.05,.005,m.rubber,'Forearm grip rib');
    ejection(-.025,.075,.018,.052);
    box(-.049,-.021,.079,.008,.029,.010,m.edge,'MP5 selector lever').rotation.x=-.43;
    cylinder(0,-.109,-.091,.007,.063,m.metal,'Ambidextrous paddle magazine release','x');
    box(0,-.124,-.077,.018,.018,.027,m.black,'Magazine release paddle');
    for(const side of [-1,1]){
      box(side*.046,-.010,-.106,.002,.003,.244,m.black,'Stamped receiver seam');
      screw(side*.047,-.040,.094,'Trigger pack retaining pin');
      screw(side*.048,-.044,-.421,'Forearm retaining pin');
    }
    for(const side of [-1,1])cylinder(side*.047,-.004,.194,.01,.231,m.metal,'Retractable stock rail');
    profile('Retractable stock butt',[[.282,.024],[.322,.024],[.337,-.139],[.306,-.156],[.287,-.119]],.093,m.polymer,.005);
    box(0,-.062,.34,.1,.18,.017,m.rubber,'Curved stock pad');
    for(let i=0;i<5;i++)box(0,-.121+i*.030,.350,.074,.004,.003,m.black,'SMG buttpad groove');
    cylinder(0,-.009,.071,.051,.010,m.black,'Stock locking collar');sling(-.052,-.047,.305,'SMG stock sling loop');
    profile('Extended magazine',[[-.16,-.077],[-.097,-.077],[-.095,-.159],[-.122,-.249],[-.163,-.314],[-.231,-.298],[-.176,-.20]],.047,m.black,.004);
    for(const side of [-1,1])for(let i=0;i<3;i++)cylinder(side*.024,-.151-i*.047,-.139-i*.017,.003,.002,m.edge,'Magazine witness hole','x');
    box(0,-.302,-.191,.057,.016,.068,m.metal,'Curved SMG magazine floorplate').rotation.x=-.38;
    cylinder(0,.008,-.469,.016,.075,m.metal,'Tri-lug barrel');for(let i=0;i<3;i++)box(Math.sin(i*2*Math.PI/3)*.022,.008+Math.cos(i*2*Math.PI/3)*.022,-.486,.012,.011,.012,m.edge,'Barrel lug');
    ring(0,.083,-.451,.023,.003,m.metal,'Front sight hood');box(0,.047,-.451,.012,.048,.025,m.black,'Front sight base');
    box(0,.072,-.451,.005,.023,.008,m.black,'Hooded front sight post');
    cylinder(0,.074,.025,.017,.022,m.black,'Rear diopter drum');box(0,.060,.025,.045,.012,.045,m.metal,'Diopter sight saddle');
    add(a.circle,m.rubber,0,.079,.0425,[.004,.004,1],'Diopter rear aperture');
    rail(-.066,.148,.084,.053);muzzlePoint=muzzle(-.536,.021,.008);forehand=-.337;
  }else{
    // Reference-inspired squad LMG: stamped receiver, belt tray, ventilated
    // shroud, soft ammunition pouch and collapsing stock. Static parts share
    // the existing finish maps and are batched by material in the view model.
    const oval=(z,y,rz,ry)=>Array.from({length:12},(_,i)=>[z+Math.cos(i*Math.PI/6)*rz,y+Math.sin(i*Math.PI/6)*ry]);
    profile('Stamped Warden receiver',[[-.368,-.060],[-.368,.041],[-.334,.064],[.112,.064],[.154,.032],[.153,-.063],[.100,-.083],[-.272,-.083]],.146,m.metal,.003);
    profile('Hinged belt-feed cover',[[-.345,.058],[-.325,.092],[.094,.092],[.132,.067],[.112,.049]],.164,m.black,.003);
    box(0,.058,-.210,.182,.027,.180,m.metal,'Wide belt-feed tray');
    cylinder(0,.075,-.339,.012,.181,m.edge,'Feed cover hinge','x');
    rail(-.094,.340,.109,.073);trigger(.035);
    profile('Moulded Warden pistol grip',[[.055,-.054],[.129,-.054],[.179,-.213],[.157,-.230],[.080,-.221],[.058,-.185]],.075,m.polymer,.004);
    for(const side of [-1,1])for(let i=0;i<7;i++)box(side*.039,-.090-i*.018,.090+i*.006,.002,.003,.060,m.rubber,'Pistol grip traction ridge');
    for(const side of [-1,1]){
      box(side*.084,.049,.068,.011,.032,.043,m.metal,'Feed cover locking latch');
      box(side*.075,-.047,-.087,.002,.003,.448,m.black,'Stamped receiver seam');
      box(side*.077,-.018,-.092,.007,.012,.356,m.edge,'Receiver guide rib');
      box(side*.077,.030,-.110,.002,.003,.301,m.black,'Upper cover seam');
      for(const z of [-.325,-.260,-.058,.098])screw(side*.075,-.029,z,'Warden receiver rivet');
      screw(side*.087,.051,.071,'Feed-cover latch pin');
    }
    box(-.077,.023,.024,.004,.018,.114,m.black,'Left-side operating-handle recess');
    box(-.091,.023,.042,.036,.015,.039,m.metal,'Warden charging handle');
    ejection(-.169,.114,-.025,.075);
    box(.080,-.008,-.235,.010,.041,.017,m.metal,'Ejection-port deflector');
    box(-.085,.033,-.210,.023,.044,.149,m.black,'Belt feed opening');
    cylinder(-.082,-.017,.105,.010,.007,m.edge,'Safety selector','x');
    box(0,.001,.156,.148,.126,.043,m.black,'Rear receiver trunnion');
    cylinder(0,.008,.261,.025,.221,m.metal,'Collapsing stock tube');
    cylinder(0,.008,.198,.029,.030,m.black,'Stock tube collar');
    profile('Skeleton Warden stock',[[.224,.038],[.375,.038],[.429,.016],[.434,-.159],[.397,-.159],[.352,-.116],[.253,-.094],[.224,-.021]],.088,m.polymer,.004,[[[.267,-.026],[.374,-.026],[.396,-.101],[.365,-.087],[.271,-.067]]]);
    box(0,-.059,.445,.104,.223,.021,m.rubber,'Warden shoulder pad');
    box(0,-.042,.286,.043,.026,.079,m.black,'Stock adjustment catch');
    for(let i=0;i<9;i++)box(0,-.151+i*.024,.457,.086,.004,.002,m.black,'Shoulder pad traction groove');
    for(const side of [-1,1]){
      for(let i=0;i<4;i++)box(side*.046,.021,.263+i*.033,.002,.006,.021,m.black,'Stock moulding slot');
      screw(side*.046,-.082,.377,'Stock skeleton fastener');
      sling(side*.050,-.090,.391,'Stock sling swivel',true);
    }
    box(0,-.094,-.175,.176,.033,.175,m.black,'Ammunition pouch attachment');
    const pouch=contour('Soft 100-round ammunition pouch',[[-.286,-.178,.152,.151],[-.267,-.193,.216,.229],[-.219,-.199,.237,.259],[-.126,-.197,.222,.249],[-.082,-.184,.181,.207]],m.canvas);
    if(!pouch.geometry.hasAttribute('color')){
      const p=pouch.geometry.attributes.position,colors=[],palette=[0x4d5940,0x303c31,0x7d7458].map(c=>new T.Color(c));
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),patch=Math.sin(x*51+Math.sin(z*43))+Math.sin(y*58+Math.sin(x*35));
        const c=palette[patch>.6?2:patch<-.4?1:0];colors.push(c.r,c.g,c.b);
      }
      pouch.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    }
    for(const side of [-1,1]){
      box(side*.076,-.218,-.077,.012,.177,.008,m.olive,'Pouch retaining webbing');
      box(side*.076,-.142,-.069,.022,.025,.012,m.black,'Pouch webbing buckle');
      for(let i=0;i<9;i++)box(side*.076,-.158-i*.015,-.071,.008,.002,.001,m.olive,'Pouch stitched webbing');
    }
    box(0,-.214,-.070,.006,.150,.006,m.black,'Ammunition pouch zipper');
    ring(0,-.169,-.065,.005,.0015,m.edge,'Pouch zipper pull',4,12);
    const belt=[[-.094,.029],[-.119,.025],[-.142,.012],[-.161,-.011],[-.172,-.038],[-.166,-.066],[-.150,-.087]];
    for(const [x,y] of belt){
      cylinder(x,y,-.206,.007,.062,m.brass,'Linked belt cartridge');
      cylinder(x,y,-.172,.008,.004,m.edge,'Cartridge retaining link');
      add(a.cone,m.copper,x,y,-.247,[.006,.025,.006],'Belt cartridge tip').rotation.x=-Math.PI/2;
      box(x,y+.007,-.197,.012,.004,.016,m.black,'Disintegrating belt link');
    }
    cylinder(0,.015,-.585,.017,.468,m.metal,'Barrel inside the ventilated shroud');
    const vents=[];for(let i=0;i<8;i++)for(const y of [.025,.060])vents.push(oval(-.676+i*.039,y,.010,y>.04?.008:.006));
    for(const side of [-1,1]){
      const shield=profile('Perforated steel heat-shield side',[[-.711,-.005],[-.694,.080],[-.380,.080],[-.363,.059],[-.363,-.014],[-.695,-.014]],.006,m.metal,0,vents);shield.position.x=side*.055;
      box(side*.059,-.033,-.530,.018,.035,.311,m.polymer,'Warden handguard rail cover');
      for(let i=0;i<12;i++)box(side*.070,-.033,-.669+i*.025,.003,.032,.006,m.rubber,'Handguard traction rib');
      for(const z of [-.691,-.382])screw(side*.059,.006,z,'Heat-shield retaining screw');
    }
    const topVents=[];for(let i=0;i<6;i++)for(const y of [-.024,.024])topVents.push(oval(-.665+i*.049,y,.014,.008));
    const crown=profile('Vented heat-shield crown',[[-.711,-.055],[-.363,-.055],[-.363,.055],[-.711,.055]],.006,m.metal,0,topVents);crown.rotation.z=Math.PI/2;crown.position.y=.083;
    box(0,-.052,-.533,.125,.012,.337,m.black,'Handguard lower spine');
    cylinder(0,-.039,-.705,.016,.366,m.metal,'Warden gas piston tube');
    cylinder(0,-.039,-.892,.023,.029,m.black,'Gas regulator collar');
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;box(Math.sin(angle)*.022,-.039+Math.cos(angle)*.022,-.893,.006,.006,.021,m.edge,'Gas regulator grip');
    }
    cylinder(0,.015,-.795,.021,.221,m.metal,'Exposed quick-change barrel');
    cylinder(0,.015,-.374,.029,.049,m.edge,'Quick-change barrel collar');
    cylinder(0,.015,-.737,.027,.026,m.black,'Front barrel support');
    // The handle leans to the side; folded sights and bipod keep the scope clear.
    const yoke=profile('Quick-change carry-handle yoke',[[-.455,.027],[-.481,.133],[-.626,.133],[-.632,.152],[-.468,.152],[-.433,.031]],.014,m.metal,.002);yoke.position.x=.105;
    box(.109,.146,-.550,.033,.028,.158,m.polymer,'Carry-handle grip');
    for(let i=0;i<6;i++)box(.109,.161,-.614+i*.025,.030,.003,.007,m.rubber,'Carry-handle grip ridge');
    cylinder(.075,.037,-.444,.010,.062,m.edge,'Carry-handle pivot','x');
    box(0,.031,-.837,.072,.063,.037,m.black,'Front sight and bipod block');
    box(0,.066,-.826,.024,.021,.069,m.metal,'Folded front sight blade');
    box(0,.087,.119,.043,.015,.038,m.black,'Folded rear iron sight');
    for(const side of [-1,1]){
      cylinder(side*.042,-.028,-.837,.013,.019,m.edge,'Bipod pivot','x');
      box(side*.055,-.064,-.689,.016,.027,.304,m.metal,'Folded telescoping bipod leg');
      box(side*.058,-.061,-.682,.002,.014,.222,m.black,'Bipod leg recessed channel');
      box(side*.060,-.067,-.540,.040,.024,.051,m.black,'Folded bipod foot');
      screw(side*.054,-.028,-.837,'Bipod pivot fastener');
      sling(side*.069,-.009,-.375,'Front sling eye',true);
    }
    muzzlePoint=muzzle(-.973,.028,.015);forehand=-.530;
  }

  // An opaque mount never crosses the existing open reticle sightline.
  if(optic&&type!=='glock'){
    if(type==='bushmaster'){
      for(const z of [-.125,-.015]){
        box(0,.125,z,.072,.098,.029,m.black,'Precision scope mount');ring(0,.214,z,.048,.005,m.metal,'Scope mounting ring');
        for(const side of [-1,1])screw(side*.041,.133,z,'Scope clamp bolt');
      }
    }else if(type==='lmg'){
      profile('LMG scope mount',[[-.192,.112],[-.192,.163],[-.158,.167],[-.080,.171],[-.041,.171],[-.041,.112]],.077,m.black,.001);
      for(const side of [-1,1])for(const z of [-.170,-.065])screw(side*.041,.145,z,'LMG quick-detach clamp');
    }else{
      const [bottom,top]=({rifle:[.078,.130],shotgun:[.067,.130],smg:[.086,.132]})[type];
      box(0,(bottom+top)/2,-.07,.068,top-bottom,.098,m.black,'Optic riser');
      for(const side of [-1,1])for(const z of [-.101,-.04])screw(side*.037,(bottom+top)/2,z,'Optic clamp bolt');
    }
  }
  if(hands){
    ell(.052,-.118,.073,.043,.065,.064,m.glove,'Firing-hand palm');
    for(let i=0;i<3;i++)ell(.008,-.104-i*.025,.06+i*.009,.037,.012,.025,m.glove,'Curled firing finger');
    ell(.061,-.061,.01,.019,.013,.067,m.glove,'Trigger finger');ell(.017,-.089,.12,.016,.043,.024,m.glove,'Firing-hand thumb');
    const cuff=cylinder(.079,-.229,.181,.045,.20,m.glove,'Firing forearm','y');cuff.rotation.x=-.57;cuff.rotation.z=.25;
    ring(.07,-.18,.138,.042,.004,m.black,'Glove wrist seam').rotation.x=Math.PI/2;
    ell(-.028,-.109,forehand,.064,.042,.068,m.glove,'Supporting palm');
    for(let i=0;i<4;i++)ell(-.057,-.077,forehand-.052+i*.026,.021,.025,.012,m.glove,'Supporting finger');
    ell(.031,-.066,forehand+.019,.015,.027,.035,m.glove,'Supporting thumb');
    const arm=cylinder(-.12,-.223,forehand+.042,.043,.237,m.glove,'Support forearm','y');arm.rotation.z=-.55;
    for(const x of [-.035,-.012,.011])ell(x,-.133,forehand,.009,.008,.036,m.black,'Glove reinforcement');
  }
  const sight=optic&&type!=='glock'?makeOptic(g,type,m.metal):null;
  g.userData={weaponType:type,reference:references[type],body,parts,optic:sight,sightHeight:type==='glock'?.100:sight?.height??0,muzzle:muzzlePoint,forehand,slide,slideTime:0};
  return g;
}

export function updatePistolSlide(model,dt,ammo){
  const state=model.userData;if(!state.slide)return;
  state.slideTime=Math.max(0,state.slideTime-dt);
  state.slide.position.z=ammo===0?.026:.026*Math.sin(Math.PI*state.slideTime/.12);
}
