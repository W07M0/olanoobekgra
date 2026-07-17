# 0.6c Profile, Skin & Pet Fix

- Usunięto wywołanie starej funkcji Supabase `save_player_profile`.
- Zapis korzysta wyłącznie z `save_player_full_profile`.
- Render orbity skina jest zabezpieczony.
- Każdy pet z jajka dostaje gwarantowanie unikalny UID.
- Powtórka peta jest osobnym egzemplarzem w ekwipunku.
- Pet jest od razu zapisywany lokalnie i wysyłany do zapisu online.
- Starsze pety bez poprawnego UID/type są automatycznie normalizowane.
