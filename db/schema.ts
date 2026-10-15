import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
// This table is shared by every game release. Never reset it when publishing.
export const leaderboardScores=sqliteTable('leaderboard_scores',{
  id:text('id').primaryKey(),
  name:text('name').notNull(),
  score:integer('score').notNull(),
  wave:integer('wave').notNull(),
  kills:integer('kills').notNull(),
  duration:integer('duration').notNull(),
  version:text('version').notNull(),
  curseRank:integer('curse_rank').notNull().default(0),
  curseTitle:text('curse_title').notNull().default('Uncursed'),
  createdAt:integer('created_at').notNull(),
},t=>[index('leaderboard_ranking_idx').on(t.score,t.wave,t.kills,t.createdAt)]);
