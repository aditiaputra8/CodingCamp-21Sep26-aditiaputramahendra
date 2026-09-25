# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a zero-dependency static single-page web app using three files (`index.html`, `css/style.css`, `js/script.js`) plus a `README.md`. All logic is written in Vanilla JavaScript; Chart.js is loaded from CDN. Data is persisted with the browser's `localStorage` API. The implementation follows a one-way data flow: user action → validate → mutate state → persist to storage → re-render views.

---

## Tasks

- [x] 1. Project Scaffold
  - Create `index.html`, `css/style.css`, and `js/script.js` as empty files
  - In `index.html`: add a `<header>` with the app title and a placeholder for the Theme Toggle button
  - In `index.html`: add a `<main>` section with placeholder containers for the total-spending display, input form, transaction list, and pie chart canvas
  - Add a `#notifications` live region (`aria-live="polite"`) for toast messages
  - Add a `#storage-banner` element (`role="alert"`, hidden by default) below the header
  - Link `css/style.css` in the `<head>`; add the Chart.js v4 CDN `<script>` tag (jsDelivr) before `</body>`; add a deferred `<script src="js/script.js">` after it
  - In `css/style.css`: define CSS custom properties (variables) for colors, font sizes, and spacing under `:root`
  - Apply a two-column layout for desktop (form left, chart right) using CSS Grid or Flexbox; stack to single column below 768px via media query
  - Set `min-width: 320px`; ensure no horizontal scrollbar appears up to 1440px; use minimum 14px font size for all body text
  - Add a `.hidden` utility class
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Data Layer
  - In `js/script.js`: implement `StorageModule` as a plain object with `readTransactions()`, `writeTransactions(transactions)`, `readCategories()`, `writeCategories(categories)`, `readTheme()`, and `writeTheme(theme)` methods — each wrapped in `try/catch`; use exact storage keys `"expense_transactions"`, `"expense_categories"`, `"expense_theme"`
  - `readTransactions()` returns a `Transaction[]` or `[]` on error and shows the storage banner on failure; `writeTransactions()` serializes with `JSON.stringify` and shows a toast on write failure
  - `readCategories()` returns a `string[]` or `[]` on error; `writeCategories()` serializes and shows a toast on write failure
  - `readTheme()` returns `'light'` or `'dark'`, defaulting to `'light'` when the key is absent; `writeTheme()` stores the string value and shows a toast on write failure
  - In `js/script.js`: define the single in-memory state object `{ transactions: [], categories: [], theme: 'light', sortOrder: 'chrono' }`
  - Implement `StateModule` with the following functions: `addTransaction(tx)` (prepends to `state.transactions`), `removeTransaction(id)` (filters out by id), `addCategory(name)` (appends trimmed name), `computeTotalSpending()` (returns sum of all amounts), `getCategoryTotals()` (returns `{ [category]: total }` for categories with total > 0), and `getSortedTransactions()` (returns a sorted copy based on `state.sortOrder`)
  - Generate transaction IDs with `crypto.randomUUID()`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Input Form & Validation
  - In `index.html`: build the `#expense-form` with fields — item name (text, `maxlength="100"`), amount (number), and category (`<select>` with a disabled placeholder option plus Food, Transport, Fun defaults)
  - Add inline error `<span data-error>` elements next to each field (hidden by default); give every `<input>`, `<select>`, and `<button>` an associated `<label>` or `aria-label`; set `aria-describedby` on each field pointing to its error span
  - In `js/script.js`: implement `ValidatorModule.validateTransaction({ name, amount, category })` — reject empty/blank name, name > 100 chars, empty/non-positive/> 999999999.99 amount, and missing category; return `{ valid: boolean, errors: [{ field, message }] }`
  - Implement helper functions `showFieldError(field, message)` and `clearFieldErrors()` that toggle `[data-error]` spans and set `aria-invalid` on the corresponding inputs
  - Attach a `submit` event listener on `#expense-form`; call `clearFieldErrors()`, then `validateTransaction()` with the form values
  - On invalid: call `showFieldError()` for each error, do not add the transaction, retain current field values
  - On valid: build a `Transaction` object (`id`, `name`, `amount` as float, `category`, `createdAt` ISO string), call `StateModule.addTransaction(tx)`, call `StorageModule.writeTransactions()`, then reset all form fields and return the category select to its placeholder
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 10.7_

- [x] 4. Transaction List & Delete
  - In `index.html`: add the `#transaction-list` container inside `<main>`
  - In `js/script.js`: implement `TransactionList.render(transactions)` — build HTML from a template literal; each row shows item name, amount formatted to two decimal places with currency symbol via `Intl.NumberFormat`, category, and a delete `<button>` with `data-id` set to the transaction's id; set `innerHTML` on `#transaction-list`
  - Implement `TransactionList.renderEmpty()` — sets `#transaction-list` innerHTML to an empty-state message
  - Implement `TransactionList.renderError(message)` — sets `#transaction-list` innerHTML to an error message
  - Use event delegation: attach one `click` listener on `#transaction-list`; check for `data-id` on the event target to identify delete actions
  - In the delete handler: call `StateModule.removeTransaction(id)` → `StorageModule.writeTransactions()` → re-render the transaction list, total spending display, and pie chart (placeholder until Task 6) — all within one synchronous call
  - Ensure the transaction list container scrolls when entries exceed its visible area
  - _Requirements: 2.1, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 6.2_

- [x] 5. Total Spending Display & App Initialization
  - In `index.html`: add the `#total-spending` display area near the top of `<main>`
  - In `js/script.js`: implement `TotalSpending.render(total)` — updates `#total-spending` with a value formatted by `Intl.NumberFormat` to two decimal places with a currency symbol (e.g., `Rp`)
  - Implement `TotalSpending.renderError()` — displays `0.00` with the currency symbol
  - After `StateModule.addTransaction()` in the form submit handler, call `TotalSpending.render(StateModule.computeTotalSpending())` and `TransactionList.render(StateModule.getSortedTransactions())`
  - Write `App.init()` that runs on `DOMContentLoaded` and performs these steps in order:
    1. Read theme from `StorageModule` and apply it immediately before paint (delegates to ThemeModule placeholder until Task 7)
    2. Read transactions and categories from `StorageModule`; show the storage banner if reads fail
    3. Initialize `state.transactions`, `state.categories` (defaults Food, Transport, Fun merged with any stored custom categories, deduplicated), and `state.theme`
    4. Populate the category `<select>` in the Input Form
    5. Call `TotalSpending.render()` or `TotalSpending.renderError()` based on storage result
    6. Call `TransactionList.render()` or `TransactionList.renderEmpty()` based on transaction count
    7. Placeholder call for `PieChartModule.init()` (Task 6)
  - _Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.3, 6.4, 10.5_

- [x] 6. Pie Chart (Chart.js)
  - In `index.html`: add `<canvas id="pie-chart">` inside the chart area; add an `onerror` attribute to the Chart.js CDN `<script>` tag that calls `PieChartModule.renderError()` if the CDN script fails to load
  - In `js/script.js`: implement `PieChartModule.init(categoryTotals)` — guard against `Chart` being undefined (CDN load failure) by calling `renderError()` and returning; wrap `new Chart(canvas, config)` in `try/catch` and call `renderError()` on failure; configure as a `'pie'` chart with a legend; store the `Chart` instance in a module-level variable; filter zero-total categories before setting initial `data.labels` and `data.datasets[0].data`; use a fixed palette of 8 accessible colors, cycling for more than 8 categories
  - Implement `PieChartModule.update(categoryTotals)` — mutate `chart.data.labels` and `chart.data.datasets[0].data` in place (no destroy/re-create); filter zero-total categories before updating; call `chart.update()`
  - Implement `PieChartModule.renderPlaceholder()` — shows a visible "no data" message on the canvas container when there are no transactions
  - Implement `PieChartModule.renderError()` — replaces the canvas with an error message in place of the chart
  - Replace all `PieChartModule` placeholder calls with real calls: in `App.init()` call `PieChartModule.init(StateModule.getCategoryTotals())` (or `renderPlaceholder()` if no transactions); in the form submit handler and delete handler call `PieChartModule.update(StateModule.getCategoryTotals())`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 7. Optional Features — Custom Categories, Sort, Dark/Light Mode
  - **Custom Categories:** In `index.html`, add the Custom Category control — a text input (max 50 chars) + "Add Category" button + its own inline error `<span data-error>` — with accessible labels
  - In `js/script.js`: implement `ValidatorModule.validateCustomCategory({ name, existingCategories })` — reject empty/whitespace-only names, names matching any existing category case-insensitively after trimming, and names exceeding 50 characters; return `{ valid, errors }`
  - Implement `CustomCategoryModule.addCategory(rawName)` — validate, then on valid: call `StateModule.addCategory(trimmedName)` → `StorageModule.writeCategories()` → `CustomCategoryModule.populateCategorySelect()`; on invalid: show the inline error under the custom category input
  - Implement `CustomCategoryModule.populateCategorySelect(categories)` — rebuilds `<option>` elements in the Input Form category `<select>`, preserving the disabled placeholder as the first option; attach a `click` listener on the "Add Category" button
  - In `App.init()`, after reading categories, merge stored custom categories with defaults (deduplicated) and call `populateCategorySelect()`
  - **Sort Transactions:** In `index.html`, add `<select id="sort-control">` with options: newest first (default), amount ascending, amount descending, category A–Z
  - In `js/script.js`: implement `SortModule.sort(transactions, order)` with four branches — `'chrono'` (preserve reverse-chrono insertion order), `'amount-asc'` (ascending by amount), `'amount-desc'` (descending by amount), `'category-az'` (alphabetical by category); sort operates on a copy, never mutating `state.transactions`
  - Update `StateModule.getSortedTransactions()` to delegate to `SortModule.sort(state.transactions, state.sortOrder)`
  - Attach a `change` listener on `#sort-control` — update `state.sortOrder` with the selected value, then call `TransactionList.render(StateModule.getSortedTransactions())` immediately; ensure the form submit and delete handlers also use `getSortedTransactions()` so sort order is preserved after add/delete
  - **Dark/Light Mode:** In `css/style.css`, add a `[data-theme="dark"] { ... }` block that overrides the CSS custom properties defined in `:root`; choose dark theme colors meeting a 4.5:1 contrast ratio against their backgrounds
  - In `js/script.js`: implement `ThemeModule.apply(theme)` — sets `document.documentElement.setAttribute('data-theme', theme)`; implement `ThemeModule.toggle()` — flips `state.theme`, calls `apply()`, calls `StorageModule.writeTheme()`; attach a `click` listener on the Theme Toggle button that calls `ThemeModule.toggle()`
  - In `App.init()`, call `ThemeModule.apply(StorageModule.readTheme())` as the very first statement to prevent a flash of the wrong theme
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 8. Polish & README
  - Check the responsive layout at 320px, 768px, and 1440px viewport widths and fix any overflow or overlapping elements
  - Confirm all interactive controls have visible focus indicators (`:focus-visible` outline) in both themes
  - Verify all `<input>`, `<select>`, and `<button>` elements have associated `<label>` or `aria-label`; verify `aria-describedby` links each form field to its error span; verify `aria-invalid="true"` is set on invalid fields during validation
  - Confirm the `#notifications` live region (`aria-live="polite"`) receives toast messages for storage write failures and that toasts auto-dismiss after 5 seconds
  - Confirm the `#storage-banner` (`role="alert"`) is visible and contains a descriptive message when `localStorage` is unavailable on load
  - Verify both light and dark themes meet a minimum 4.5:1 contrast ratio between text and background (WCAG 2.1 AA 1.4.3)
  - Write `README.md` with: project description, feature list, file structure, instructions for opening locally (open `index.html` in a browser), instructions for deploying on GitHub Pages, and a screenshot placeholder
  - _Requirements: 10.2, 10.3, 10.4, 10.6, 10.7_

---

## Notes

- All tasks produce working code deliverables; no testing frameworks or build tools are needed.
- Storage keys are fixed: `"expense_transactions"`, `"expense_categories"`, `"expense_theme"`.
- File names are fixed: `index.html`, `css/style.css`, `js/script.js`, `README.md` — do not use other names.
- Chart.js is loaded via CDN (jsDelivr); no npm install needed.
- `crypto.randomUUID()` is used for transaction IDs — no external library required.
- Always open `index.html` directly in a browser (no local server needed for this project).
- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan — all 8 tasks are core deliverables).

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4"] },
    { "id": 3, "tasks": ["5"] },
    { "id": 4, "tasks": ["6", "7"] },
    { "id": 5, "tasks": ["8"] }
  ]
}
```
