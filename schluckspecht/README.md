# Schluckspecht 🍹

Ein Partyspiel als installierbare Web-App (PWA): Namen eingeben, Kartenstapel wählen, Handy in die Mitte legen und durchtippen.
Die App funktioniert auf jedem Smartphone und Computer, braucht keinen App Store und läuft nach dem ersten Laden auch offline.

> Nur für Erwachsene ab 18 Jahren. Jeder Schluck darf auch Wasser oder Saft sein.

## Funktionen

- **Zwei Spielmodi**: *Klassisch* (alle gegen alle) und *Team-Duell* (zwei Teams sammeln Punkte)
- **Mitspielende**: 2 bis 20 Namen, werden auf dem Gerät gespeichert
- **4 Kartenstapel** mit 247 eigenen Karten: *Vorglühen*, *Eskalation*, *Ehrlich gesagt*, *Heiß & Wild*
- **Kartentypen**: Aufgabe, Spiel, Abstimmung und **Regeln**, die über mehrere Karten gelten und automatisch mit einer „Regel vorbei“-Karte enden (höchstens zwei gleichzeitig, jederzeit über „Regeln aktiv“ einsehbar)
- **Faire Auswahl**: Wer seltener dran war, kommt eher dran; pro Karte immer verschiedene Personen
- **Einstellungen**: Schlucke pro Karte (Sanft, Normal, Kräftig), Spiellänge (30, 50, endlos)
- Zurückblättern, Tastatursteuerung (← →, Leertaste, Esc), Bildschirm bleibt während des Spiels an
- Abstimmungen erscheinen erst ab 3 Personen, Karten mit drei Namen erst ab 3 Personen
- Korrekte Grammatik („1 Schluck“ und „2 Schlucke“)

## Team-Duell

- Personen werden automatisch dem kleineren Team zugeteilt; per ⇄ wechselt jemand das Team, „Teams zufällig mischen“ teilt neu auf.
- Teamnamen sind frei wählbar (Standard: *Rot* und *Blau*).
- 49 eigene Duell-Karten: eins gegen eins, Team gegen Team, Ratespiele und Paar-Duelle. Wer beginnt, wird pro Karte fair ausgelost.
- Nach jedem Duell tippt ihr, wer gewonnen hat (oder *Unentschieden*). Das Verliererteam trinkt den angezeigten Einsatz; bei Unentschieden trinken beide Teams.
- Falsch getippt? „Ergebnis ändern“ nimmt die Wertung zurück.
- Spielziel: 5 Punkte, 10 Punkte oder endlos (dann zeigt „Beenden“ den Endstand).
- Karten, die zwei Personen pro Team oder Teamarbeit brauchen, erscheinen nur, wenn jedes Team groß genug ist.

## Starten

Es gibt keinen Build-Schritt und keine Abhängigkeiten.

```bash
cd schluckspecht
npm start          # startet http://localhost:8080
```

Für das Handy: Den Ordner auf einen beliebigen statischen Webspace legen (z. B. GitHub Pages, Netlify), die Seite im Browser öffnen und über „Zum Home-Bildschirm hinzufügen“ installieren.
Der Offline-Modus (Service Worker) braucht HTTPS oder `localhost`.

## Tests

```bash
npm test           # Spiellogik und Prüfung aller Karten (nur Node ≥ 18)
npm run test:e2e   # Browser-Test mit Playwright und Chromium
npm run test:all   # alles
```

Die Browser-Tests bedienen die App wie ein Mensch auf einem Handy: Namen hinzufügen, Spiel durchspielen, Regeln ansehen, Zurückblättern, Beenden, Neuladen, offline laden.
Ist Playwright nicht installiert, werden sie übersprungen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html`, `styles.css` | Oberfläche |
| `js/engine.js` | Spiellogik ohne DOM (Ziehen, Regeln, Personenauswahl, Platzhalter) |
| `js/cards.js` | Karten der vier Stapel (klassischer Modus) |
| `js/duel-cards.js` | Karten für das Team-Duell |
| `js/app.js` | Verbindung von Oberfläche und Spiellogik, Speicherung |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installierbarkeit und Offline-Modus |

## Eigene Karten hinzufügen

In `js/cards.js` eine Zeile ergänzen:

```js
A('{1} und {2} tauschen die Getränke – oder trinken beide {s}.'),       // Aufgabe
G('Kategorie: Obstsorten. {1} beginnt. Wer nichts weiß, trinkt {s}.'),   // Spiel
V('Wer kocht am besten?' + VOTE + 'verteilt {s}.'),                      // Abstimmung
R('{1} darf nur flüstern.', '{1} darf wieder normal reden.'),            // Regel + Endtext
```

Platzhalter: `{1}`, `{2}`, `{3}` für verschiedene Personen, `{s}` für die Schlucke (mit Wort), `{S}` für die doppelte Menge.

Duell-Karten in `js/duel-cards.js` nutzen `{A}`/`{B}` (je eine Person pro Team), `{A2}`/`{B2}` (zweite Person) und `{TA}`/`{TB}` (wird zu „Team Rot“ usw.):

```js
D('{A} gegen {B}: Wer zuerst fünf Gemüsesorten nennt, gewinnt.'),
D('Kategorie-Duell: Flüsse. {TA} beginnt, dann geht es abwechselnd weiter.' + LAST),
```
`npm test` prüft danach automatisch, ob jede Karte gültig ist.
