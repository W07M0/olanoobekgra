# Konfiguracja admina 0.5c

1. Supabase → Authentication → Users → utwórz użytkownika administratora.
2. Skopiuj UUID użytkownika.
3. Uruchom `supabase_profiles_admin_v0_5c.sql`.
4. Uruchom:

```sql
insert into public.admin_users(user_id)
values ('TU_WKLEJ_UUID')
on conflict do nothing;
```

Panel administratora używa Supabase Auth. Nie umieszczaj hasła ani klucza `service_role` w repozytorium.
