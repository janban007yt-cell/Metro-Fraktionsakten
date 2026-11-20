# Fraktionsakte Generator (FiveM / LSPD)

Web-Tool, um Fraktionsakten (Gangverzeichnis) für dein FiveM-Roleplay-Projekt auszufüllen
und als **PDF** oder **PNG** im Stil einer Polizeiakte auszugeben.
Läuft komplett im Browser – kein Server, keine Installation, keine Daten verlassen deinen Rechner.

## Funktionen

- Alle Felder deiner Vorlage: Aktenkopf, Gefahrenstufen 1–5, Erkennungsmerkmale, Mitglieder (12er–1er mit Foto, Haftbefehl + DOC-Nr.), Anwesen (Karte + Bilder), Fahrzeuge, Bewaffnung, Beziehungen, Straftaten (neueste oben, automatisch sortiert), Informanten
- Live-Vorschau neben dem Formular
- Export als mehrseitiges **A4-PDF** (kein Zerschneiden von Tabellenzeilen) oder als **ein langes PNG**
- Bilder per Datei-Dialog **oder per Strg+V** (Screenshot aus der Zwischenablage) einfügen
- Automatisches Speichern im Browser; Akten als **JSON** speichern/laden (eine Datei pro Fraktion)
- Echte Namen der Informanten werden im Export standardmäßig geschwärzt
- „Zuletzt aktualisiert“ setzt sich bei jeder Änderung automatisch

## Logo

Das Logo liegt in `assets/logo.png` und ist zusätzlich in `logo-data.js` eingebettet (damit es auch beim Öffnen per Doppelklick funktioniert).
Zum Austauschen im Editor unter **Einstellungen / Logo** ein anderes Bild hochladen, oder `logo-data.js` neu erzeugen.

## Auf GitHub veröffentlichen (GitHub Pages)

1. Neues Repository anlegen und alle Dateien hochladen (Branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Der Workflow `.github/workflows/pages.yml` veröffentlicht die Seite bei jedem Push.
   Adresse: `https://<dein-name>.github.io/<repo-name>/`

## Lokal benutzen

`index.html` im Browser öffnen, oder per lokalem Server:

```bash
python3 -m http.server 8000
```

Hinweis: html2canvas und jsPDF werden per CDN geladen – eine Internetverbindung ist nötig.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenrahmen |
| `style.css` | Editor- und Akten-Layout |
| `logo-data.js` | Eingebettetes Standard-Logo |
| `assets/logo.png` | Logo als Bilddatei |
| `app.js` | Formular, Vorschau, PDF-/PNG-Export |
| `.github/workflows/pages.yml` | Automatisches Deployment |
