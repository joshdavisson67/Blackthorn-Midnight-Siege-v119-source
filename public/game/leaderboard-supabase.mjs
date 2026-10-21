// Shared scores for the GitHub Pages build. Pages only serves static files, so
// the board lives in Supabase instead of the Cloudflare /api/leaderboard route.
// Database setup: supabase/leaderboard.sql. The publishable key is meant to be
// public; players can only call the two leaderboard functions, never the table.
export const SUPABASE_LEADERBOARD=Object.freeze({
  url:'https://rtstwkgwvxcmglxbbbyq.supabase.co',
  key:'sb_publishable_W2ol9-EXp3fHwFwZfDtO4w_cGYfFmH0'
});
export function usesSupabase(location=globalThis.location){return /\.github\.io$/i.test(location?.hostname??'');}
const reply=(data,status)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
// Returns a fetch stand-in for '/api/leaderboard' that answers in the same
// shape as server/leaderboard.mjs, so the leaderboard UI needs no changes.
export function supabaseFetcher({url,key}=SUPABASE_LEADERBOARD,fetcher=(...args)=>fetch(...args)){
  return async(path,options={})=>{
    const posting=options.method==='POST';
    const body=posting?JSON.stringify({run:JSON.parse(options.body)}):'{}';
    const response=await fetcher(`${url}/rest/v1/rpc/${posting?'submit_score':'get_leaderboard'}`,{
      method:'POST',signal:options.signal,cache:'no-store',body,
      headers:{apikey:key,'Content-Type':'application/json',Accept:'application/json'}
    });
    let data=null;try{data=await response.json();}catch(cause){if(cause?.name==='AbortError')throw cause;}
    if(response.ok)return reply(posting?data:{entries:Array.isArray(data)?data:null},response.status);
    // Messages from our own validation (PT4xx) are written for players; other
    // database errors are not, so they get the original server's wording.
    const own=typeof data?.code==='string'&&/^PT4\d\d$/.test(data.code)&&typeof data.message==='string';
    const fallback=posting?'The score could not be saved. Please retry; this run will only be counted once.':'The leaderboard could not load. Please try again.';
    return reply({error:own?data.message:fallback},own?response.status:503);
  };
}
