# Ola to Noobek — wersja 0.6

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


## Poprawiona architektura 0.5c
Profil i panel admina znajdują się w `js/profile-admin.js`. Systemy gry pozostały niezmienione względem stabilnej wersji 0.5b.


## Ranking — zgodność wsteczna

Ranking punktów odczytuje najpierw tabelę `players`. Gdy nie ma tam jeszcze profili,
automatycznie pokazuje stare wpisy z tabeli `scores`.

Plik `supabase_migrate_old_scores_v0_5c.sql` pozwala jednorazowo przenieść stare wyniki
do nowej tabeli `players`.


## 0.5d — Polish & Overhaul
Nowe UI, poprawiona orbita petów, ulepszone skiny i uproszczone ustawienia.


## 0.6 — Minigames & Casino Rework

Minigry:
- Aim Lab, Noob Rider, Reflex i Brainrot Dodge,
- cooldown 30 sekund,
- nagrody zależne od wyniku,
- TOP 3 online po uruchomieniu `supabase_minigames_v0_6.sql`.

Kasyno:
- osobne żetony,
- paczka raz na godzinę,
- poziom kasyna i drogie ulepszenia,
- pakietowa wymiana na Noob Coiny lub diamenty,
- kurs Noob Coinów zmienia się od -10% do +10%.
