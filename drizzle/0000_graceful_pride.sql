CREATE TABLE `leaderboard_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`wave` integer NOT NULL,
	`kills` integer NOT NULL,
	`duration` integer NOT NULL,
	`version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leaderboard_ranking_idx` ON `leaderboard_scores` (`score`,`wave`,`kills`,`created_at`);