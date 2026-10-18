// Dynamic resolution. The 3D scene renders into an offscreen target that is
// resampled to the full canvas, so its size can drop when the frame rate falls
// without resizing the canvas or touching the DOM HUD. Each change is measured:
// a step that does not shorten the frame (CPU-bound crowds, a capped display)
// is reverted and further reductions pause, so the image never softens for
// nothing. Raising resolution again requires sustained headroom, with a
// growing cooldown when a raise immediately caused a slowdown.
export const RENDER_SCALE=Object.freeze({
  max:1,
  floor:{ultra:.75,high:.6,low:.5},
  start:{ultra:1,high:1,low:.85},
  step:.1,
  raiseStep:.05,
  window:1,          // seconds of play per measurement
  slow:1/50,         // average frame longer than 20 ms: reduce
  healthy:1/57,      // average frame within 17.5 ms: headroom (60 Hz vsync)
  raiseAfter:4,      // healthy seconds needed before raising
  maxRaiseAfter:32,
  benefit:.95,       // a reduction must cut frame time by at least 5%
  lockout:20,        // seconds without reductions after an ineffective one
  maxSample:.1       // ignore the excess of single long stalls
});

export function createRenderScale(quality='high',{onChange=()=>{}}={}){
  let floor,scale,sum=0,count=0,time=0,healthyFor=0,raiseAfter=RENDER_SCALE.raiseAfter,lockedFor=0,pending=null,lastRaise=-Infinity,clock=0;
  function reset(q=quality){
    quality=q;floor=RENDER_SCALE.floor[q]??RENDER_SCALE.floor.high;
    sum=0;count=0;time=0;healthyFor=0;raiseAfter=RENDER_SCALE.raiseAfter;lockedFor=0;pending=null;lastRaise=-Infinity;
    set(RENDER_SCALE.start[q]??1);
  }
  function set(value){
    const next=Math.round(Math.min(RENDER_SCALE.max,Math.max(floor,value))*100)/100;
    if(next===scale)return false;scale=next;onChange(scale);return true;
  }
  // Discard the current window, e.g. after a pause or a hidden tab.
  function interrupt(){sum=0;count=0;time=0;pending=null;}
  function sample(frameSeconds){
    if(!(frameSeconds>0))return;
    // A long stall counts once, capped, so it cannot fill a window by itself.
    const capped=Math.min(frameSeconds,RENDER_SCALE.maxSample);clock+=capped;sum+=capped;count++;time+=capped;
    if(time<RENDER_SCALE.window)return;
    const average=sum/count;sum=0;count=0;time=0;
    lockedFor=Math.max(0,lockedFor-RENDER_SCALE.window);
    if(pending){
      // Judge the reduction made at the end of the previous window.
      const {before,from}=pending;pending=null;
      if(average>before*RENDER_SCALE.benefit){set(from);lockedFor=RENDER_SCALE.lockout;healthyFor=0;return;}
    }
    if(average>RENDER_SCALE.slow){
      healthyFor=0;
      if(clock-lastRaise<RENDER_SCALE.window*3)raiseAfter=Math.min(RENDER_SCALE.maxRaiseAfter,raiseAfter*2);
      if(lockedFor>0||scale<=floor)return;
      const from=scale;if(set(scale-RENDER_SCALE.step))pending={before:average,from};
      return;
    }
    if(average<=RENDER_SCALE.healthy&&scale<RENDER_SCALE.max){
      healthyFor+=RENDER_SCALE.window;
      if(healthyFor>=raiseAfter){healthyFor=0;if(set(scale+RENDER_SCALE.raiseStep))lastRaise=clock;}
    }else healthyFor=0;
  }
  reset(quality);
  return {sample,interrupt,reset,get scale(){return scale;},get floor(){return floor;},get locked(){return lockedFor>0;}};
}
