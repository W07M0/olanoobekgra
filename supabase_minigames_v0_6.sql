
create table if not exists public.minigame_scores (
 player_id uuid not null,
 player_name text not null,
 game text not null check (game in ('aim','parkour','reflex','dodge')),
 score bigint not null default 0 check (score >= 0),
 updated_at timestamptz not null default now(),
 primary key(player_id,game)
);

alter table public.minigame_scores enable row level security;

drop policy if exists "Public minigame leaderboard read" on public.minigame_scores;
create policy "Public minigame leaderboard read"
on public.minigame_scores for select to anon,authenticated using(true);

grant select on public.minigame_scores to anon,authenticated;
revoke insert,update,delete on public.minigame_scores from anon,authenticated;

create or replace function public.submit_minigame_score(
 p_player_id uuid,p_player_name text,p_game text,p_score bigint
)
returns void language plpgsql security definer set search_path=public
as $$
declare clean_name text:=left(trim(p_player_name),16);
begin
 if p_game not in ('aim','parkour','reflex','dodge') then raise exception 'Nieprawidłowa minigra';end if;
 if p_score<0 or p_score>1000000000 then raise exception 'Nieprawidłowy wynik';end if;
 if length(clean_name)<3 then raise exception 'Nieprawidłowy nick';end if;
 insert into public.minigame_scores(player_id,player_name,game,score,updated_at)
 values(p_player_id,clean_name,p_game,p_score,now())
 on conflict(player_id,game) do update set
  player_name=excluded.player_name,
  score=greatest(public.minigame_scores.score,excluded.score),
  updated_at=now();
end$$;

grant execute on function public.submit_minigame_score(uuid,text,text,bigint) to anon,authenticated;
create index if not exists minigame_scores_game_score_idx on public.minigame_scores(game,score desc);
