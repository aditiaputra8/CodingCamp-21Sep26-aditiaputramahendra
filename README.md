# Expense & Budget Visualizer

A zero-dependency, static single-page web application for recording and visualizing daily expenses.

![Screenshot placeholder](screenshot.png)

---

## Features

- **Record expenses** — add an item name, amount (Rp), and category via a simple form
- **Transaction history** — scrollable list of all recorded expenses with per-entry delete
- **Total spending** — live running total updated on every add or delete
- **Pie chart** — visual breakdown of spending by category, powered by Chart.js
- **Custom categories** — add your own categories beyond Food, Transport, and Fun
- **Sort transactions** — sort by newest first, amount (low/high), or category A–Z
- **Dark / light mode** — toggle between themes; preference is saved across sessions
- **Offline-capable** — all data is stored in the browser's `localStorage`; no server needed

---

## File Structure

```
expense-budget-visualizer/
├── index.html          # Application shell and markup
├── css/
│   └── style.css       # All styles, CSS custom properties, responsive layout
├── js/
│   └── script.js       # All application logic (modules: Storage, State, Validator, Chart, …)
└── README.md           # This file
```

---

## Opening Locally

No server or build step is required.

1. Clone or download this repository.
2. Open `index.html` directly in your browser (double-click it, or use *File → Open File* in your browser).
3. The app loads immediately — no `npm install` or terminal commands needed.

---

## Deploying to GitHub Pages

1. Push the project to a GitHub repository.
2. Go to **Settings → Pages** in the repository.
3. Under *Source*, select **Deploy from a branch**.
4. Choose the branch (e.g. `main`) and folder `/ (root)`, then click **Save**.
5. GitHub Pages will publish the site at `https://<your-username>.github.io/<repo-name>/`.
6. Open that URL in a browser — `index.html` is served as the root page.

---

## Browser Support

Tested on the latest stable releases of Chrome, Firefox, Edge, and Safari.

---

## Accessibility

- All form controls have associated labels or `aria-label` attributes
- Inline validation errors use `aria-describedby` and `aria-invalid`
- Toast notifications use an `aria-live="polite"` region
- Storage failure banner uses `role="alert"`
- Both light and dark themes meet WCAG 2.1 AA 1.4.3 contrast ratio (≥ 4.5:1)
- All interactive controls have visible `:focus-visible` outlines
