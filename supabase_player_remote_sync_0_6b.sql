-- 0.6b — synchronizacja zmian administratora z grą gracza

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
