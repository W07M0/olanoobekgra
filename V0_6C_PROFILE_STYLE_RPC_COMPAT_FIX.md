# 0.6c Profile Style RPC Compatibility Fix

- Usunięto nieobsługiwane argumenty profile_frame i profile_background z wywołania save_player_profile.
- Ramka i tło pozostają w istniejącym p_save_data.
- Ranking odczytuje wygląd z save_data.
- Nie trzeba zmieniać funkcji SQL w Supabase.
