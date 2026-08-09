# Honey & Silk Planner (React)

Identical visual replica of the Canva planner: page images + clickable link hotspots.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Use the month tabs / nav areas on the page, toolbar buttons, or arrow keys.

## Rebuild assets from PDF

From the parent `Honey&silk` folder (needs `.pdf-tools-venv` + `HoneySilk-Planner-GoodNotes.pdf`):

```bash
.pdf-tools-venv/bin/python export_for_react.py
```

Writes `public/pages/page-*.jpg` and `public/planner.json`.
