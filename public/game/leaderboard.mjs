const PENDING_KEY='blackthorn-leaderboard-pending-v1',QUEUE_KEY='blackthorn-leaderboard-queue-v1',NAME_KEY='blackthorn-leaderboard-name';
import {CURRENT_VERSION} from './version.mjs?v=142';
import {curseTitle} from './curse.mjs?v=130';
import {usesSupabase,supabaseFetcher} from './leaderboard-supabase.mjs?v=132';
export const GAME_VERSION=String(CURRENT_VERSION);
export const REFRESH_INTERVAL=15000;
const formatTime=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
const cleanName=value=>value.normalize('NFKC').trim().replace(/\s+/gu,' ');
const retainedRun=value=>value?.stats&&typeof value.stats.id==='string'&&Number.isSafeInteger(value.stats.score);
function confirmedScore(data,submission){
  const entry=data?.entry;
  return data?.saved===true&&entry&&typeof entry.id==='string'&&typeof submission.id==='string'&&entry.id.toLowerCase()===submission.id.toLowerCase()&&Number.isSafeInteger(entry.rank)&&entry.rank>0&&
    entry.name===cleanName(submission.name)&&['score','wave','kills','duration','version'].every(key=>entry[key]===submission[key])&&
    (entry.curse_rank??entry.curseRank??0)===(submission.curseRank??0);
}
// GitHub Pages has no /api/leaderboard, so scores go to Supabase there.
export function createLeaderboard({document,fetcher=usesSupabase()?supabaseFetcher():(...args)=>fetch(...args),storage,onOpen=()=>{},onNewRun=()=>{},setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,requestTimeoutMs=10000}){
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  const el=id=>document.getElementById(id),modal=el('leaderboard'),form=el('scoreForm'),name=el('leaderboardName'),submit=el('leaderboardSubmit'),message=el('scoreSaveStatus'),body=el('leaderboardRows'),listStatus=el('leaderboardStatus'),picker=el('pendingRunPicker');
  const read=key=>{try{return storage?.getItem(key);}catch{return null;}},write=(key,value)=>{try{if(!storage)return false;if(value===null)storage.removeItem(key);else storage.setItem(key,value);return true;}catch{return false;}};
  let runs=[],pending=null,activeId=null,saving=false,storageBacked=false,loadSequence=0,lastSaved=null,returnFocus=null,refreshTimer=null,refreshController=null;
  // Keep the previous single-run key readable by older releases. The queue
  // retains every unsaved death snapshot, including a named, uncertain retry.
  let queued,legacy;
  try{queued=JSON.parse(read(QUEUE_KEY));}catch{}
  try{legacy=JSON.parse(read(PENDING_KEY));}catch{}
  for(const run of [...(Array.isArray(queued?.runs)?queued.runs:[]),legacy])if(retainedRun(run)&&!runs.some(r=>r.stats.id===run.stats.id))runs.push(run);
  const legacyCopy=runs.find(r=>r.stats.id===legacy?.stats?.id);
  if(legacyCopy&&!legacyCopy.submission&&legacy?.submission)legacyCopy.submission=legacy.submission;
  pending=runs.find(r=>r.stats.id===legacy?.stats?.id)||runs.find(r=>r.stats.id===queued?.selectedId)||runs.at(-1)||null;
  name.value=read(NAME_KEY)||'';
  function persist(){
    const queueSaved=write(QUEUE_KEY,runs.length?JSON.stringify({runs,selectedId:pending?.stats.id}):null);
    const legacySaved=write(PENDING_KEY,pending?JSON.stringify(pending):null);
    storageBacked=queueSaved||(runs.length<=1&&legacySaved);
  }
  if(runs.length)persist();
  function captureDraft(){if(pending&&!pending.submission)pending.draftName=name.value;}
  function showMessage(text,error=false){message.textContent=text;message.classList.toggle('saveError',error);}
  function retainedMessage(){return storageBacked?'This run is kept on this device for retry.':'Keep this tab open to retry; browser storage is unavailable.';}
  function renderForm(){
    const stats=pending?.stats;form.classList.toggle('hidden',!stats);el('runSummary').classList.toggle('hidden',!stats);
    el('pendingRunPickerLabel')?.classList.toggle('hidden',runs.length<2);
    if(picker){
      picker.replaceChildren();
      for(const run of runs){const option=document.createElement('option');option.value=run.stats.id;option.textContent=`${run.stats.score.toLocaleString()} score · Wave ${run.stats.wave}${run.submission?' · Retry':''}`;option.selected=run===pending;picker.appendChild(option);}
      picker.disabled=saving;
    }
    if(stats){
      el('runSummary').textContent=`${stats.score.toLocaleString()} SCORE · WAVE ${stats.wave} · ${stats.kills} KILLS · ${formatTime(stats.duration)} · CURSE ${stats.curseRank??0} / ${curseTitle(stats.curseRank??0)}`;
      name.value=pending.submission?.name??pending.draftName??read(NAME_KEY)??'';name.readOnly=saving||!!pending.submission;
      submit.disabled=saving;submit.textContent=pending.submission?'RETRY SAVING SCORE':'ADD MY SCORE';
    }
    el('leaderboardNewRun').classList.toggle('hidden',!activeId);
  }
  async function request(options){
    const controller=new AbortController(),abort=()=>controller.abort();let rejectAbort;
    const interrupted=new Promise((_,reject)=>{rejectAbort=reject;}),onAbort=()=>rejectAbort(new DOMException('Connection timed out.','AbortError'));
    controller.signal.addEventListener('abort',onAbort,{once:true});
    const timeout=setTimeout(abort,requestTimeoutMs);
    options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
    try{
      const perform=async()=>{
        if(controller.signal.aborted)throw new DOMException('Request cancelled.','AbortError');
        const response=await fetcher('/api/leaderboard',{...options,signal:controller.signal,credentials:'same-origin',cache:'no-store'});
        const access=response.status===401||response.status===403||response.redirected;
        let data;try{data=await response.json();}catch(cause){
          if(cause.name==='AbortError')throw cause;
          const error=new Error(access?'Scores could not be accessed. Reopen the shared game link and retry.':'The score service returned an unexpected response. Please retry.');error.status=response.status;throw error;
        }
        if(!response.ok){const error=new Error(typeof data?.error==='string'?data.error:access?'Scores could not be accessed. Reopen the shared game link and retry.':'Please try again.');error.status=response.status;throw error;}
        return data;
      };
      return await Promise.race([perform(),interrupted]);
    }finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',onAbort);options.signal?.removeEventListener('abort',abort);}
  }
  function cancelTimer(){if(refreshTimer!==null)clearTimer(refreshTimer);refreshTimer=null;}
  function stopRefresh(){cancelTimer();loadSequence++;refreshController?.abort();refreshController=null;el('leaderboardRefresh').disabled=false;}
  function scheduleRefresh(){if(modal.classList.contains('hidden')||document.hidden)return;refreshTimer=setTimer(()=>{refreshTimer=null;refresh();},REFRESH_INTERVAL);}
  async function refresh(){
    cancelTimer();refreshController?.abort();const controller=new AbortController();refreshController=controller;
    const sequence=++loadSequence;listStatus.textContent='Loading shared scores…';el('leaderboardRefresh').disabled=true;
    try{
      const data=await request({method:'GET',signal:controller.signal});if(sequence!==loadSequence)return;
      if(!Array.isArray(data?.entries))throw new Error('The shared leaderboard could not load. Please retry.');
      body.replaceChildren();for(const entry of data.entries){const row=document.createElement('tr');if(entry.id===lastSaved)row.className='myScore';for(const value of [entry.rank,entry.name,Number(entry.score).toLocaleString(),entry.wave,entry.kills,`C${entry.curse_rank??0} · ${entry.curse_title??curseTitle(entry.curse_rank??0)}`,formatTime(entry.duration)]){const cell=document.createElement('td');cell.textContent=String(value);row.appendChild(cell);}body.appendChild(row);}
      listStatus.textContent=data.entries.length?'Top 50 runs · Highest score first · Updates every 15s':'No scores yet. Be the first to survive the estate.';
    }catch(error){if(sequence===loadSequence)listStatus.textContent=body.children.length?'Could not refresh. Showing last scores; we’ll retry automatically.':error.name==='AbortError'?'Connection timed out. Use Refresh to try again.':error.message||'Scores could not load. Use Refresh to try again.';}
    finally{if(sequence===loadSequence){refreshController=null;el('leaderboardRefresh').disabled=false;scheduleRefresh();}}
  }
  function open(){returnFocus=document.activeElement;onOpen();modal.classList.remove('hidden');renderForm();if(pending&&!message.textContent)showMessage(pending.error?`${pending.error} ${retainedMessage()}`:'Add your name to share this run. Saving is optional.',!!pending.error);refresh();if(pending)name.focus();else el('leaderboardClose').focus();}
  function close(){captureDraft();if(runs.length)persist();stopRefresh();modal.classList.add('hidden');returnFocus?.focus?.();}
  function startRun(){activeId=globalThis.crypto.randomUUID();lastSaved=null;showMessage('');close();}
  function endRun({score,wave,kills,duration,curseRank=0}){
    if(!activeId)activeId=globalThis.crypto.randomUUID();captureDraft();
    let run=runs.find(r=>r.stats.id===activeId);
    if(!run){run={stats:{id:activeId,score:Math.max(0,Math.floor(score)),wave,kills,duration:Math.max(0,Math.floor(duration)),version:GAME_VERSION,curseRank},submission:null};runs.push(run);}
    pending=run;persist();showMessage(`Add your name to share this run. Saving is optional.${runs.length>1?(picker?' Earlier unsaved runs are available above.':' Earlier unsaved runs are kept for later.'):''}`);open();
  }
  async function save(event){
    event?.preventDefault();if(!pending||saving)return;
    const value=cleanName(name.value);
    if(!value||[...value].length>24||/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(value)){showMessage('Enter a name of 1–24 characters.',true);return;}
    const run=pending;run.draftName=value;run.error=null;if(!run.submission)run.submission={...run.stats,name:value};persist();saving=true;renderForm();submit.textContent='SAVING…';showMessage('Saving your run…');
    try{
      const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(run.submission)});
      if(!confirmedScore(result,run.submission))throw new Error('The server did not confirm this score. Please retry the same run.');
      lastSaved=result.entry.id;write(NAME_KEY,result.entry.name);runs=runs.filter(r=>r!==run);
      const selected=pending===run;if(selected)pending=runs.at(-1)||null;persist();
      if(selected)showMessage(`Saved! ${result.entry.name} is ranked #${result.entry.rank}.${runs.length?` ${runs.length} earlier unsaved run${runs.length===1?' remains':'s remain'} available to save.`:''}`);
      if(!modal.classList.contains('hidden'))refresh();
    }catch(error){
      if(error.status===400)run.submission=null;
      run.error=error.name==='AbortError'?'Connection timed out. Retry to save this same run.':error.message||'Could not save.';persist();
      if(pending===run)showMessage(`${run.error} ${retainedMessage()}`,true);
    }finally{saving=false;renderForm();}
  }
  picker?.addEventListener('change',()=>{if(saving)return;const run=runs.find(r=>r.stats.id===picker.value);if(!run)return;captureDraft();pending=run;persist();renderForm();showMessage(run.error?`${run.error} ${retainedMessage()}`:'Add your name to share this run. Saving is optional.',!!run.error);name.focus();});
  name.addEventListener('input',captureDraft);
  form.addEventListener('submit',save);el('leaderboardRefresh').addEventListener('click',refresh);el('leaderboardClose').addEventListener('click',close);el('leaderboardNewRun').addEventListener('click',()=>{close();onNewRun();});
  for(const id of ['leaderboardMenu','leaderboardPause'])el(id).addEventListener('click',open);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopRefresh();else if(!modal.classList.contains('hidden'))refresh();});
  return {startRun,endRun,open,close,refresh,save,get visible(){return !modal.classList.contains('hidden');}};
}
