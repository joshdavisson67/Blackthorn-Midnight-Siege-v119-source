import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
import {createLeaderboard,GAME_VERSION,REFRESH_INTERVAL} from '../public/game/leaderboard.mjs';
import {getLeaderboard,submitScore} from '../server/leaderboard.mjs';
import {open,migrate} from './leaderboard-db.mjs';
const html=readFileSync(new URL('../public/game/index.html',import.meta.url),'utf8');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function clock(){let next=0;const tasks=new Map();return {tasks,setTimer(fn,delay){const id=++next;tasks.set(id,{fn,delay});return id;},clearTimer(id){tasks.delete(id);},run(){const [id,task]=tasks.entries().next().value||[];if(!task)return null;tasks.delete(id);task.fn();return task.delay;}};}
function fixture(fetcher,store=storage(),options={}){const {document}=parseHTML(html);let newRuns=0;const timer=clock();const board=createLeaderboard({document,storage:store,fetcher,onNewRun:()=>newRuns++,...timer,...options});return {board,document,store,timer,get newRuns(){return newRuns;}};}
test('independent anonymous visitors share real database scores and see new runs on automatic refresh',async()=>{
  const db=open();migrate(db);
  const url='https://blackthorn.example/api/leaderboard';
  const fetcher=async(path,options)=>{
    assert.equal(path,'/api/leaderboard');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
    const headers=new Headers(options.headers);assert(!headers.has('Authorization'));assert(!headers.has('oai-authenticated-user-id'));
    if(options.method==='POST'){headers.set('Origin',new URL(url).origin);headers.set('Sec-Fetch-Site','same-origin');}
    const request=new Request(url,{...options,headers});
    return options.method==='POST'?submitScore(request,db):getLeaderboard(request,db);
  };
  const a=fixture(fetcher),b=fixture(fetcher),rows=client=>client.document.getElementById('leaderboardRows');
  try{
    a.board.open();b.board.open();await settle();assert.equal(rows(a).children.length,0);assert.equal(a.timer.tasks.size,1);
    b.board.startRun();b.board.endRun({score:12000,wave:10,kills:90,duration:600});b.document.getElementById('leaderboardName').value='Second visitor';await b.board.save();await settle();
    assert.equal(rows(a).children.length,0,'Other visitors update on refresh rather than sharing local storage');
    assert.equal(a.document.getElementById('leaderboardName').value,'');assert.notEqual(a.store,b.store);
    assert.equal(a.timer.run(),REFRESH_INTERVAL);await settle();assert(rows(a).textContent.includes('Second visitor'));assert(rows(a).textContent.includes('12,000'));
    a.board.startRun();a.board.endRun({score:18000,wave:15,kills:130,duration:900});a.document.getElementById('leaderboardName').value='First visitor';await a.board.save();await settle();
    assert.equal(b.timer.run(),REFRESH_INTERVAL);await settle();assert.equal(rows(b).children.length,2);assert(rows(b).firstElementChild.textContent.includes('First visitor'));
    const entries=(await (await getLeaderboard(new Request(url),db)).json()).entries;assert.equal(entries.length,2);assert(entries.every(e=>e.version===GAME_VERSION));assert.deepEqual(entries.map(e=>e.rank),[1,2]);
  }finally{a.board.close();b.board.close();db.sqlite.close();}
});
test('refresh pauses in hidden tabs and closed panels; stale or closed requests cannot replace current scores',async()=>{
  let deferred=false,calls=0;const requests=[];
  const entry=name=>({id:name,name,rank:1,score:100,wave:1,kills:1,duration:10});
  const a=fixture(async(path,options)=>{calls++;if(!deferred)return Response.json({entries:[entry('Initial')]});return new Promise(resolve=>requests.push({resolve,signal:options.signal}));});
  a.board.open();await settle();assert.equal(calls,1);assert.equal(a.timer.tasks.size,1);
  Object.defineProperty(a.document,'hidden',{value:true,writable:true,configurable:true});
  a.document.dispatchEvent(new a.document.defaultView.Event('visibilitychange'));assert.equal(a.timer.tasks.size,0);assert.equal(a.timer.run(),null);
  a.document.hidden=false;a.document.dispatchEvent(new a.document.defaultView.Event('visibilitychange'));await settle();assert.equal(calls,2);assert.equal(a.timer.tasks.size,1);
  deferred=true;const old=a.board.refresh(),current=a.board.refresh();assert(requests[0].signal.aborted);assert.equal(a.timer.tasks.size,0);
  requests[1].resolve(Response.json({entries:[entry('Current')]}));await current;
  requests[0].resolve(Response.json({entries:[entry('Stale')]}));await old;
  assert(a.document.getElementById('leaderboardRows').textContent.includes('Current'));assert(!a.document.getElementById('leaderboardRows').textContent.includes('Stale'));assert.equal(a.timer.tasks.size,1);
  const closing=a.board.refresh();a.board.close();assert(requests[2].signal.aborted);requests[2].resolve(Response.json({entries:[entry('Closed')]}));await closing;
  assert(!a.board.visible);assert.equal(a.timer.tasks.size,0);assert(!a.document.getElementById('leaderboardRows').textContent.includes('Closed'));
});
test('failed refresh retains last scores and retries; an access error keeps the exact run for an explicit save retry',async()=>{
  let getFailure=false,postFailure=true,posts=[];
  const a=fixture(async(path,options)=>{
    if(options.method==='GET')return getFailure?Response.json({error:'Temporarily unavailable'},{status:503}):Response.json({entries:[{id:'existing',name:'Existing survivor',rank:1,score:100,wave:1,kills:1,duration:10}]});
    const run=JSON.parse(options.body);posts.push(run);return postFailure?new Response('<html>Access denied</html>',{status:403,headers:{'Content-Type':'text/html'}}):Response.json({entry:{...run,rank:2},saved:true});
  });
  a.board.open();await settle();getFailure=true;assert.equal(a.timer.run(),REFRESH_INTERVAL);await settle();assert(a.document.getElementById('leaderboardRows').textContent.includes('Existing survivor'));assert(a.document.getElementById('leaderboardStatus').textContent.includes('Showing last scores'));assert.equal(a.timer.tasks.size,1);
  getFailure=false;a.timer.run();await settle();assert(a.document.getElementById('leaderboardStatus').textContent.includes('Updates every 15s'));
  a.board.startRun();a.board.endRun({score:50,wave:1,kills:1,duration:20});a.document.getElementById('leaderboardName').value='Visitor';await a.board.save();assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Reopen the shared game link'));assert(!a.document.getElementById('scoreForm').classList.contains('hidden'));
  a.timer.run();await settle();assert.equal(posts.length,1,'Automatic refresh cannot automatically resubmit a score');postFailure=false;await a.board.save();assert.deepEqual(posts[0],posts[1]);a.board.close();
});
test('death snapshot, optional name, failed request/reload retry, one payload per run, remembered name and safe display',async()=>{let fail=true,posted=[];const fetcher=async(path,options)=>{assert.equal(path,'/api/leaderboard');if(options.method==='POST'){const body=JSON.parse(options.body);posted.push(body);if(fail)throw new Error('Connection lost');return Response.json({entry:{...body,rank:2},saved:true});}return Response.json({entries:[{id:'another',name:'<img src=x onerror=alert(1)>',rank:1,score:20000,wave:21,kills:300,duration:1000}]});};const a=fixture(fetcher);a.board.startRun();assert(!a.board.visible);a.board.endRun({score:12000,wave:20,kills:150,duration:615.8});assert(a.board.visible);assert(a.document.getElementById('runSummary').textContent.includes('12,000'));assert.equal(posted.length,0,'Opening the death screen must not submit without user action');a.document.getElementById('leaderboardName').value=' Josh ';await a.board.save();assert.equal(posted.length,1);assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Connection lost'));const b=fixture(fetcher,a.store);b.board.open();assert.equal(b.document.getElementById('leaderboardName').value,'Josh');fail=false;await b.board.save();await settle();assert.deepEqual(posted[0],posted[1]);assert.equal(posted[1].duration,615);assert(b.document.getElementById('scoreSaveStatus').textContent.includes('ranked #2'));assert(b.document.getElementById('scoreForm').classList.contains('hidden'));assert.equal(b.document.querySelector('#leaderboardRows img'),null,'Names render as text, never HTML');assert(b.document.getElementById('leaderboardRows').textContent.includes('<img'));await b.board.save();assert.equal(posted.length,2,'No second score after successful save');assert.equal(fixture(fetcher,a.store).document.getElementById('leaderboardName').value,'Josh');});
test('invalid names, duplicate click suppression, new-run snapshot isolation and storage denial',async()=>{let finish,posts=0;const a=fixture(async(path,options)=>{if(options.method==='GET')return Response.json({entries:[]});posts++;return new Promise(resolve=>finish=()=>resolve(Response.json({entry:{...JSON.parse(options.body),rank:1},saved:true})));});a.board.startRun();a.board.endRun({score:100,wave:1,kills:1,duration:12});a.document.getElementById('leaderboardName').value='<bad>';await a.board.save();assert.equal(posts,0);a.document.getElementById('leaderboardName').value='Josh';const saving=a.board.save();await a.board.save();assert.equal(posts,1);a.board.startRun();a.board.endRun({score:500,wave:2,kills:5,duration:60});finish();await saving;assert(a.document.getElementById('runSummary').textContent.includes('500'),'Finishing old request cannot erase new death snapshot');const denied={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};const b=fixture(async()=>Response.json({entries:[]}),denied);b.board.startRun();b.board.endRun({score:0,wave:0,kills:0,duration:1});assert(b.board.visible);b.board.close();assert(!b.board.visible);});
test('curse rank/title appear in the death snapshot and shared board and survive an exact reload retry',async()=>{
  const db=open();migrate(db);let fail=true,posted=[];const url='https://blackthorn.example/api/leaderboard';
  const fetcher=async(path,options)=>{if(options.method==='GET')return getLeaderboard(new Request(url),db);const payload=JSON.parse(options.body);posted.push(payload);if(fail)throw Error('Offline');return submitScore(new Request(url,{...options,headers:{'Content-Type':'application/json',Origin:new URL(url).origin}}),db);};
  const a=fixture(fetcher);let b;
  try{
    a.board.startRun();a.board.endRun({score:55000,wave:31,kills:300,duration:1000,curseRank:6});assert(a.document.getElementById('runSummary').textContent.includes('CURSE 6 / Endless Corruption'));assert.equal(posted.length,0);a.document.getElementById('leaderboardName').value='Curse survivor';await a.board.save();a.board.close();
    b=fixture(fetcher,a.store);b.board.open();assert(b.document.getElementById('runSummary').textContent.includes('CURSE 6 / Endless Corruption'));fail=false;await b.board.save();await settle();assert.deepEqual(posted[0],posted[1]);assert.equal(posted[1].curseRank,6);assert(b.document.getElementById('leaderboardRows').textContent.includes('C6 · Endless Corruption'));assert.equal(b.document.querySelector('#leaderboardRows tr').children.length,7);assert.equal((await(await getLeaderboard(new Request(url),db)).json()).entries.length,1);
  }finally{a.board.close();b?.board.close();db.sqlite.close();}
});
test('failed scores survive later deaths and reloads, and each selected run saves exactly once',async()=>{
  const db=open();migrate(db);const store=storage(),posts=[],url='https://blackthorn.example/api/leaderboard';let unavailable=true;
  const fetcher=async(_,options)=>{
    if(options.method==='GET')return getLeaderboard(new Request(url),db);
    posts.push(JSON.parse(options.body));
    if(unavailable)return Response.json({error:'Save temporarily unavailable'},{status:503});
    return submitScore(new Request(url,{...options,headers:{'Content-Type':'application/json',Origin:new URL(url).origin}}),db);
  };
  const a=fixture(fetcher,store);let b,c;
  try{
    a.board.startRun();a.board.endRun({score:12000,wave:10,kills:50,duration:600});a.document.getElementById('leaderboardName').value='First survivor';await a.board.save();
    const first=posts[0];a.board.startRun();a.board.endRun({score:25000,wave:15,kills:120,duration:900});a.document.getElementById('leaderboardName').value='Second survivor';a.board.close();
    assert.equal(JSON.parse(store.getItem('blackthorn-leaderboard-queue-v1')).runs.length,2);
    b=fixture(fetcher,store);b.board.open();assert(b.document.getElementById('runSummary').textContent.includes('25,000'));assert.equal(b.document.getElementById('leaderboardName').value,'Second survivor');
    assert(!b.document.getElementById('pendingRunPickerLabel').classList.contains('hidden'));
    const picker=b.document.getElementById('pendingRunPicker');for(const option of picker.children)option.selected=false;
    Array.from(picker.children).find(o=>o.value===first.id).selected=true;
    picker.dispatchEvent(new b.document.defaultView.Event('change'));
    assert(b.document.getElementById('runSummary').textContent.includes('12,000'));assert.equal(b.document.getElementById('leaderboardName').value,'First survivor');
    assert.equal(posts.length,1,'Changing run selection cannot submit it');unavailable=false;await b.board.save();assert.deepEqual(posts[1],first);
    assert(b.document.getElementById('runSummary').textContent.includes('25,000'));await b.board.save();await settle();
    const entries=(await(await getLeaderboard(new Request(url),db)).json()).entries;assert.equal(entries.length,2);assert.deepEqual(entries.map(e=>e.score),[25000,12000]);
    assert.equal(store.getItem('blackthorn-leaderboard-queue-v1'),null);assert.equal(store.getItem('blackthorn-leaderboard-pending-v1'),null);
    c=fixture(fetcher,store);c.board.open();assert(c.document.getElementById('scoreForm').classList.contains('hidden'));await c.board.save();assert.equal(posts.length,3);
  }finally{a.board.close();b?.board.close();c?.board.close();db.sqlite.close();}
});
test('a legacy named retry preserves its UUID and old game version, including canonical uppercase UUID replies',async()=>{
  const db=open();migrate(db);const store=storage(),url='https://blackthorn.example/api/leaderboard';
  const stats={id:crypto.randomUUID().toUpperCase(),score:18000,wave:10,kills:70,duration:640,version:'19'},submission={...stats,name:'  Ｌｅｇａｃｙ   survivor  '};
  const post=options=>submitScore(new Request(url,{...options,headers:{'Content-Type':'application/json',Origin:new URL(url).origin}}),db);
  await post({method:'POST',body:JSON.stringify(submission)});store.setItem('blackthorn-leaderboard-pending-v1',JSON.stringify({stats,submission}));store.setItem('blackthorn-leaderboard-queue-v1',JSON.stringify({runs:[{stats,submission:null}],selectedId:stats.id}));let received;
  const a=fixture(async(_,options)=>{if(options.method==='GET')return getLeaderboard(new Request(url),db);received=JSON.parse(options.body);return post(options);},store);
  try{a.board.open();await a.board.save();assert.deepEqual(received,submission);assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Saved!'));assert.equal((await(await getLeaderboard(new Request(url),db)).json()).entries.length,1);assert.equal(store.getItem('blackthorn-leaderboard-pending-v1'),null);}finally{a.board.close();db.sqlite.close();}
});
test('unexpected or mismatched save responses never discard the run or falsely announce success',async()=>{
  let mode=0,posts=[];const a=fixture(async(_,options)=>{
    if(options.method==='GET')return Response.json({entries:[]});const run=JSON.parse(options.body);posts.push(run);
    const replies=[{saved:true,entry:{}},{saved:true,entry:{...run,id:crypto.randomUUID(),rank:1}},{saved:true,entry:{...run,score:run.score+1,rank:1}},{saved:false,entry:{...run,rank:1}},{entry:{...run,rank:1}}];
    return Response.json(replies[mode]??{saved:true,entry:{...run,rank:1}});
  });
  try{
    a.board.startRun();a.board.endRun({score:1000,wave:5,kills:15,duration:120});a.document.getElementById('leaderboardName').value='Receipt survivor';
    for(mode=0;mode<5;mode++){await a.board.save();assert(a.document.getElementById('scoreSaveStatus').textContent.includes('did not confirm'));assert(!a.document.getElementById('scoreForm').classList.contains('hidden'));assert(!a.document.getElementById('leaderboardSubmit').disabled);assert(a.store.getItem('blackthorn-leaderboard-pending-v1'));assert.equal(a.store.getItem('blackthorn-leaderboard-name'),null);}
    await a.board.save();assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Saved!'));assert(posts.every(p=>JSON.stringify(p)===JSON.stringify(posts[0])));assert.equal(a.store.getItem('blackthorn-leaderboard-pending-v1'),null);
  }finally{a.board.close();}
});
test('timeouts release Saving even if fetch or its body ignores abort; late commits retry without duplicates',async()=>{
  for(const blocked of ['fetch','body']){
    const db=open();migrate(db);const url='https://blackthorn.example/api/leaderboard',posts=[];let stalled=true,finish;
    const a=fixture(async(_,options)=>{
      if(options.method==='GET')return getLeaderboard(new Request(url),db);const run=JSON.parse(options.body);posts.push(run);
      if(stalled){if(blocked==='fetch')return new Promise(resolve=>{finish=resolve;});return {ok:true,status:200,json:()=>new Promise(resolve=>{finish=resolve;})};}
      return submitScore(new Request(url,{...options,headers:{'Content-Type':'application/json',Origin:new URL(url).origin}}),db);
    },storage(),{requestTimeoutMs:30});
    try{
      a.board.startRun();a.board.endRun({score:15000,wave:10,kills:80,duration:600});a.document.getElementById('leaderboardName').value='Timeout survivor';await a.board.save();
      assert(a.document.getElementById('scoreSaveStatus').textContent.includes('timed out'));assert(!a.document.getElementById('leaderboardSubmit').disabled);const retained=JSON.parse(a.store.getItem('blackthorn-leaderboard-pending-v1')).submission;
      const late=await submitScore(new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(url).origin},body:JSON.stringify(retained)}),db);
      finish(blocked==='fetch'?late:await late.json());await settle();assert(!a.document.getElementById('scoreForm').classList.contains('hidden'),'A late response cannot erase the retained retry');
      stalled=false;await a.board.save();assert.deepEqual(posts[0],posts[1]);assert.equal((await(await getLeaderboard(new Request(url),db)).json()).entries.length,1);assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Saved!'));
    }finally{a.board.close();db.sqlite.close();}
  }
});
test('storage denial gives a truthful retry instruction and valid supplementary Unicode names save',async()=>{
  const denied={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};let posts=0;
  const a=fixture(async(_,options)=>options.method==='GET'?Response.json({entries:[]}):Response.json({error:'Offline'},{status:503}),denied);
  try{a.board.startRun();a.board.endRun({score:100,wave:1,kills:1,duration:20});a.document.getElementById('leaderboardName').value='Survivor';await a.board.save();assert(a.document.getElementById('scoreSaveStatus').textContent.includes('Keep this tab open'));assert(!a.document.getElementById('scoreForm').classList.contains('hidden'));}finally{a.board.close();}
  const b=fixture(async(_,options)=>{if(options.method==='GET')return Response.json({entries:[]});posts++;return Response.json({entry:{...JSON.parse(options.body),rank:1},saved:true});});
  try{b.board.startRun();b.board.endRun({score:100,wave:1,kills:1,duration:20});b.document.getElementById('leaderboardName').value='🧟'.repeat(25);await b.board.save();assert.equal(posts,0);b.document.getElementById('leaderboardName').value='🧟'.repeat(24);await b.board.save();assert.equal(posts,1);assert(b.document.getElementById('scoreSaveStatus').textContent.includes('Saved!'));}finally{b.board.close();}
});
test('a cached earlier leaderboard page without the new run picker can still submit a score',async()=>{
  const {document}=parseHTML(html);document.getElementById('pendingRunPickerLabel').remove();
  const timer=clock(),store=storage();let posts=0;
  const board=createLeaderboard({document,storage:store,...timer,fetcher:async(_,options)=>{if(options.method==='GET')return Response.json({entries:[]});posts++;return Response.json({saved:true,entry:{...JSON.parse(options.body),rank:1}});}});
  try{board.startRun();board.endRun({score:100,wave:1,kills:1,duration:20});document.getElementById('leaderboardName').value='Cached survivor';await board.save();assert.equal(posts,1);assert(document.getElementById('scoreSaveStatus').textContent.includes('Saved!'));}finally{board.close();}
});
