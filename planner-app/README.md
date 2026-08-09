# Honey & Silk Planner (React)

Identical visual replica of the Canva planner: page images + clickable link hotspots, PWA install, and tablet pen tools.

## Run

```bash
npm install
npm run dev
```

## Features

- Month-tab hotspots + swipe navigation
- **PWA**: install to iPhone Home Screen / Chrome
- **Top tools**: Navigate, Pen, Highlighter, Eraser (strokes saved per page in IndexedDB)

### Install on iPhone (Safari)

1. Open the site in Safari  
2. Share → **Add to Home Screen**

### Writing on iPad

1. Tap **Pen** or **Highlighter** in the top bar  
2. Write with Apple Pencil or finger  
3. Tap **Navigate** to swipe / use month tabs again  

## Rebuild assets from PDF

From the parent `Honey&silk` folder (needs `.pdf-tools-venv` + `HoneySilk-Planner-GoodNotes.pdf`):

```bash
.pdf-tools-venv/bin/python export_for_react.py
```

Writes `public/pages/page-*.jpg` and `public/planner.json`.
