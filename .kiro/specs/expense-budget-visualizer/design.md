# Design Document

## Expense & Budget Visualizer

---

## Overview

The **Expense & Budget Visualizer** is a zero-dependency, static single-page web application delivered as three files:

```
index.html
css/styles.css
js/app.js
```

It runs entirely in the browser with no build step and no server. All state lives in `localStorage`. The app loads persisted data on startup, renders the transaction list and pie chart, and keeps every view in sync as the user adds or deletes transactions.

**Key technology choices:**

| Concern | Choice | Rationale |
|---|---|---|
| Charting | [Chart.js v4](https://www.chartjs.org/) via CDN (jsDelivr) | Mature, well-documented, responsive-by-default canvas chart library with zero external runtime dependencies of its own when loaded from CDN |
| Unique IDs | `crypto.randomUUID()` | Supported in all target browsers (Chrome 92+, Firefox 95+, Edge 92+, Safari 15.4+); no library needed |
| CSS custom properties | CSS variables (`--color-bg`, `--color-text`, etc.) | Enables instant theme switching without re-rendering the DOM |
| Persistence | `localStorage` | Synchronous, origin-scoped, universally supported in target browsers |
| Module pattern | IIFE / revealing module | Avoids global name collisions without a bundler |

**Research findings:**
- Chart.js v4 `chart.data.labels` and `chart.data.datasets[0].data` can be mutated in-place, then `chart.update()` called — no destroy/re-create needed for data updates. ([Chart.js API docs](https://www.chartjs.org/docs/latest/developers/api.html))
- `crypto.randomUUID()` has 94%+ global browser support and is available in all four target browsers in their latest stable releases. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [caniuse](https://caniuse.com/mdn-api_crypto_randomuuid))
- `localStorage` operations must be wrapped in `try/catch` because they throw in private-browsing mode on some browsers and when storage quota is exceeded.

---

## Architecture

The app follows a **one-way data flow** pattern with a single in-memory state object that is the authoritative source of truth during a session:

```
User Action
     │
     ▼
Event Handler (js/app.js)
     │
     ├──► Validator (validates input, shows/hides inline errors)
     │
     ├──► State Mutator (updates in-memory state)
     │
     ├──► Storage Module (persists state to localStorage)
     │
     └──► View Updater (re-renders affected UI components)
              ├── Transaction List renderer
              ├── Total Spending renderer
              └── Pie Chart updater
```

Because this is a plain-JS app with no virtual DOM, each view updater re-renders only its own section of the DOM. Updates are synchronous and complete within one event-loop tick — well within the 500 ms requirement.

### Module Organization (within `js/app.js`)

`app.js` is organized as a set of cooperating IIFE-style namespaces expressed with plain objects and functions:

```
StorageModule      — all localStorage read/write
StateModule        — in-memory state and mutation helpers
ValidatorModule    — input validation logic
TransactionList    — DOM render and delete
TotalSpending      — DOM render
PieChartModule     — Chart.js wrapper
SortModule         — sort-state and comparators
CustomCategoryModule — custom category UI and persistence
ThemeModule        — theme toggle and persistence
App                — initialization, wires event listeners
```

---

## Components and Interfaces

### 1. `StorageModule`

Centralizes all `localStorage` access. Every method wraps its operation in `try/catch` and returns a result object `{ ok: boolean, data?, error? }` so callers can decide how to surface errors.

```
StorageModule.readTransactions()  → { ok, data: Transaction[] }
StorageModule.writeTransactions(transactions: Transaction[])  → { ok, error? }
StorageModule.readCategories()    → { ok, data: string[] }
StorageModule.writeCategories(categories: string[])  → { ok, error? }
StorageModule.readTheme()         → { ok, data: 'light'|'dark' }
StorageModule.writeTheme(theme: 'light'|'dark')  → { ok, error? }
```

Keys used: `"expense_transactions"`, `"expense_categories"`, `"expense_theme"`.

### 2. `StateModule`

Holds the single in-memory state object:

```js
{
  transactions: Transaction[],   // master list, reverse-chrono order
  categories: string[],          // all categories (default + custom)
  theme: 'light' | 'dark',
  sortOrder: 'chrono' | 'amount-asc' | 'amount-desc' | 'category-az'
}
```

Exposes pure functions for mutations; callers are responsible for calling `StorageModule` and view updaters afterwards.

```
StateModule.addTransaction(tx: Transaction)    → Transaction[]
StateModule.removeTransaction(id: string)      → Transaction[]
StateModule.addCategory(name: string)          → string[]
StateModule.computeTotalSpending()             → number
StateModule.getCategoryTotals()                → { [category: string]: number }
StateModule.getSortedTransactions()            → Transaction[]
```

### 3. `ValidatorModule`

Validates the Input Form and the Custom Category control. Returns `{ valid: boolean, errors: { field: string, message: string }[] }`.

```
ValidatorModule.validateTransaction({ name, amount, category })
ValidatorModule.validateCustomCategory({ name, existingCategories })
```

Shows and clears inline error messages by toggling elements with `[data-error]` attributes.

### 4. `TransactionList`

```
TransactionList.render(transactions: Transaction[])
TransactionList.renderEmpty()
TransactionList.renderError(message: string)
```

- Builds DOM nodes from a template literal and sets `innerHTML` on `#transaction-list`.
- Delegates delete clicks via a single event listener on the container (event delegation pattern).
- Amounts are formatted with `Intl.NumberFormat` to two decimal places with currency symbol.

### 5. `TotalSpending`

```
TotalSpending.render(total: number)
TotalSpending.renderError()
```

Updates `#total-spending` text node with an `Intl.NumberFormat`-formatted value.

### 6. `PieChartModule`

Wraps a single Chart.js instance.

```
PieChartModule.init(categoryTotals: CategoryTotals)
PieChartModule.update(categoryTotals: CategoryTotals)
PieChartModule.renderPlaceholder()
PieChartModule.renderError()
```

- `init()` creates the `new Chart(canvas, config)` instance and stores the reference.
- `update()` mutates `chart.data.labels` and `chart.data.datasets[0].data` then calls `chart.update()`. Slices with zero total are filtered out before setting data.
- A fixed palette of 8 distinct accessible colors is cycled when more than 8 categories exist.

### 7. `SortModule`

```
SortModule.setOrder(order: SortOrder)
SortModule.getOrder()  → SortOrder
SortModule.sort(transactions: Transaction[], order: SortOrder)  → Transaction[]
```

Sort is applied only to the rendered list; `StateModule.transactions` always preserves insertion order (reverse-chrono).

### 8. `CustomCategoryModule`

```
CustomCategoryModule.init()
CustomCategoryModule.addCategory(rawName: string)
CustomCategoryModule.populateCategorySelect(categories: string[])
```

### 9. `ThemeModule`

```
ThemeModule.apply(theme: 'light' | 'dark')
ThemeModule.toggle()
```

Applies theme by setting a `data-theme` attribute on `<html>`. CSS variables switch via `[data-theme="dark"] { ... }` rules.

### 10. `App` (initialization)

`App.init()` runs on `DOMContentLoaded`:

1. Reads theme from `StorageModule` and applies it immediately (before paint).
2. Reads transactions and categories from `StorageModule`.
3. Initializes `StateModule` with loaded data.
4. Populates category selects.
5. Renders `TransactionList`, `TotalSpending`, and `PieChartModule`.
6. Attaches all event listeners.

---

## Data Models

### Transaction

```ts
interface Transaction {
  id: string;          // crypto.randomUUID() — UUIDv4
  name: string;        // 1–100 characters, user-provided item name
  amount: number;      // positive number, max 999999999.99
  category: string;    // must exist in the current categories list
  createdAt: string;   // ISO 8601 timestamp (new Date().toISOString())
}
```

### Storage Layout

| Key | Type | Value |
|---|---|---|
| `expense_transactions` | `string` (JSON) | `Transaction[]` serialized with `JSON.stringify` |
| `expense_categories` | `string` (JSON) | `string[]` — all category names, default + custom |
| `expense_theme` | `string` | `"light"` or `"dark"` |

### Category Totals (derived, never persisted)

```ts
type CategoryTotals = Record<string, number>;
// e.g. { "Food": 145000, "Transport": 50000, "Fun": 30000 }
// Only categories with total > 0 are included when passed to PieChartModule.
```

### Sort Order

```ts
type SortOrder = 'chrono' | 'amount-asc' | 'amount-desc' | 'category-az';
```

### Validation Result

```ts
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}
```

### StorageResult (internal)

```ts
interface StorageResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction JSON round-trip preserves data

*For any* valid `Transaction` object, serializing it to JSON (as done by `StorageModule.writeTransactions`) and then deserializing it (as done by `StorageModule.readTransactions`) must produce an object that is structurally equal to the original.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 2: Total spending equals sum of all transaction amounts

*For any* list of transactions, `StateModule.computeTotalSpending()` must equal the arithmetic sum of all `amount` fields in that list.

**Validates: Requirements 4.2**

---

### Property 3: Category totals are consistent with the transaction list

*For any* list of transactions, the sum of all values in `StateModule.getCategoryTotals()` must equal `StateModule.computeTotalSpending()`, and every key in the category totals map must correspond to a category present in at least one transaction.

**Validates: Requirements 5.1, 4.2**

---

### Property 4: Transaction validation rejects invalid inputs

*For any* input where the item name is empty, exceeds 100 characters, the amount is not a positive number, the amount exceeds 999,999,999.99, or no category is selected, `ValidatorModule.validateTransaction` must return `{ valid: false }` with at least one error entry.

**Validates: Requirements 1.5, 1.6, 1.7, 1.8, 1.9**

---

### Property 5: Custom category validation rejects whitespace-only and duplicate names

*For any* category name composed entirely of whitespace characters, or any trimmed name that matches an existing category name case-insensitively, `ValidatorModule.validateCustomCategory` must return `{ valid: false }`.

**Validates: Requirements 7.2, 7.3**

---

### Property 6: Sort order preserves all transactions and changes only ordering

*For any* list of transactions and any valid `SortOrder`, `SortModule.sort(transactions, order)` must return a list containing exactly the same transactions (by `id`) as the input, with no duplicates and no omissions, arranged according to the chosen order.

**Validates: Requirements 8.2**

---

### Property 7: Adding a transaction increases the transaction list length by exactly one

*For any* valid transaction added via `StateModule.addTransaction`, the length of the resulting `transactions` array must equal the previous length plus one, and the new transaction must appear as the first element (reverse-chrono insertion).

**Validates: Requirements 1.3, 2.3**

---

### Property 8: Deleting a transaction decreases the transaction list length by exactly one

*For any* existing transaction `id`, after `StateModule.removeTransaction(id)`, the resulting array must have exactly one fewer element, and no element in the resulting array may have that `id`.

**Validates: Requirements 3.2**

---

## Error Handling

| Failure Scenario | Detection | User-Facing Response |
|---|---|---|
| `localStorage` unavailable on load | `try/catch` in `StorageModule.readTransactions` | Banner error message; app initializes with empty state; Total Spending shows 0.00 |
| Stored JSON is malformed or not an array | `JSON.parse` throws or result is not `Array` | Same as above |
| `localStorage.setItem` throws on write | `try/catch` in `StorageModule.writeTransactions/Categories/Theme` | Inline error toast; **in-memory state is not mutated** |
| Chart.js CDN fails to load | `<script onerror>` handler | `PieChartModule.renderError()` replaces canvas with an error message |
| `Chart` constructor throws | `try/catch` inside `PieChartModule.init` | Same as above |
| Form submitted with invalid data | `ValidatorModule` returns errors | Inline error messages shown next to each invalid field; form not submitted |
| Custom category duplicate/blank | `ValidatorModule.validateCustomCategory` | Inline error under the custom category input |

### Error Display Conventions

- **Banner errors** (storage unavailable): fixed element below the header with `role="alert"`.
- **Inline field errors**: `<span data-error="fieldname">` elements toggled visible; associated inputs get `aria-describedby` pointing to the error span and `aria-invalid="true"`.
- **Toast notifications** (write failures): appended to a `#notifications` live region with `aria-live="polite"`, auto-dismissed after 5 s.

---

## Testing Strategy

### Dual Testing Approach

Testing uses a combination of **example-based unit tests** (specific scenarios and edge cases) and **property-based tests** (universal invariants across generated inputs).

**Recommended library:** [fast-check](https://fast-check.io/) for property-based testing (works with vanilla JS and any test runner).

**Test runner:** [Vitest](https://vitest.dev/) (zero-config, ESM-compatible, browser-mode capable).

> Because `js/app.js` is a single file, the pure-logic modules (`StorageModule`, `StateModule`, `ValidatorModule`, `SortModule`) should be extracted into importable ES modules for testing. The design uses a revealing-module / IIFE pattern in the browser but the same logic can be tested as CommonJS or ESM exports.

### Unit Tests (Example-Based)

Focus on concrete scenarios:

- Rendering the empty-state message when transaction list is empty.
- Rendering a storage-error banner when `localStorage` is unavailable.
- The form resets after a valid submission (name field is blank, category is placeholder).
- Deleting the last transaction of a category removes that category's slice (verified by checking `chart.data.labels` contains no entry for the deleted category).
- Chart.js load failure triggers the error placeholder.
- Theme toggle persists the new theme and applies `data-theme` to `<html>`.
- Default theme is `"light"` when no theme is stored.
- Transaction list renders in reverse-chrono order (newest first) by default.
- Sort by amount ascending produces the lowest-amount transaction first.

### Property-Based Tests

Each property test below maps directly to a Correctness Property in the section above. Tests use `fast-check` generators and run a minimum of **100 iterations** each.

**Tag format: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`**

| Test | Generator Inputs | Assertion |
|---|---|---|
| **Property 1** — JSON round-trip | Arbitrary `Transaction` objects (valid fields) | `deserialize(serialize([tx])) deep-equals [tx]` |
| **Property 2** — Total spending sum | Array of `Transaction` with random positive amounts | `computeTotalSpending(txs) === txs.reduce((s, t) => s + t.amount, 0)` |
| **Property 3** — Category totals consistency | Array of `Transaction` | `sum(Object.values(getCategoryTotals(txs))) === computeTotalSpending(txs)` |
| **Property 4** — Validator rejects invalid inputs | Strings of length 0, >100; non-positive numbers; amounts >999999999.99; null category | `validateTransaction(input).valid === false` |
| **Property 5** — Custom category validator | Whitespace-only strings; strings matching existing categories in different cases | `validateCustomCategory(input, existing).valid === false` |
| **Property 6** — Sort preserves all transactions | Array of `Transaction`, any `SortOrder` | `sort(txs, order).map(t=>t.id).sort() deep-equals txs.map(t=>t.id).sort()` |
| **Property 7** — Add increases length by 1 | Valid `Transaction`, existing `Transaction[]` | `addTransaction(tx).length === prev.length + 1` and first element is `tx` |
| **Property 8** — Delete decreases length by 1 | Existing `Transaction[]` and a valid `id` from it | `removeTransaction(id).length === prev.length - 1` and no element has that `id` |

### Integration / Smoke Tests

- **Smoke**: App loads without JS errors in Chrome, Firefox, Edge, Safari (manual cross-browser check or Playwright smoke run).
- **Integration**: Full add-transaction flow in a jsdom environment: fill form → submit → check TransactionList DOM → check localStorage.
- **Integration**: Delete-transaction flow: pre-populate state → activate delete → verify list, total, and chart update within 500 ms.
- **Integration**: Page reload restores previously saved transactions, categories, and theme.
- **Accessibility**: Contrast ratio ≥ 4.5:1 verified with an automated tool (e.g., `axe-core`) on both light and dark themes.
