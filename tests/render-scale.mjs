import assert from 'node:assert/strict';
import {createRenderScale,RENDER_SCALE} from '../public/game/render-scale.mjs';

// Feed a dynamic-resolution controller one second of frames at a time. The
// frame-time model decides how much a lower scale actually helps.
function run(controller,seconds,frameTime){
  for(let t=0;t<seconds;){const dt=frameTime(controller.scale);controller.sample(dt);t+=dt;}
}
const gpuBound=(cost)=>scale=>Math.max(1/60,cost*scale*scale);

// A smooth 60 Hz display never loses resolution.
{const c=createRenderScale('high');run(c,30,()=>1/60);assert.equal(c.scale,1,'A steady 60 FPS keeps full resolution');}

// A GPU-bound frame sheds resolution until it holds 60 FPS, then stays put.
{
  const changes=[];const c=createRenderScale('high',{onChange:s=>changes.push(s)});
  run(c,20,gpuBound(1/38));
  assert(c.scale<1&&c.scale>=RENDER_SCALE.floor.high,`GPU-bound play should settle below full resolution (got ${c.scale})`);
  assert(gpuBound(1/38)(c.scale)<=RENDER_SCALE.slow,'The settled scale must restore an acceptable frame time');
  const settled=changes.length;run(c,60,gpuBound(1/38));
  assert(changes.length-settled<=4,`Scale must not oscillate (${changes.length-settled} changes after settling)`);
}

// When lower resolution does not help (CPU-bound crowds or a 30 Hz cap) the
// step is reverted and reductions pause, so the image is not softened in vain.
{const c=createRenderScale('high');run(c,30,()=>1/30);assert(c.scale>=.9,`Fixed 30 FPS must not drain resolution (got ${c.scale})`);}

// Recovering performance restores full resolution after sustained headroom.
{
  const c=createRenderScale('high');run(c,10,gpuBound(1/38));const low=c.scale;assert(low<1);
  run(c,2,()=>1/60);assert.equal(c.scale,low,'Raising requires sustained headroom, not one good second');
  run(c,120,()=>1/60);assert.equal(c.scale,1,'Sustained headroom restores full resolution');
}

// Floors and starting points per quality; long stalls count once.
{
  const ultra=createRenderScale('ultra');run(ultra,40,()=>.08);assert(ultra.scale>=RENDER_SCALE.floor.ultra);
  const low=createRenderScale('low');assert.equal(low.scale,RENDER_SCALE.start.low,'Performance starts below native resolution');
  run(low,60,gpuBound(1/12));assert.equal(low.scale,RENDER_SCALE.floor.low);
  low.reset('high');assert.equal(low.scale,1);assert.equal(low.floor,RENDER_SCALE.floor.high);
  const stall=createRenderScale('high');for(let i=0;i<59;i++)stall.sample(1/60);stall.sample(2);assert.equal(stall.scale,1,'One long stall (shader compile, tab switch) is not a slowdown');
  const freeze=createRenderScale('high');freeze.sample(31);for(let i=0;i<120;i++)freeze.sample(1/60);assert.equal(freeze.scale,1,'A 31 s shader-compile freeze is one capped sample, not a slow window');
  const paused=createRenderScale('high');for(let i=0;i<40;i++)paused.sample(1/20);paused.interrupt();for(let i=0;i<70;i++)paused.sample(1/60);assert.equal(paused.scale,1,'Interrupting discards a partial window');
}
console.log('PASS: dynamic resolution holds 60 FPS on GPU-bound frames, ignores stalls and CPU/vsync limits, never oscillates, restores full resolution and respects per-quality floors.');
