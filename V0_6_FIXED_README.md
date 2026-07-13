# v0.6 Fixed — ważne

Ta paczka naprawia błędnie złożoną pierwszą paczkę v0.6.

Naprawiono:
- numer wersji pozostający na 0.5d,
- brakujące pola stanu minigier i kasyna,
- błąd renderowania mogący ukrywać Noob Coiny,
- bezpieczną migrację starego zapisu,
- wymuszenie pobrania nowych plików JS i CSS przez parametr cache.

Migracja nie zeruje `points`, `gems`, `coins`, petów, skinów ani innych elementów zapisu.
