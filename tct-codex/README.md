# TCT Codex — Design-Prototyp

Eine neu gestaltete Startseite für den Tennisclub Trier 1888 e.V. mit verifizierten, zentral hinterlegten Clubdaten. Der Prototyp ist eine bewusst statische Frontend-Basis; er verändert keine Live-Systeme.

## Starten

```bash
npm install
npm run dev
```

Für die Produktionsprüfung:

```bash
npm run build
npm run lint
```

## Was enthalten ist

- Hochwertige responsive Startseite, inklusive Menü, Suche, Preis-/Anlage-/Turnier-/Vorstands- und Kontaktabschnitten.
- Dezente CSS-Motion, Hover-Zustände und ein vollständiger `prefers-reduced-motion`-Fallback.
- Zentrale, typisierte Inhaltsdaten in `src/data/club.ts`.
- Quellen-, Inhalt- und Asset-Audit im Projektstamm.

## Vor dem Produktivbetrieb

Die Preis- und Turnierdaten erneut bestätigen, Bildrechte freigeben und das Demo-Formular sicher an ein Vereinspostfach anbinden. Für ein vollständiges CMS empfiehlt sich eine separate Next.js-Produktivphase mit Authentifizierung und Redaktions-Workflow.
