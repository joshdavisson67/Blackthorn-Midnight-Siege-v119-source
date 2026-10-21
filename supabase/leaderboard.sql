-- Blackthorn shared leaderboard for the GitHub Pages build.
-- Run once in the Supabase SQL Editor. Safe to re-run: it never deletes scores.
--
-- Players can't touch the table directly. The game only calls the two
-- functions below, which validate every run the same way the original
-- Cloudflare server did (server/leaderboard.mjs).

-- The first test table from setup is replaced by leaderboard_scores.
drop table if exists scores;

create table if not exists leaderboard_scores (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 24),
  score int not null check (score between 0 and 1000000000),
  wave int not null check (wave between 0 and 10000),
  kills int not null check (kills between 0 and 10000000),
  duration int not null check (duration between 0 and 604800),
  version text not null check (version ~ '^\d{1,5}$'),
  curse_rank int not null default 0 check (curse_rank between 0 and 25),
  curse_title text not null default 'Uncursed',
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_ranking_idx
  on leaderboard_scores (score desc, wave desc, kills desc, created_at asc, id asc);

-- Row level security with no policies: no direct reads or writes.
alter table leaderboard_scores enable row level security;

-- Must match curseTitle() in public/game/curse.mjs.
create or replace function blackthorn_curse_title(rank int)
returns text language sql immutable set search_path = public as $$
  select coalesce(
    (array['Uncursed','The Whispered','The Marked','The Forsaken','The Damned','Blackthorn''s Chosen'])[rank + 1],
    'Endless Corruption');
$$;

-- Top 50, highest score first; ties favor higher waves, then kills, then the earlier run.
create or replace function get_leaderboard()
returns table (rank bigint, id uuid, name text, score int, wave int, kills int,
               duration int, version text, curse_rank int, curse_title text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by s.score desc, s.wave desc, s.kills desc, s.created_at asc, s.id asc),
         s.id, s.name, s.score, s.wave, s.kills, s.duration, s.version, s.curse_rank, s.curse_title, s.created_at
  from leaderboard_scores s
  order by s.score desc, s.wave desc, s.kills desc, s.created_at asc, s.id asc
  limit 50;
$$;

-- Saves one finished run. Retrying the same run id never counts it twice.
create or replace function submit_score(run jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  run_id uuid;
  clean_name text;
  nums int[];
  key text;
  value jsonb;
  rank_value int := 0;
  saved leaderboard_scores;
  placement bigint;
begin
  if run is null or jsonb_typeof(run) <> 'object' then
    raise sqlstate 'PT400' using message = 'The score submission is invalid.';
  end if;

  if jsonb_typeof(run->'id') is distinct from 'string'
     or (run->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
  end if;
  run_id := lower(run->>'id')::uuid;

  if jsonb_typeof(run->'name') is distinct from 'string' then
    raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
  end if;
  clean_name := regexp_replace(btrim(normalize(run->>'name', NFKC)), '\s+', ' ', 'g');
  if char_length(clean_name) not between 1 and 24
     or clean_name ~ '[<>\u0001-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]' then
    raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
  end if;

  foreach key in array array['score','wave','kills','duration'] loop
    value := run->key;
    if jsonb_typeof(value) is distinct from 'number' or (value::text)::numeric <> trunc((value::text)::numeric) then
      raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
    end if;
  end loop;
  if (run->>'score')::numeric not between 0 and 1000000000
     or (run->>'wave')::numeric not between 0 and 10000
     or (run->>'kills')::numeric not between 0 and 10000000
     or (run->>'duration')::numeric not between 0 and 604800 then
    raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
  end if;
  nums := array[(run->>'score')::int, (run->>'wave')::int, (run->>'kills')::int, (run->>'duration')::int];

  if jsonb_typeof(run->'version') is distinct from 'string' or (run->>'version') !~ '^\d{1,5}$' then
    raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
  end if;

  -- Older saved runs have no curse data. The title is always the server's own.
  if run ? 'curseRank' and jsonb_typeof(run->'curseRank') <> 'null' then
    value := run->'curseRank';
    if jsonb_typeof(value) <> 'number' or (value::text)::numeric <> trunc((value::text)::numeric)
       or (value::text)::numeric not between 0 and 25 then
      raise sqlstate 'PT400' using message = 'Use a name of 1-24 characters and a valid completed run.';
    end if;
    rank_value := (value::text)::int;
  end if;

  insert into leaderboard_scores (id, name, score, wave, kills, duration, version, curse_rank, curse_title)
  values (run_id, clean_name, nums[1], nums[2], nums[3], nums[4], run->>'version', rank_value, blackthorn_curse_title(rank_value))
  on conflict (id) do nothing;

  select * into saved from leaderboard_scores where leaderboard_scores.id = run_id;
  if saved.name <> clean_name or saved.score <> nums[1] or saved.wave <> nums[2] or saved.kills <> nums[3]
     or saved.duration <> nums[4] or saved.version <> run->>'version' or saved.curse_rank <> rank_value then
    raise sqlstate 'PT409' using message = 'This run was already submitted with different details.';
  end if;

  select r.rank into placement from (
    select s.id, row_number() over (order by s.score desc, s.wave desc, s.kills desc, s.created_at asc, s.id asc) as rank
    from leaderboard_scores s) r
  where r.id = run_id;

  return jsonb_build_object('saved', true, 'entry', to_jsonb(saved) || jsonb_build_object('rank', placement));
end;
$$;

revoke all on function get_leaderboard() from public;
revoke all on function submit_score(jsonb) from public;
grant execute on function get_leaderboard() to anon, authenticated;
grant execute on function submit_score(jsonb) to anon, authenticated;
