# Odtwarzacz muzyki 0.6c

## Dodawanie utworów

1. Wrzuć plik do `assets/music/`, np.:
   `assets/music/noob-anthem.mp3`

2. Otwórz `js/music-playlist.js`.

3. Dopisz utwór:

```js
const MUSIC_PLAYLIST = [
  { title: "Noob Anthem", file: "assets/music/noob-anthem.mp3" },
  { title: "Casino Noob", file: "assets/music/casino-noob.mp3" },
];
```

## Funkcje

- play/pauza,
- następny i poprzedni utwór,
- wyciszenie,
- regulacja głośności,
- automatyczne przejście do kolejnej piosenki,
- zapamiętywanie głośności i ostatniego utworu.

## Cache muzyki

Po podmianie pliku muzycznego otwórz stronę z nową wersją:

`?musicv=muzyka2`

Paczka nie zawiera żadnych przykładowych utworów.
