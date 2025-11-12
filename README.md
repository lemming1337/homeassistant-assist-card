# Home Assistant Assist Card

Eine Custom Card für Home Assistant, die mit der integrierten Assist-Komponente interagiert und erweiterte Funktionen bietet:

- **Markdown-Unterstützung**: Antworten werden mit voller Markdown-Formatierung dargestellt (Code-Blöcke, Listen, Tabellen, etc.)
- **Tool Call Anzeige**: Optionale Anzeige der verwendeten Tools mit Ein-/Ausklapp-Funktion
- **Moderne Chat-UI**: Übersichtliche Chat-Oberfläche mit Zeitstempeln und Lade-Animation
- **Vollständige Assist-Integration**: Nutzt die offizielle Home Assistant Conversation API

## Installation

### Option 1: Manuelle Installation

1. **Projekt bauen:**
   ```bash
   npm install
   npm run build
   ```

2. **Datei kopieren:**
   Kopiere `dist/homeassistant-assist-card.js` in dein Home Assistant `config/www/` Verzeichnis.

3. **Ressource hinzufügen:**
   - Gehe zu **Einstellungen** → **Dashboards** → **Ressourcen** (oben rechts ⋮)
   - Klicke **Ressource hinzufügen**
   - URL: `/local/homeassistant-assist-card.js`
   - Typ: **JavaScript-Modul**

### Option 2: HACS (wenn als HACS-Repository verfügbar)

1. Öffne HACS
2. Gehe zu "Frontend"
3. Suche nach "Assist Card"
4. Installiere die Card

## Verwendung

### Basis-Konfiguration

Füge die Card zu deinem Dashboard hinzu (UI oder YAML):

```yaml
type: custom:homeassistant-assist-card
title: Assist
```

### Erweiterte Konfiguration

```yaml
type: custom:homeassistant-assist-card
title: Mein Assistent
pipeline_id: preferred  # Optional: Spezifische Pipeline
show_tools: true        # Optional: Tool Calls anzeigen (Standard: false)
placeholder: Frage mich etwas...  # Optional: Platzhalter-Text
```

### Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|--------------|
| `type` | string | **erforderlich** | Muss `custom:homeassistant-assist-card` sein |
| `title` | string | `"Assist"` | Titel der Card |
| `pipeline_id` | string | - | ID der zu verwendenden Assist Pipeline |
| `show_tools` | boolean | `false` | Zeigt verwendete Tools und deren Ein-/Ausgabe |
| `placeholder` | string | `"Ask me anything..."` | Platzhalter im Eingabefeld |

## Features

### 1. Markdown-Rendering

Die Card rendert alle Markdown-Elemente korrekt:

- **Überschriften** (H1-H6)
- **Listen** (geordnet und ungeordnet)
- **Code-Blöcke** mit Syntax-Highlighting-Hintergrund
- **Inline-Code** mit `Monospace-Schrift`
- **Tabellen**
- **Blockquotes**
- **Fettdruck** und *Kursivschrift*
- **Links**

### 2. Tool Call Anzeige

Wenn `show_tools: true` gesetzt ist:
- Zeigt alle von Assist verwendeten Tools
- Klickbar zum Ein-/Ausklappen
- Zeigt Tool-Input und -Output im JSON-Format
- Übersichtliche Darstellung mit Icons

### 3. Chat-Interface

- Benutzer-Nachrichten rechts (blau)
- Assistent-Antworten links (grau)
- Zeitstempel bei jeder Nachricht
- Lade-Animation während der Verarbeitung
- Automatisches Scrollen zu neuen Nachrichten
- Fehlerbehandlung mit rot markierten Fehlermeldungen

### 4. Tastatur-Shortcuts

- **Enter**: Nachricht senden
- **Shift + Enter**: Neue Zeile im Eingabefeld

## Beispiel-Screenshots

### Normale Konversation mit Markdown
```
User: Zeige mir die Temperatur im Wohnzimmer
Assist: Die aktuelle Temperatur im Wohnzimmer beträgt **22.5°C**.

Hier sind weitere Details:
- Luftfeuchtigkeit: 45%
- Letzte Aktualisierung: vor 2 Minuten
```

### Mit Tool Calls (show_tools: true)
```
User: Schalte das Licht im Schlafzimmer ein
Assist: Ich habe das Licht im Schlafzimmer eingeschaltet.

▼ Tool: light.turn_on
  Input: {
    "entity_id": "light.bedroom"
  }
  Output: {
    "success": true
  }
```

## Entwicklung

### Build-Befehle

```bash
# Dependencies installieren
npm install

# Einmalig bauen
npm run build

# Watch-Modus für Entwicklung
npm run watch

# Linting
npm run lint

# Code formatieren
npm run format

# Formatierung prüfen
npm run format:check
```

### GitHub Workflows

Das Projekt verfügt über automatisierte GitHub Actions Workflows:

#### CI Workflow (`.github/workflows/ci.yml`)
Läuft bei jedem Push und Pull Request:
- **Lint & Format Check**: ESLint und Prettier Prüfungen
- **Build**: Erstellt die JavaScript-Artefakte
- **Type Check**: TypeScript Typ-Überprüfung

```bash
# Wird ausgelöst bei:
# - Push auf main, dev oder claude/** Branches
# - Pull Requests zu main oder dev
```

#### Release Workflow (`.github/workflows/release.yml`)
Erstellt offizielle Releases:
- Läuft bei Git-Tags (`v*.*.*`) oder manuell
- Erstellt ZIP-Archive mit Build-Artefakten
- Generiert SHA256-Checksummen
- Veröffentlicht GitHub Release mit Artefakten

```bash
# Release erstellen:
git tag v1.0.0
git push origin v1.0.0

# Oder manuell in GitHub Actions ausführen
```

#### Build Artifact Workflow (`.github/workflows/build-artifact.yml`)
Erstellt Build-Artefakte für den main Branch:
- Läuft bei jedem Push auf main
- Speichert Build-Artefakte für 30 Tage
- Fügt Build-Informationen hinzu (Commit, Datum, etc.)

### Code-Qualität

Das Projekt verwendet:
- **ESLint**: Für Code-Linting und Best Practices
- **Prettier**: Für konsistente Code-Formatierung
- **TypeScript**: Für Typ-Sicherheit

### Projekt-Struktur

```
homeassistant-assist-card/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI/CD Pipeline
│       ├── release.yml               # Release Workflow
│       └── build-artifact.yml        # Build Artefakte
├── src/
│   └── homeassistant-assist-card.ts  # Haupt-Implementation
├── dist/
│   └── homeassistant-assist-card.js  # Gebundelte Datei
├── eslint.config.js                  # ESLint 9 Flat Config
├── .prettierrc                       # Prettier Konfiguration
├── .prettierignore                   # Prettier Ignore-Datei
├── hacs.json                         # HACS Manifest
├── package.json                      # Dependencies & Scripts
├── package-lock.json                 # Lockfile
├── tsconfig.json                     # TypeScript Konfiguration
├── rollup.config.js                  # Rollup Build-Config
└── README.md                         # Dokumentation
```

### Technologie-Stack

- **LitElement**: Web Components Framework
- **TypeScript**: Typsicherheit
- **Marked.js**: Markdown-Parsing und -Rendering
- **Rollup**: Bundling und Minification

## Fehlerbehebung

### Card wird nicht angezeigt
1. Überprüfe, ob die Ressource korrekt hinzugefügt wurde
2. Leere den Browser-Cache (Strg+F5)
3. Prüfe die Browser-Konsole auf Fehler

### Markdown wird nicht gerendert
- Stelle sicher, dass die Assist-Antwort tatsächlich Markdown enthält
- Benutzer-Nachrichten werden nicht als Markdown gerendert (nur Assistent-Antworten)

### Tool Calls werden nicht angezeigt
- Setze `show_tools: true` in der Konfiguration
- Nicht alle Assist-Antworten enthalten Tool Calls

### Conversation ID geht verloren
- Die Conversation ID wird automatisch verwaltet
- Ein Neuladen der Seite startet eine neue Konversation

## Lizenz

MIT

## Beiträge

Contributions sind willkommen! Bitte erstelle einen Pull Request oder ein Issue.

## Danksagungen

Basierend auf der offiziellen Home Assistant `ha-assist-chat` Komponente.
