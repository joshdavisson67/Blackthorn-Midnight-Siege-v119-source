ALTER TABLE `leaderboard_scores` ADD `curse_rank` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboard_scores` ADD `curse_title` text DEFAULT 'Uncursed' NOT NULL;