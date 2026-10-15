import { env } from 'cloudflare:workers';
import { getLeaderboard, submitScore } from '../../../server/leaderboard.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return getLeaderboard(request,env.DB);}
export async function POST(request:Request){return submitScore(request,env.DB);}
