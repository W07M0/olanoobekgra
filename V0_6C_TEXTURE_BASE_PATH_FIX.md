# 0.6c Texture Base Path Fix

- Ścieżki tekstur są liczone względem `js/textures.js`, a nie bieżącej strony.
- Test w katalogu `/tests/` nie kieruje już do `/tests/assets/`.
- Diagnostyka pokazuje pełny URL i kod HTTP każdego pliku.
- Działa na GitHub Pages także w repozytorium podfolderowym.
