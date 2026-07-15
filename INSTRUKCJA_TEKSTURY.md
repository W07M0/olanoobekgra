# Tekstury do podmiany

Foldery:
- `assets/textures/frames/`
- `assets/textures/backgrounds/`
- `assets/textures/skins/`

Rozdzielczości nie są obowiązkowe.

Zalecane proporcje dla najlepszego efektu:
- ramki i tła: szerokie, około 5:1
- skiny: kwadratowe, około 1:1

Możesz użyć np.:
- ramka: 800×160, 1200×240, 2000×400 albo inna
- tło: dowolny szeroki obraz
- skin: 256×256, 512×512, 1024×1024 albo prostokątny

Gra automatycznie zachowa proporcje i wykadruje obraz do dostępnego miejsca.

Zachowaj identyczną nazwę pliku podczas podmiany.

Ramki:
- default.png
- arcade.png
- collector.png
- developer.png

Tła:
- default.png
- wealth.png
- casino.png
- reflex.png

Skiny:
- banana.png
- classic.png
- cyber.png
- dev.png
- glitch.png
- gold.png
- ice.png
- lava.png
- matrix.png
- rainbow.png
- toxic.png
- void.png


## Ramki bez przezroczystego środka

Ramka może być zwykłym pełnym obrazem PNG.

Gra automatycznie:
- umieszcza tekst nad obrazem,
- dodaje ciemną półprzezroczystą warstwę,
- zwiększa czytelność nicku i wyniku,
- zachowuje zaokrąglenia wpisu rankingu.

Nie musisz wycinać środka ani używać przezroczystości.


## Jak działa dopasowanie

Domyślnie używany jest tryb `cover`:

- obraz zachowuje swoje proporcje,
- wypełnia cały dostępny obszar,
- fragmenty wystające poza obszar są przycinane,
- środek obrazu pozostaje widoczny.

Nie musisz już zachowywać dokładnej rozdzielczości placeholdera.

Dla ramek i teł nadal najlepiej sprawdzają się szerokie obrazy.
Dla skinów najlepiej wyglądają obrazy kwadratowe, ale inne formaty również zadziałają.
