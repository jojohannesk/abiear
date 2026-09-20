# Goldmaster-Fixtures

**Erzeugt, nicht geschrieben.** Diese Dateien schreibt
`Werkzeuge/goldmaster.swift` aus der Swift-Fassung:

```bash
./Checks/run.sh goldmaster
```

Sie sind die Referenz für die Web-Fassung: gleicher Seed, gleiche Diktate,
gleiche ABC-Texte, gleiche Auswertung — **zeichengleich**, nicht ähnlich.
Eine Änderung an Erzeugung, Bewertung oder Statistik in Swift heißt: Goldmaster
neu erzeugen, dann den Port nachziehen, bis die Prüfungen wieder grün sind.
Nie von Hand ändern; nie in TypeScript „reparieren", was hier steht.

| Datei | Inhalt |
|---|---|
| `rand.json` | erste 1 000 Werte von `Rand.seeded(s)` für vier Seeds |
| `katalog.json` | Zellen, Tonarten, Intervalle, Akkorde, Namen, ABC-Tonnamen je Tonart |
| `rhythm-<niveau>.json`, `rhythm-profil.json` | 500 bzw. 200 Rhythmusdiktate, je einzeln geseedet (`seed`) |
| `melody-<niveau>.json`, `melody-profil.json` | 500 bzw. 200 Melodiediktate mit Bewegungen, Kontur, Tonika-Stufe |
| `gehoer.json` | Aufgabenstruktur je Modus, 100 Läufe, mit Antwortoptionen |
| `scoring.json` | 2 × 300 Bedienfolgen auf der Eingabe mit Ergebnis, Bewertung und Notenbild |
| `vollstaendig.json` | vollständig eingetippte Lösung: Notenbild gleich, volle Punkte — je Tonart |
| `statistics.json` | eine Statistikdatei im echten Format (406 Antworten, 144 Takte) |
| `insights.json`, `insights-leer.json` | alles, was `StatisticsInsights` daraus rechnet, mit festem Kalender und „jetzt" |
| `sprueche.json` | `Sprueche.spruch` über ein Raster aus Punkten und Tagen |

Jeder Fall trägt seinen eigenen Seed, damit eine Abweichung auf **einen** Fall
zeigt und die TypeScript-Prüfung ihn allein nachrechnen kann.
