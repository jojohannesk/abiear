# AbiEar — Web-Fassung

Die iOS-App in TypeScript und Svelte 5: als Web-App die Testfassung für
Lehrkräfte, als Capacitor-Paket später die Android-App. Der Plan und die
Begründungen stehen im Hauptprojekt in `Plan-Web.md`.

**Dieser Ordner ist zugleich das Demo-Repository.** Im Hauptprojekt liegt er
unter `Web/`; `Werkzeuge/demo-hochladen.sh` schneidet ihn mit
`git subtree split` heraus und schiebt ihn nach
[github.com/jojohannesk/abiear](https://github.com/jojohannesk/abiear),
wo der Workflow in `.github/workflows/pages.yml` baut und auf GitHub Pages
veröffentlicht: <https://jojohannesk.github.io/abiear/> — der Leitfaden für
Lehrkräfte liegt daneben unter `/testen.html`. Das Demo-Repository ist eine
**Ableitung**: dort direkt zu ändern lohnt nicht, der nächste Lauf
überschreibt es.

## Arbeiten

```bash
npm install          # einmal (Node ≥ 22)
npm run dev          # Entwicklung unter http://localhost:5173
npm test             # alle Suiten, inkl. Goldmaster (~15 s)
npm run check        # svelte-check und tsc
npm run build        # dist/, installierbar und offline (PWA)
```

`npm run build` mit `ABIEAR_BASE=/abiear/` baut für einen Unterpfad — so
macht es der Workflow für GitHub Pages. Ohne die Variable baut er für die
Wurzel; `npm run preview` zeigt das Ergebnis dann unter
<http://localhost:4173>. **Als Datei geöffnet läuft die App nicht** — der
Browser lädt keine Module über `file://`; es braucht immer einen Server.

**Auf diesem Mac:** `node_modules` ist ein Symlink auf
`node_modules.nosync`. Der Desktop liegt in iCloud Drive, und bei fast
voller Platte lagert iCloud frische Dateien sofort aus — jeder Zugriff
blockierte dann in `read()`. Die Endung `.nosync` nimmt das Verzeichnis
von der Synchronisation aus. Nach einem frischen `npm install`, das den
Symlink ersetzt hat: `mv node_modules node_modules.nosync && ln -s
node_modules.nosync node_modules`.

## Aufbau

```
src/kern/       1:1 aus GehoerbildungTrainer/Models und Generation —
                Erzeugung, Eingabe, Bewertung, Notation, Statistik, Store
src/klang/      1:1 aus Audio/ — Puffer vorrechnen, Web Audio spielt ab
src/plattform/  was je Plattform anders ist: Ablage, Einstellungen,
                Erinnerung, Haptik, Impressum
src/ui/         die Oberfläche, nach den SwiftUI-Vorlagen, design.css
                aus DesignSystem.swift
tests/          die portierten Suiten aus Checks/ und die
                Goldmaster-Prüfungen
fixtures/       aus Werkzeuge/goldmaster.swift — nie von Hand ändern
public/         abcjs, die 14 Samples, der Akkordbaum, testen.html
```

## Die Regel für zwei Fassungen

**Swift ist die Referenz.** Eine Änderung an Erzeugung, Bewertung oder
Statistik wird zuerst in Swift gemacht und gemessen. Dann
`./Checks/run.sh goldmaster`, dann hier nachziehen, bis `npm test` wieder
grün ist. Nie umgekehrt, nie nur auf einer Seite. Die Goldmaster-Prüfungen
verlangen Zeichengleichheit — ein Diktat, das um eine Note abweicht, ist
ein Fehler im Port, auch wenn es musikalisch gleich gut wäre.

Der Klang ist die eine Ausnahme mit Toleranz: ohne Samples ist die Rechnung
in beiden Fassungen dieselbe (geprüft auf 1e-5), mit Samples entscheidet
der MP3-Decoder der Plattform.

## Was im Browser anders ist

- Tonausgabe wird beim ersten Tippen freigeschaltet (Autoplay-Regel).
- Die Erinnerung kann nur erscheinen, solange die Seite läuft; die
  Oberfläche sagt das dazu. Unter Capacitor übernimmt die
  LocalNotifications-API.
- Haptik nur über `navigator.vibrate` (Android).
- Die Statistik liegt in IndexedDB — mit demselben Dateischema wie
  `statistics.json` der iOS-App, byteidentisch geprüft.
