# Publikacja na GitHub Pages

## Aktualizacja obecnego repozytorium

Musisz przesłać **całą zawartość tego folderu**, zachowując strukturę katalogów.

W głównym katalogu repozytorium powinny znaleźć się:

```text
index.html
.nojekyll
css/
js/
tests/
README.md
DEPLOY_GITHUB.md
CHANGELOG.md
```

Nie wrzucaj folderu `ola_noobek_v0_5_modular` jako jednego podfolderu. Otwórz go i prześlij jego zawartość bezpośrednio do głównego katalogu repozytorium.

## Metoda przez stronę GitHub

1. Otwórz repozytorium gry.
2. Usuń lub zastąp stary `index.html`.
3. Kliknij **Add file → Upload files**.
4. Przeciągnij jednocześnie:
   - `index.html`,
   - `.nojekyll`,
   - folder `css`,
   - folder `js`,
   - folder `tests`,
   - pliki Markdown.
5. Sprawdź, czy GitHub pokazuje foldery `css/js/tests`, a nie wszystkie pliki w jednym miejscu.
6. Wpisz opis commita, np. `Update game to v0.5 modular`.
7. Kliknij **Commit changes**.

## Ustawienie GitHub Pages

W repozytorium przejdź do:

`Settings → Pages → Build and deployment`

Ustaw:

- **Source:** `Deploy from a branch`
- **Branch:** `main`
- **Folder:** `/ (root)`

Następnie kliknij **Save**.

## Test po publikacji

1. Otwórz stronę gry i wykonaj `Ctrl + F5`.
2. Otwórz:
   `https://TWOJ_LOGIN.github.io/NAZWA_REPO/tests/smoke-test.html`
3. Kliknij **Uruchom test**.
4. Wszystkie pliki powinny mieć zielony status `HTTP 200`.

## Czego nie trzeba robić

- Nie trzeba instalować Node.js.
- Nie trzeba używać npm.
- Nie trzeba budować projektu.
- Nie trzeba konfigurować GitHub Actions.
- Nie trzeba zmieniać Supabase, jeśli ranking i feedback już działają.

## Gdy strona jest pusta

Najczęstsze przyczyny:

1. Foldery `css` lub `js` nie zostały przesłane.
2. Pliki znalazły się w dodatkowym podfolderze.
3. GitHub Pages publikuje `/docs`, mimo że pliki są w katalogu głównym.
4. Przeglądarka pokazuje starą wersję z cache.
5. Wielkość liter w nazwie pliku nie zgadza się ze ścieżką.
