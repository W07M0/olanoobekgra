# Konfiguracja administratora 0.5c

1. Uruchom `supabase_feedback.sql`, jeśli feedback nie był wcześniej instalowany.
2. Uruchom `supabase_profiles_admin_v0_5c.sql`.
3. W Supabase przejdź do **Authentication → Users**.
4. Utwórz użytkownika administratora z e-mailem i hasłem.
5. Skopiuj jego UUID.
6. Uruchom:

```sql
insert into public.admin_users(user_id)
values ('TU_WKLEJ_UUID')
on conflict do nothing;
```

Przycisk logowania w grze nie tworzy konta. Nie umieszczaj hasła ani klucza `service_role` w repozytorium.
