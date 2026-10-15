// Rear forecourt, west of the storm cellar flight and clear of the rear path.
export const SHED=Object.freeze({
  x:-38,z:-99,w:7.2,d:6.4,wall:.22,height:3.6,
  doorWidth:2.6,doorHeight:3.1,unlockWave:7
});
export const SHED_FRONT=SHED.z+SHED.d/2;
export const SHED_PATH=Object.freeze({x:SHED.x,z:(SHED_FRONT-91)/2,w:2.6,d:-91-SHED_FRONT,y:-.01});
export function inShed(x,z,r=0){
  return Math.abs(x-SHED.x)+r<=SHED.w/2-SHED.wall&&Math.abs(z-SHED.z)+r<=SHED.d/2-SHED.wall;
}
