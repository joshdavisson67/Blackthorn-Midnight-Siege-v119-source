import {GRAVEYARD_SPAWNS,inGraveyard,inMausoleum} from './graveyard-layout.mjs?v=28';
export const ESTATE_BOUNDS = {minX:-53.4,maxX:80.4,minZ:-107.4,maxZ:29.4};
export const ORIGINAL_FLOOR_AREA = 28 * 24;
export const MANSION = {minX:-42,maxX:42,minZ:-84,maxZ:12,width:84,depth:96};
export const ESTATE_ROOMS = [
  {id:'ballroom',name:'THE BALLROOM',x:-28,z:0,tint:0x68665b},
  {id:'original',name:'GRAND HALL',x:0,z:0,tint:0x969d87},
  {id:'conservatory',name:'CONSERVATORY',x:28,z:0,tint:0x596f64},
  {id:'portraits',name:'PORTRAIT GALLERY',x:-28,z:-24,tint:0x74605a},
  {id:'rotunda',name:'GREAT ROTUNDA',x:0,z:-24,tint:0x8a8674},
  {id:'music',name:'MUSIC SALON',x:28,z:-24,tint:0x606878},
  {id:'archives',name:'THE ARCHIVES',x:-28,z:-48,tint:0x776e58},
  {id:'north',name:'NORTH GALLERY',x:0,z:-48,tint:0x758076},
  {id:'infirmary',name:'THE INFIRMARY',x:28,z:-48,tint:0x687c77},
  {id:'chapel',name:'THE CHAPEL',x:-28,z:-72,tint:0x756d7a},
  {id:'observatory',name:'OBSERVATORY',x:0,z:-72,tint:0x576c7b},
  {id:'servants',name:'SERVANTS’ QUARTERS',x:28,z:-72,tint:0x7c7767}
].map(room=>({...room,w:28,d:24}));
export const MANSION_FLOOR_AREA=ESTATE_ROOMS.reduce((area,r)=>area+r.w*r.d,0);
export function roomAt(x,z){
  return ESTATE_ROOMS.find(r=>Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.d/2)||null;
}
export function estateLocation(x,z){
  if(inMausoleum(x,z))return 'BLACKTHORN MAUSOLEUM';if(inGraveyard(x,z))return 'FAMILY CEMETERY';
  const room=roomAt(x,z);
  if(room?.id==='original')return x<-5.6?'THE LIBRARY':x>5.6?'DINING ROOM':'GRAND HALL';
  return room?.name||(z>12?'FRONT COURTYARD':z<-84?'NORTH GROUNDS':x>42?'EAST GROUNDS':'WEST GROUNDS');
}
export const ESTATE_SPAWNS=ESTATE_ROOMS.flatMap(r=>[
  [r.x,r.z],[r.x-8,r.z-7],[r.x+8,r.z+7],[r.x-8,r.z+7],[r.x+8,r.z-7]
]).concat([[-20,21],[20,23],[-48,19],[48,19],[-48,-24],[48,-48],[0,-91],[-28,-91],[28,-91],...GRAVEYARD_SPAWNS]);
