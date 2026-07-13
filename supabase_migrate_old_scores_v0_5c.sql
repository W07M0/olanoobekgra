-- Opcjonalna migracja starych wyników z tabeli scores do players.
-- Można uruchomić po podstawowym SQL 0.5c.
insert into public.players(
  player_id, player_name, best_score, level, rebirths,
  game_version, created_at, last_seen, name_changed_at
)
select
  s.player_id,
  left(trim(s.player_name),16),
  greatest(0,s.score),
  1,
  0,
  'legacy',
  coalesce(s.updated_at,now()),
  coalesce(s.updated_at,now()),
  coalesce(s.updated_at,now())
from public.scores s
where s.player_id is not null
on conflict(player_id) do update set
  player_name=excluded.player_name,
  best_score=greatest(public.players.best_score,excluded.best_score),
  last_seen=greatest(public.players.last_seen,excluded.last_seen);
