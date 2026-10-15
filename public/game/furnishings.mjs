import * as T from './three.module.js';

// Shared furniture geometry/materials are built once. All pieces remain static
// and join the estate's existing batches; no lights or runtime model spawning.
export function createFurnishings({world,M,colliders}){
  const geometries=new Map(),records=[];
  const finish=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const cloth=M.leather.clone();cloth.color.setHex(0x665044);cloth.roughness=.84;
  const linen=M.red.clone();linen.color.setHex(0x856052);linen.roughness=1;
  const pillow=M.leather.clone();pillow.color.setHex(0xd3cbbb);pillow.roughness=1;
  const sage=M.leather.clone();sage.color.setHex(0x69756a);sage.roughness=1;
  const pages=finish(0xcac3ac),iron=finish(0x394044,.7,.5),ivory=finish(0xd5cbb4,.54),soil=finish(0x352c23);
  const lacquer=finish(0x292726,.32),leaf=finish(0x45694b,.94);leaf.side=T.DoubleSide;
  const pottery=finish(0x8b7560,.87),mirror=finish(0x7d9698,.28,.75);
  const books=[0x734a37,0x42584a,0x8b764a,0x40525c,0x68444d].map(c=>finish(c,.88));
  const sphereGeo=new T.SphereGeometry(1,16,10);
  function cached(key,build){if(!geometries.has(key))geometries.set(key,build());return geometries.get(key);}
  function boxGeometry(w,h,d,r,material){
    const tile=material.map?.userData.tileMeters||0,repeat=material.map?.repeat;
    return cached(['box',w,h,d,r,tile,repeat?.x,repeat?.y].join('/'),()=>{
      const segments=r?4:1,g=new T.BoxGeometry(w,h,d,segments,segments,segments);
      if(r){
        const p=g.attributes.position,n=g.attributes.normal,v=new T.Vector3(),core=new T.Vector3();
        for(let i=0;i<p.count;i++){
          v.fromBufferAttribute(p,i);core.set(T.MathUtils.clamp(v.x,-w/2+r,w/2-r),T.MathUtils.clamp(v.y,-h/2+r,h/2-r),T.MathUtils.clamp(v.z,-d/2+r,d/2-r));
          v.sub(core).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(core);p.setXYZ(i,v.x,v.y,v.z);
        }
      }
      if(tile){
        const uv=g.attributes.uv,count=(segments+1)**2,faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
        for(let face=0;face<6;face++)for(let k=0;k<count;k++){const i=face*count+k;uv.setXY(i,uv.getX(i)*faces[face][0]/tile/repeat.x,uv.getY(i)*faces[face][1]/tile/repeat.y);}
      }
      g.computeBoundingBox();g.computeBoundingSphere();return g;
    });
  }
  function mesh(g,geo,mat,name,x=0,y=0,z=0){const p=new T.Mesh(geo,mat);p.name=name;p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;g.add(p);return p;}
  function b(g,x,y,z,w,h,d,mat=M.wood,name='Joinery',r=0){return mesh(g,boxGeometry(w,h,d,Math.min(r,w*.24,h*.24,d*.24),mat),mat,name,x,y,z);}
  function ell(g,x,y,z,sx,sy,sz,mat,name){const p=mesh(g,sphereGeo,mat,name,x,y,z);p.scale.set(sx,sy,sz);return p;}
  function cy(g,x,y,z,r,h,mat=M.gold,name='Turned support',bottom=r){
    return mesh(g,cached(['cyl',r,bottom,h].join('/'),()=>new T.CylinderGeometry(r,bottom,h,16)),mat,name,x,y,z);
  }
  function link(g,a,bp,r,mat,name){const aV=new T.Vector3(...a),bV=new T.Vector3(...bp),v=bV.clone().sub(aV),p=cy(g,...aV.add(bV).multiplyScalar(.5).toArray(),r,v.length(),mat,name);p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return p;}
  function ring(g,x,y,z,r,tube,mat,name){
    return mesh(g,cached(['ring',r,tube].join('/'),()=>new T.TorusGeometry(r,tube,6,32)),mat,name,x,y,z);
  }
  function place(g,type,x,z,{y=0,rotation=0,collision=true}={}){
    g.name=type;g.position.set(x,y===0?.095:y,z);g.rotation.y=rotation;world.add(g);g.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(g),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    const collider=collision?{x:center.x,z:center.z,w:size.x+.025,d:size.z+.025,minY:y,maxY:bounds.max.y,furnishing:type}:null;
    if(collider)colliders.push(collider);
    g.userData.furnishing=type;records.push({type,x,z,y,rotation,group:g,bounds:bounds.clone(),collider});
    return g;
  }
  function book(g,x,y,z,index=0,w=.09,h=.3,d=.2){
    b(g,x,y,z,w,h,d,books[index%books.length],'Leather book spine');
    b(g,x+w/2+.002,y,z-.012,.005,h-.022,d-.027,pages,'Exposed page edges');
    for(const side of [-1,1])b(g,x,y+side*h*.33,z+d/2+.003,w*.7,.006,.005,M.gold,'Gilt spine band');
  }
  function lamp(g,x,y,z){
    cy(g,x,y+.025,z,.10,.05,M.gold,'Lamp foot');cy(g,x,y+.20,z,.016,.32,M.gold,'Lamp stem');
    cy(g,x,y+.40,z,.12,.20,pillow,'Linen lampshade',.20);
    cy(g,x,y+.505,z,.032,.012,M.gold,'Shade finial');
  }
  function tabletop(g,w,d,h,desk){
    b(g,0,h-.035,0,w,.07,d,M.wood,'Beveled tabletop',.018);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cy(g,sx*(w/2-.13),(h-.07)/2,sz*(d/2-.12),.044,h-.07,M.wood,'Tapered table leg',.032);
      b(g,sx*(w/2-.13),h-.15,sz*(d/2-.12),.09,.17,.09,M.wood,'Leg joinery');
    }
    for(const side of [-1,1])b(g,0,h-.13,side*(d/2-.08),w-.20,.14,.045,M.wood,'Table apron');
    if(desk){
      b(g,0,h-.15,d/2-.04,w*.74,.18,.08,M.wood,'Writing desk drawer',.01);
      for(const x of [-w*.22,w*.22])cy(g,x,h-.15,d/2+.011,.018,.018,M.gold,'Drawer pull').rotation.x=Math.PI/2;
      b(g,-.13,h+.008,0,.62,.012,.38,cloth,'Leather writing blotter',.004);
      b(g,.06,h+.019,-.015,.30,.004,.24,pages,'Letter paper');
      cy(g,-w*.32,h+.035,-d*.22,.036,.07,iron,'Ink bottle');cy(g,-w*.32,h+.076,-d*.22,.028,.012,M.gold,'Ink bottle rim');
      b(g,-w*.32-.03,h+.15,-d*.22,.015,.18,.005,pillow,'Quill').rotation.z=-.35;
      lamp(g,w*.32,h,-d*.18);
    }
  }
  function table(x,z,{w=1.8,d=.85,h=.78,desk=false,...opts}={}){
    const g=new T.Group();tabletop(g,w,d,h,desk);return place(g,desk?'Writing desk':'Oak table',x,z,opts);
  }
  function chair(x,z,opts={}){
    const g=new T.Group();
    b(g,0,.43,0,.51,.08,.49,M.wood,'Chair seat frame',.018);b(g,0,.486,-.01,.47,.05,.43,cloth,'Upholstered chair seat',.018);
    for(const sx of [-1,1])for(const sz of [-1,1])cy(g,sx*.21,.205,sz*.20,.025,.41,M.wood,'Chair leg',.020);
    for(const sx of [-1,1])b(g,sx*.23,.80,.22,.05,.71,.055,M.wood,'Chair back stile',.01);
    b(g,0,1.14,.225,.52,.10,.08,M.wood,'Curved top rail',.022);
    for(const x of [-.13,0,.13])b(g,x,.89,.22,.036,.41,.05,M.wood,'Chair back spindle',.008);
    for(const side of [-1,1])b(g,side*.21,.20,0,.024,.025,.40,M.wood,'Chair stretcher');
    return place(g,'Dining chair',x,z,opts);
  }
  function sofa(x,z,opts={}){
    const g=new T.Group();
    for(const sx of [-1,1])for(const sz of [-1,1])cy(g,sx*1.12,.08,sz*.34,.052,.16,M.wood,'Sofa turned foot',.038);
    b(g,0,.29,0,2.58,.28,.89,cloth,'Upholstered sofa base',.055);
    b(g,0,.83,.35,2.51,.67,.25,cloth,'Padded sofa back',.062);
    for(const side of [-1,1]){
      b(g,side*1.19,.61,-.025,.28,.48,.92,cloth,'Rolled sofa arm',.065);
      cy(g,side*1.19,.82,-.03,.145,.85,cloth,'Arm roll').rotation.x=Math.PI/2;
    }
    for(const x of [-.77,0,.77])b(g,x,.505,-.09,.74,.16,.70,cloth,'Separate seat cushion',.043);
    for(const x of [-.86,-.43,0,.43,.86])for(const yy of [.80,1.03])ell(g,x,yy,.212,.015,.015,.009,M.gold,'Tuft button');
    for(const side of [-1,1]){const p=ell(g,side*.87,.73,-.04,.16,.20,.10,linen,'Loose sofa pillow');p.rotation.z=side*.20;}
    return place(g,'Tufted leather sofa',x,z,opts);
  }
  function bookcase(x,z,opts={}){
    const g=new T.Group(),w=2.4,d=.48,h=2.53;
    b(g,0,h/2,-.22,w,h,.045,M.wood,'Thin bookcase back');
    for(const side of [-1,1])b(g,side*(w/2-.046),h/2,0,.092,h,d,M.wood,'Bookcase side stile',.009);
    b(g,0,.12,0,w,.18,d+.04,M.wood,'Bookcase plinth',.016);
    b(g,0,h-.055,0,w+.09,.11,d+.08,M.wood,'Bookcase cornice',.013);
    for(let row=0;row<4;row++){
      const shelf=.32+row*.53;b(g,0,shelf,0,w-.15,.055,d,M.wood,'Open shelf');
      for(let k=0;k<15;k++){
        const height=.25+((k*7+row*3)%5)*.028,width=.082+((k+row)%3)*.012;
        book(g,-1.03+k*.145,shelf+.03+height/2,.075,k+row,width,height,.23);
      }
    }
    return place(g,'Open oak bookcase',x,z,opts);
  }
  function bed(x,z,{kind='double',...opts}={}){
    const g=new T.Group(),hospital=kind==='hospital',single=kind!=='double',w=single?1.04:1.92,d=single?2.12:2.22,frame=hospital?ivory:M.wood;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      cy(g,sx*(w/2-.06),.22,sz*(d/2-.06),.037,.44,frame,'Bed leg');
      if(hospital){const wheel=ring(g,sx*(w/2-.06),.072,sz*(d/2-.06),.052,.013,iron,'Bed caster');wheel.rotation.y=Math.PI/2;}
    }
    b(g,0,.43,0,w,.10,d,frame,'Bed frame',.014);
    b(g,0,.555,0,w-.06,.18,d-.08,pillow,'Rounded mattress',.045);
    b(g,0,.667,.31,w-.10,.060,d*.62,hospital?sage:linen,'Folded coverlet',.018);
    b(g,0,.699,-.29,w-.11,.035,.19,hospital?sage:linen,'Folded blanket hem',.012);
    if(hospital){
      for(const end of [-1,1]){
        for(const side of [-1,1])cy(g,side*(w/2-.03),.62,end*(d/2+.025),.025,1.08,ivory,'Iron bedpost');
        link(g,[-w/2+.03,1.12,end*(d/2+.025)],[w/2-.03,1.12,end*(d/2+.025)],.025,ivory,'Bed end rail');
        for(const xx of [-.28,0,.28])cy(g,xx,.92,end*(d/2+.025),.013,.35,ivory,'Headboard spindle');
      }
    }else{
      b(g,0,.78,-d/2-.018,w+.07,1.05,.09,M.wood,'Paneled headboard',.023);
      b(g,0,.83,-d/2+.032,w-.20,.60,.026,M.wood,'Headboard inset panel',.015);
      b(g,0,.49,d/2+.018,w+.04,.34,.085,M.wood,'Low footboard',.018);
    }
    for(const x of single?[0]:[-.45,.45]){
      const p=ell(g,x,.713,-d*.31,single?.35:.38,.082,.23,pillow,'Linen pillow');p.rotation.y=x*.08;
    }
    return place(g,hospital?'Infirmary iron bed':single?'Single oak bed':'Double oak bed',x,z,opts);
  }
  function cabinet(x,z,{w=1.8,h=1.96,d=.53,...opts}={}){
    const g=new T.Group(),doors=Math.max(2,Math.round(w/.75));
    b(g,0,h/2+.09,0,w,h-.16,d,M.wood,'Cabinet carcass',.014);
    b(g,0,h-.025,0,w+.07,.075,d+.055,M.wood,'Cabinet crown',.013);
    b(g,0,.17,0,w+.04,.10,d+.035,M.wood,'Cabinet lower molding',.011);
    for(const side of [-1,1])for(const zz of [-1,1])cy(g,side*(w/2-.14),.09,zz*(d/2-.08),.041,.18,M.wood,'Cabinet foot');
    for(let i=0;i<doors;i++){
      const dw=(w-.12)/doors,x=-w/2+.06+(i+.5)*dw;
      b(g,x,h*.52+.045,d/2+.014,dw-.025,h-.37,.025,M.wood,'Separate cabinet door',.007);
      b(g,x,h*.52+.045,d/2+.032,dw-.15,h-.52,.016,M.wood,'Raised door panel',.006);
      const pull=cy(g,x+(i%2?-1:1)*dw*.33,h*.53,d/2+.063,.015,.035,M.gold,'Brass cabinet handle');pull.rotation.x=Math.PI/2;
    }
    return place(g,h<1.3?'Paneled sideboard':'Oak wardrobe',x,z,opts);
  }
  function bench(x,z,{w=2.6,back=true,...opts}={}){
    const g=new T.Group();b(g,0,.46,0,w,.095,.47,M.wood,'Bench seat',.02);
    for(const side of [-1,1]){b(g,side*(w/2-.20),.22,0,.105,.44,.40,M.wood,'Bench trestle');b(g,side*(w/2-.20),.045,0,.26,.09,.53,M.wood,'Bench foot',.014);}
    b(g,0,.20,.12,w-.30,.055,.05,M.wood,'Bench stretcher');
    if(back){
      for(const side of [-1,1])b(g,side*(w/2-.13),.74,.22,.12,.80,.10,M.wood,'Bench back stile',.012);
      for(const yy of [.72,.93])b(g,0,yy,.225,w-.12,.16,.06,M.wood,'Bench back rail',.012);
    }
    return place(g,back?'Oak bench':'Piano stool',x,z,opts);
  }
  function grandPiano(x,z,opts={}){
    const g=new T.Group(),outline=new T.Shape();
    outline.moveTo(-.73,.99);outline.lineTo(.73,.99);outline.lineTo(.73,.22);outline.bezierCurveTo(.76,-.22,.18,-.34,.20,-.81);outline.bezierCurveTo(.16,-1.26,-.60,-1.43,-.73,-.95);outline.lineTo(-.73,.99);
    const caseGeo=cached('grand-piano-case',()=>{const geo=new T.ExtrudeGeometry(outline,{depth:.22,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:14});geo.rotateX(Math.PI/2);return geo;});
    mesh(g,caseGeo,lacquer,'Curved grand piano case',0,1.02,0);
    for(const [xx,zz] of [[-.57,.65],[.57,.65],[-.34,-.99]])cy(g,xx,.40,zz,.05,.80,lacquer,'Piano leg',.037);
    b(g,0,.829,1.0,1.44,.11,.24,lacquer,'Keyboard cheek',.014);
    const keyPitch=.0235;for(let i=0;i<52;i++){
      const xx=(i-25.5)*keyPitch;b(g,xx,.899,1.02,.0223,.018,.18,ivory,'Ivory piano key');
      if(i<51&&[0,2,3,5,6].includes(i%7))b(g,xx+keyPitch/2,.923,.961,.013,.030,.096,lacquer,'Ebony piano key');
    }
    const lid=new T.Group();lid.position.set(-.70,1.048,-.06);lid.rotation.z=.26;g.add(lid);
    const lidGeo=cached('grand-piano-lid',()=>{const geo=new T.ExtrudeGeometry(outline,{depth:.022,bevelEnabled:false,curveSegments:14});geo.rotateX(Math.PI/2);return geo;});
    mesh(lid,lidGeo,lacquer,'Raised curved piano lid',.70,0,.06);
    link(g,[.38,1.01,-.36],[.38,1.34,-.36],.012,M.gold,'Lid prop');
    b(g,0,1.16,.54,.67,.28,.035,lacquer,'Piano music rest').rotation.x=-.20;
    b(g,0,1.17,.56,.42,.23,.004,pages,'Sheet music').rotation.x=-.20;
    for(const xx of [-.085,0,.085])b(g,xx,.10,.57,.025,.035,.16,M.gold,'Piano pedal');
    return place(g,'Curved grand piano',x,z,opts);
  }
  function musicStand(x,z,opts={}){
    const g=new T.Group();cy(g,0,.56,0,.012,1.12,iron,'Music stand stem');
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link(g,[0,.22,0],[Math.cos(a)*.26,.027,Math.sin(a)*.26],.012,iron,'Tripod foot');}
    const tray=b(g,0,1.14,0,.48,.30,.014,iron,'Tilted music tray',.008);tray.rotation.x=-.18;
    b(g,0,.989,.034,.48,.018,.035,iron,'Score ledge');const paper=b(g,0,1.143,.011,.35,.24,.004,pages,'Music score');paper.rotation.x=-.18;
    return place(g,'Tripod music stand',x,z,opts);
  }
  function planter(x,z,opts={}){
    const g=new T.Group(),profile=[[.24,.035],[.25,.09],[.28,.47],[.31,.49],[.31,.55],[.28,.56]].map(p=>new T.Vector2(...p));
    mesh(g,cached('terracotta-planter',()=>new T.LatheGeometry(profile,24)),pottery,'Tapered terracotta pot');
    cy(g,0,.53,0,.277,.025,soil,'Recessed potting soil');ring(g,0,.54,0,.296,.018,pottery,'Pot rim').rotation.x=Math.PI/2;
    const leafGeo=cached('arching-leaf',()=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.08,.10,.025,.08,.10,.025,-.09,.22,.035,.09,.22,.035,0,.39,.02],3));geo.setAttribute('uv',new T.Float32BufferAttribute([.5,0,0,.25,1,.25,0,.55,1,.55,.5,1],2));geo.setIndex([0,2,1,1,2,3,2,4,3,3,4,5]);geo.computeVertexNormals();return geo;});
    for(let i=0;i<11;i++){
      const a=i*2.39996,height=.87+(i%4)*.16,xx=Math.cos(a)*.22,zz=Math.sin(a)*.22;
      link(g,[0,.54,0],[xx,height,zz],.006,leaf,'Plant stem');
      const p=mesh(g,leafGeo,leaf,'Pointed arching leaf',xx,height-.04,zz);p.rotation.set(.32+(i%3)*.12,a,-.20);p.scale.setScalar(.8+(i%3)*.12);
    }
    return place(g,'Potted conservatory plant',x,z,opts);
  }
  function telescope(x,z,opts={}){
    const g=new T.Group(),direction=new T.Vector3(0,.48,-1).normalize();
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link(g,[0,1.05,0],[Math.cos(a)*.46,.04,Math.sin(a)*.46],.032,M.wood,'Telescope tripod leg');}
    cy(g,0,1.13,0,.055,.26,M.gold,'Equatorial mount');const tube=cy(g,0,1.39,-.11,.084,1.45,M.gold,'Brass refractor tube');tube.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
    for(const length of [-.65,.52,.69]){
      const pos=direction.clone().multiplyScalar(length).add(new T.Vector3(0,1.39,-.11)),rim=cy(g,...pos.toArray(),length<0?.057:.092,.045,iron,'Optical tube collar');rim.quaternion.copy(tube.quaternion);
    }
    const lensPos=direction.clone().multiplyScalar(.716).add(new T.Vector3(0,1.39,-.11));
    const lens=cy(g,...lensPos.toArray(),.079,.009,mirror,'Objective lens');lens.quaternion.copy(tube.quaternion);
    const eyePos=direction.clone().multiplyScalar(-.79).add(new T.Vector3(0,1.39,-.11));
    const eyepiece=cy(g,...eyePos.toArray(),.027,.17,iron,'Focusing eyepiece');eyepiece.quaternion.copy(tube.quaternion);
    return place(g,'Brass refractor telescope',x,z,opts);
  }
  function bust(x,z,{pedestal=true,...opts}={}){
    const g=new T.Group(),offset=pedestal?1:0;
    if(pedestal){b(g,0,.09,0,.71,.18,.71,M.stone,'Pedestal base',.017);b(g,0,.52,0,.50,.76,.50,M.stone,'Stone pedestal shaft',.01);b(g,0,.96,0,.66,.12,.66,M.stone,'Pedestal cap',.017);}
    else b(g,0,.025,0,.37,.05,.29,M.stone,'Bust foot',.01);
    ell(g,0,offset+.19,0,.28,.20,.15,M.stone,'Sculpted shoulders');cy(g,0,offset+.39,0,.072,.22,M.stone,'Sculpted neck');
    ell(g,0,offset+.62,0,.115,.157,.108,M.stone,'Portrait bust head');ell(g,0,offset+.60,.116,.021,.045,.029,M.stone,'Sculpted nose');
    for(const side of [-1,1]){ell(g,side*.046,offset+.656,.091,.038,.009,.016,M.stone,'Sculpted brow');ell(g,side*.114,offset+.61,0,.015,.031,.019,M.stone,'Sculpted ear');}
    b(g,0,offset+.544,.097,.050,.010,.015,M.stone,'Sculpted lips',.003);
    return place(g,'Classical portrait bust',x,z,opts);
  }
  function globe(x,z,{y=.82,...opts}={}){
    const g=new T.Group();cy(g,0,.036,0,.18,.072,M.wood,'Globe base');cy(g,0,.12,0,.026,.15,M.gold,'Globe support');
    const frame=ring(g,0,.39,0,.256,.011,M.gold,'Globe meridian');frame.rotation.z=-.41;
    const ball=ell(g,0,.39,0,.232,.232,.232,globeMaterial(),'Terrestrial globe');ball.rotation.z=-.41;
    return place(g,'Tabletop terrestrial globe',x,z,{...opts,y,collision:false});
  }
  let globeMat;
  function globeMaterial(){
    if(globeMat)return globeMat;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
    c.fillStyle='#4a6870';c.fillRect(0,0,512,256);c.strokeStyle='#9b986f55';c.lineWidth=1;
    for(let x=0;x<512;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}
    for(let y=16;y<256;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
    for(const points of [[[38,53],[72,35],[118,58],[130,96],[101,128],[83,98],[58,96]],[[104,134],[136,132],[150,161],[134,204],[117,224],[111,187]],[[238,66],[270,61],[295,89],[283,105],[254,111]],[[249,115],[287,107],[302,138],[284,185],[266,194],[253,154]],[[288,54],[338,38],[400,56],[443,89],[420,119],[378,104],[349,134],[320,111]],[[392,173],[425,161],[449,183],[430,206],[400,201]]]){
      c.fillStyle='#b1a578';c.strokeStyle='#d1bd8a';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();
    }
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
    globeMat=new T.MeshStandardMaterial({map:tex,roughness:.72,color:0xc9c4ad});return globeMat;
  }
  return {records,geometries,sofa,bookcase,bed,table,chair,cabinet,bench,grandPiano,musicStand,planter,telescope,bust,globe};
}
