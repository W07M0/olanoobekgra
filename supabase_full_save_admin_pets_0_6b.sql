-- Ultimate Noob Clicker 0.6b
-- Pełna synchronizacja zapisu oraz bezpieczna edycja profilu przez administratora.

alter table public.players
 add column if not exists save_data jsonb not null default '{}'::jsonb;

create or replace function public.save_player_full_profile(
 p_player_id uuid,
 p_player_name text,
 p_best_score bigint,
 p_level integer,
 p_rebirths integer,
 p_game_version text,
 p_save_data jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
 clean_name text:=left(regexp_replace(trim(p_player_name),'\s+',' ','g'),16);
 old_name text;
 old_changed timestamptz;
begin
 if length(clean_name)<3 then
  raise exception 'Nick jest za krótki';
 end if;

 if lower(clean_name) in('admin','administrator','developer','system','moderator','supabase') then
  raise exception 'Nazwa zarezerwowana';
 end if;

 select player_name,name_changed_at
 into old_name,old_changed
 from public.players
 where player_id=p_player_id;

 if old_name is not null
    and old_name<>clean_name
    and now()-old_changed<interval '1 hour' then
  raise exception 'Nick można zmienić raz na godzinę';
 end if;

 insert into public.players(
  player_id,player_name,best_score,level,rebirths,game_version,
  save_data,last_seen,name_changed_at
 )
 values(
  p_player_id,clean_name,greatest(0,p_best_score),greatest(1,p_level),
  greatest(0,p_rebirths),left(p_game_version,16),
  coalesce(p_save_data,'{}'::jsonb),now(),now()
 )
 on conflict(player_id) do update set
  player_name=excluded.player_name,
  best_score=greatest(public.players.best_score,excluded.best_score),
  level=greatest(1,excluded.level),
  rebirths=greatest(0,excluded.rebirths),
  game_version=excluded.game_version,
  save_data=excluded.save_data,
  last_seen=now(),
  name_changed_at=case
   when public.players.player_name<>excluded.player_name then now()
   else public.players.name_changed_at
  end;
end
$$;

grant execute on function public.save_player_full_profile(
 uuid,text,bigint,integer,integer,text,jsonb
) to anon,authenticated;

create or replace function public.admin_get_player_full_profile(
 p_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 result jsonb;
begin
 if not public.is_admin_user(auth.uid()) then
  raise exception 'Brak uprawnień';
 end if;

 select to_jsonb(p)
 into result
 from public.players p
 where p.player_id=p_player_id;

 return result;
end
$$;

grant execute on function public.admin_get_player_full_profile(uuid)
to authenticated;

create or replace function public.admin_update_player_full_profile(
 p_player_id uuid,
 p_player_name text,
 p_save_data jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
 clean_name text:=left(regexp_replace(trim(p_player_name),'\s+',' ','g'),16);
 new_score bigint:=greatest(0,coalesce((p_save_data->>'points')::bigint,0));
 new_level integer:=greatest(1,coalesce((p_save_data->>'level')::integer,1));
 new_rebirths integer:=greatest(0,coalesce((p_save_data->>'rebirths')::integer,0));
begin
 if not public.is_admin_user(auth.uid()) then
  raise exception 'Brak uprawnień';
 end if;

 if length(clean_name)<3 then
  raise exception 'Nick jest za krótki';
 end if;

 update public.players
 set player_name=clean_name,
     best_score=new_score,
     level=new_level,
     rebirths=new_rebirths,
     save_data=coalesce(p_save_data,'{}'::jsonb),
     last_seen=now()
 where player_id=p_player_id;

 if not found then
  raise exception 'Nie znaleziono gracza';
 end if;

 insert into public.admin_actions(
  admin_user_id,action_type,target_id,details
 )
 values(
  auth.uid(),'player_full_profile_edit',p_player_id::text,
  jsonb_build_object(
   'equipped',coalesce(p_save_data->'equipped','[]'::jsonb),
   'level',new_level,
   'rebirths',new_rebirths
  )
 );
end
$$;

grant execute on function public.admin_update_player_full_profile(
 uuid,text,jsonb
) to authenticated;


-- Gracz może pobierać wyłącznie swój własny pełny zapis.
create or replace function public.get_player_full_profile(
 p_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 result jsonb;
begin
 select jsonb_build_object(
  'player_id',p.player_id,
  'player_name',p.player_name,
  'save_data',p.save_data,
  'updated_at',p.last_seen,
  'last_seen',p.last_seen
 )
 into result
 from public.players p
 where p.player_id=p_player_id;

 return result;
end
$$;

grant execute on function public.get_player_full_profile(uuid)
to anon,authenticated;
