# AbiEar — Web-Fassung

Die iOS-App in TypeScript und Svelte 5: als Web-App die Testfassung für
Lehrkräfte, als Capacitor-Paket die Android-App. Der Plan und die
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

## Android

Dieselbe Fassung, von Capacitor 8 in eine App verpackt (`android/`,
`capacitor.config.ts`). Paketname `de.abiear.app` wie die iOS-Kennung.

```bash
./android.sh emulator   # Emulator starten
./android.sh debug      # bauen (ohne Service Worker), installieren, starten
./android.sh release    # App-Bundle für Google Play
```

Was unter Android anders ist, steht in `src/plattform/android.ts`, alles
andere ist dieselbe Oberfläche und derselbe Kern:

- **Statistik** als Datei `statistics.json` im App-Verzeichnis (`files/`),
  erst in eine Nebendatei geschrieben und dann umbenannt.
- **Erinnerung** als dreißig geplante lokale Mitteilungen, Kanal
  „Tägliche Erinnerung“. Bewusst *ungenau* geplant (bis zu einer Stunde
  Spielraum): genaue Wecker verlangt Google nur von Wecker- und
  Kalender-Apps, die Berechtigung ist im Manifest entfernt.
- **Zurück-Taste** (`src/plattform/Zurueck.ts`): tut, was der sichtbare
  Schließen-Knopf der obersten Ebene tut — Blatt, Rückfrage (Abbrechen),
  Vorbereitung, Lauf; ein anderer Tab führt zu „Üben“, auf „Üben“ geht die
  App in den Hintergrund. Die Einführung schluckt Zurück.
- **Texte**, die unter iOS „iOS“ oder „App Store“ sagen, stehen je Fassung
  in `src/plattform/Fassung.ts`.
- **Mitteilungseinstellungen** öffnet ein kleines eigenes Plugin in
  `MainActivity.java`, wie der Einstellungen-Knopf unter iOS.

**Symbole:** Das App-Symbol ist das iOS-Symbol als Vektor nachgezeichnet
(`res/drawable/ic_launcher_*.xml`, drei Kreise), mit Themensymbol für
Android 13+. Für Android 7 liegen daraus gerechnete Bitmaps in `mipmap-*`.

**Hochladeschlüssel** für Google Play (einmal, selbst, mit eigenem Passwort):

```bash
keytool -genkeypair -v -keystore android/abiear-upload.jks -alias abiear \
  -keyalg RSA -keysize 4096 -validity 10000
```

und daneben `android/keystore.properties` mit `storeFile=abiear-upload.jks`,
`storePassword`, `keyAlias=abiear`, `keyPassword`. Beide Dateien sind von
Git ausgenommen — **und gehören in eine Sicherung**: ohne den Schlüssel
lässt sich kein Update hochladen (Play App Signing kann ihn zurücksetzen,
aber nur über den Support).

## Aufbau

```
src/kern/       1:1 aus GehoerbildungTrainer/Models und Generation —
                Erzeugung, Eingabe, Bewertung, Notation, Statistik, Store
src/klang/      1:1 aus Audio/ — Puffer vorrechnen, Web Audio spielt ab
src/plattform/  was je Plattform anders ist: Ablage, Einstellungen,
                Erinnerung, Haptik, Zurück, Texte — android.ts für Android
android/        das Capacitor-Projekt (Gradle)
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
