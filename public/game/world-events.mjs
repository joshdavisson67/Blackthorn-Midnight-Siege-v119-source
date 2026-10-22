// Wave events use game time, never wall-clock timers or permanent enemy stats.
export const EVENT_RULES=Object.freeze({firstWave:3,chance:.40,warning:3,graveWarning:4,graves:3,reinforcements:6,graveBonus:25,spawnInterval:.8,aliveLimit:32});
export const WORLD_EVENTS=Object.freeze({
  shroud:{name:'THE SHROUD',duration:30,color:'#a7d9db',warning:'An eerie call carries across the cemetery…',description:'Dense fog conceals the distant dead outdoors. Every kill earns 20% more essence.',effect:'OUTDOOR VISIBILITY REDUCED · +20% KILL ESSENCE'},
  surge:{name:'THE SURGE',duration:30,color:'#cfadff',warning:'A supernatural pulse is gathering…',description:'Standard zombies hasten. Every kill earns 20% more essence.',effect:'+20% WALKER SPEED · +20% KILL ESSENCE'},
  awakening:{name:'GRAVE AWAKENING',duration:30,color:'#b5ecae',warning:'Three marked graves glow and tremble in the cemetery.',description:'Six dead rise from the cemetery. Every kill earns 20% more essence for 30 seconds. Collect their bonus essence.',effect:'CEMETERY REINFORCEMENTS · +20% KILL ESSENCE · GOLD ESSENCE DROPS'},
  blackout:{name:'BLACKOUT',duration:30,color:'#e0c27a',warning:'The lamps gutter and hiss…',description:'Every light in the estate dies. Only your flashlight cuts the dark. Every kill earns 20% more essence.',effect:'ALL LIGHTS OUT · FLASHLIGHT ONLY · +20% KILL ESSENCE'},
});
const ids=Object.keys(WORLD_EVENTS);
// Lamps stutter out (t: 0→1) rather than switching off in one frame.
function stutter(t){return t>=1?1:Math.min(1,Math.max(0,t+(Math.sin(t*47)*.5+Math.sin(t*19)*.5)*(1-t)*.9));}
const walker=e=>!e.brute&&!e.dog&&!e.rareDog&&!e.feral;
export function createWorldEvents({random=()=>Math.random(),graves=[],onWarning=()=>{},onStart=()=>{},onEnd=()=>{},spawn=()=>false}={}){
  let currentWave=0,lastEventWave=-2,id=null,phase='idle',left=0,age=0,marked=[],queue=[],spawnWait=0;
  function finish(reason){const ended=id;id=null;phase='idle';left=age=spawnWait=0;marked=[];queue=[];if(ended)onEnd(ended,reason);}
  function markGraves(){
    const available=[...graves];marked=[];
    while(available.length&&marked.length<EVENT_RULES.graves)marked.push(available.splice(Math.min(available.length-1,Math.floor(random()*available.length)),1)[0]);
    queue=marked.flatMap((grave,index)=>[0,1].map(slot=>({grave,index,slot})));
  }
  function enterWarning(){phase='warning';age=0;left=id==='awakening'?EVENT_RULES.graveWarning:EVENT_RULES.warning;if(id==='awakening')markGraves();onWarning(id,marked);}
  function activate(){phase='active';age=0;left=WORLD_EVENTS[id].duration;spawnWait=0;onStart(id,marked);}
  return {
    beginWave(wave){
      if(wave===currentWave)return false;
      finish('new-wave');currentWave=wave;
      if(wave<EVENT_RULES.firstWave||wave===lastEventWave+1||random()>=EVENT_RULES.chance)return false;
      id=ids[Math.min(ids.length-1,Math.floor(random()*ids.length))];
      if(id==='awakening'&&graves.length<EVENT_RULES.graves){id=null;return false;}
      lastEventWave=wave;phase='scheduled';left=7+random()*5;return true;
    },
    update(dt){
      if(phase==='idle'||dt<=0)return;
      if(phase==='scheduled'||phase==='warning'){
        left-=dt;
        if(left>1e-9){age+=dt;return;}
        // Consume the exact boundary so a frame cannot shorten an event.
        const remainder=Math.max(0,-left);
        if(phase==='scheduled')enterWarning();else activate();
        if(remainder>1e-9)this.update(remainder);return;
      }
      age+=dt;left=Math.max(0,left-dt);
      if(id!=='awakening'){if(left<=1e-9)finish('expired');return;}
      spawnWait-=dt;
      if(queue.length&&spawnWait<=0){
        // Try another marked grave when one is crowded. The callback validates
        // collision, navigation and the shared living-enemy limit each time.
        for(let i=0;i<queue.length;i++)if(spawn(queue[i])){queue.splice(i,1);break;}
        spawnWait=EVENT_RULES.spawnInterval;
      }
      // The bonus window lasts the full duration, and every queued grave rises.
      if(!queue.length&&left<=1e-9)finish('completed');
    },
    endWave(){finish('wave-cleared');},
    reset(){finish('reset');currentWave=0;lastEventWave=-2;},
    active(kind){return phase==='active'&&id===kind;},
    speedMultiplier(e){return this.active('surge')&&walker(e)?1.2:1;},
    attackRate(e){return this.active('surge')&&walker(e)?1.2:1;},
    killReward(base){return phase==='active'?Math.round(base*1.2):base;},
    fogStrength(){return this.active('shroud')?Math.min(1,age/2,left/2):0;},
    // 0 = lights as normal, 1 = total blackout. A warning makes them flicker.
    darkness(){
      if(id!=='blackout')return 0;
      if(phase==='warning')return .45*Math.max(0,Math.sin(age*23)*Math.sin(age*7.3));
      return phase==='active'?Math.min(stutter(age/1.4),stutter(left/1.6)):0;
    },
    badge(){
      if(phase==='idle'||phase==='scheduled')return '';
      const def=WORLD_EVENTS[id],status=phase==='warning'?`BEGINS IN ${Math.ceil(left)}s`:id==='awakening'&&queue.length?`${Math.ceil(left)}s · ${queue.length} STILL RISING`:`${Math.ceil(left)}s`;
      return `<div class="worldEventBadge ${id}"><span class="eventSymbol" aria-hidden="true">${id==='shroud'?'≋':id==='surge'?'ϟ':id==='blackout'?'◐':'✝'}</span><div><strong>${def.name}</strong><b>${status}</b><small>${phase==='warning'?def.warning:def.effect}</small></div></div>`;
    },
    get id(){return id;},get phase(){return phase;},get timeLeft(){return left;},get age(){return age;},get wave(){return currentWave;},get lastEventWave(){return lastEventWave;},get marked(){return marked;},get pendingSpawns(){return queue.length;},
  };
}
