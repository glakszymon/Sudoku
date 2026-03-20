# Sudoku Studio

Aplikacja webowa z 6 trybami Sudoku + generatorem arkuszy PDF.

## Struktura plików

```
sudoku-studio/
├── index.html          ← główny plik HTML
├── css/
│   └── style.css       ← cały styl (motyw neutralny biały)
└── js/
    ├── engine.js       ← silnik generatorów i solverów
    ├── app.js          ← nawigacja, timer, modal wygranej
    ├── classic.js      ← Klasyczne 9×9
    ├── giant.js        ← Giant 16×16
    ├── jigsaw.js       ← Jigsaw (losowe regiony)
    ├── skyscraper.js   ← Skyscraper (wskazówki widoczności)
    ├── killer.js       ← Killer (sumy klatek)
    ├── inequality.js   ← Nierówności (znaki > < ∧ ∨)
    └── pdf.js          ← Generator arkuszy PDF (jsPDF)
```

## GitHub Pages — wdrożenie

1. Utwórz repozytorium na GitHub (np. `sudoku-studio`)
2. Wgraj wszystkie pliki zachowując strukturę katalogów
3. Przejdź do **Settings → Pages**
4. W sekcji *Source* wybierz **Deploy from a branch**
5. Gałąź: `main`, folder: `/ (root)`
6. Kliknij **Save** — po chwili strona będzie dostępna pod adresem:
   `https://[twoja-nazwa].github.io/sudoku-studio/`

## Tryby gry

| Tryb | Rozmiar | Poziomy | Czas gen. |
|------|---------|---------|-----------|
| Klasyczne | 9×9 | 3 | ~0.1s |
| Giant | 16×16 | 2 | ~0.5s |
| Jigsaw | 9×9 | 3 | 1–2s |
| Skyscraper | 9×9 | 3 | ~0.2s |
| Killer | 9×9 | 2 | ~0.2s |
| Nierówności | 9×9 | 3 | ~0.2s |

## Funkcje

- ✅ Tryb notatek (klawisz N)
- ✅ Podświetlanie wiersza/kolumny/regionu
- ✅ Podświetlanie tej samej cyfry
- ✅ Walidacja (zielony/czerwony)
- ✅ Timer
- ✅ Nawigacja klawiaturą
- ✅ Generator PDF (2×2, do 8 puzzle na wiersz, 6 typów)
- ✅ Responsywny układ (mobile/tablet/desktop)
- ✅ Zoom siatki Giant (24–52px, krok 4px)
- ✅ Żywe kolorowanie znaków nierówności
