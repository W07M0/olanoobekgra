# Ola to Noobek — wersja 0.5c

Wersja techniczna. Rozgrywka i zapis graczy pozostają zgodne z wersją 0.4g.

## Struktura

```text
index.html
.nojekyll
css/
  styles.css
js/
  data.js
  core.js
  systems.js
  minigames.js
  integrations.js
  app.js
tests/
  smoke-test.html
DEPLOY_GITHUB.md
CHANGELOG.md
```

## Co znajduje się w modułach

- `data.js` — konfiguracja, zapis, dane petów, skinów, światów i patch notes.
- `core.js` — obliczenia, dźwięki, EXP, waluty i funkcje pomocnicze.
- `systems.js` — bossowie, światy, pety, skiny, sklep i renderowanie UI.
- `minigames.js` — Aim Lab, Parkour i Memory.
- `integrations.js` — kasyno, Supabase, ranking i feedback.
- `app.js` — nawigacja, przyciski, klawiatura, timery i uruchomienie gry.

## Ważne

Nie zmieniaj nazw ani położenia folderów bez poprawienia ścieżek w `index.html`.
Nie publikuj klucza Supabase `service_role`. Klucz publishable/anon używany przez grę może być dostępny w kodzie klienta.


## Sklep w 0.5a

- Ulepszenia podstawowe są kupowane za punkty i resetują się po rebirth.
- Ulepszenia permanentne są kupowane za diamenty lub Noob Coiny.
- Permanentne poziomy pozostają po rebirth.


## System petów 0.5b
Pety są zapisywane jako osobne egzemplarze z `uid`, poziomem, EXP i poziomem ewolucji. Stary zapis migruje automatycznie.


## Profile i admin 0.5c
Uruchom `supabase_profiles_admin_v0_5c.sql` i przeczytaj `ADMIN_SETUP.md`.
