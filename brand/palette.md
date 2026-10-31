# Palette Arthur Style

Colori campionati dal logo originale (carta, inchiostro) e dalle foto del salone (espresso, castano, caramello, marmo).
Contrasti calcolati con la formula WCAG 2.x (31/10/2026).

| Nome | HEX | Origine | Ruolo |
|------|-----|---------|-------|
| **Carta** | `#FBF8F1` | Fondo del logo | Sfondo principale |
| **Inchiostro** | `#726459` | Lettering del logo | Logo, testo secondario, filetti |
| **Espresso** | `#2A201B` | Poltrone nere e castano scurissimo delle foto | Testo principale, sezioni scure, pulsante primario |
| **Castano** | `#563D30` | Capelli castani nelle foto | Link, stati attivi, accento caldo |
| **Caramello** | `#A98F7D` | Riflessi balayage | **Solo decorativo** (ciocche, illustrazioni) |
| **Marmo** | `#E7E4DF` | Pavimento e banconi in marmo | Superfici secondarie, card del pannello, bordi |

## Contrasti (testo normale: AA ≥ 4,5 · grande: ≥ 3)

| Primo piano / sfondo | Rapporto | Uso consentito |
|----------------------|----------|----------------|
| Espresso su Carta | **14,99** | Tutto il testo |
| Castano su Carta | **9,40** | Testo, link |
| Inchiostro su Carta | **5,38** | Testo secondario, logo |
| Inchiostro su Marmo | **4,50** | Al limite AA: solo testo ≥ 16 px |
| Carta su Espresso | **14,99** | Testo su sezioni scure, pulsanti |
| Carta su Castano | **9,40** | Pulsanti alternativi |
| Caramello su Carta | 2,86 | ❌ **Mai per testo né per controlli** (sotto 3:1) |

## Stati di sistema (per pannello e prenotazione)

Colori funzionali, desaturati per restare nel tono:

| Stato | HEX | Su Carta |
|-------|-----|----------|
| Conferma / successo | `#3E6B4F` | da verificare in F2 (obiettivo ≥ 4,5) |
| Attenzione | `#8A5A12` | da verificare in F2 |
| Errore | `#9B2C2C` | da verificare in F2 |

Nel pannello lo **stato non è mai comunicato solo dal colore**: c'è sempre anche un'icona o un'etichetta.
