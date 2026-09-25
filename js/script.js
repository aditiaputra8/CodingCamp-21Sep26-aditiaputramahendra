/* =============================================================
   Expense & Budget Visualizer — js/script.js
   ============================================================= */

'use strict';

/* -------------------------------------------------------------
   STORAGE MODULE
   Centralizes all localStorage access.
   Every method wraps its operation in try/catch and returns
   { ok: boolean, data?, error? } so callers can handle failures.
   ------------------------------------------------------------- */
const StorageModule = (() => {
  const KEYS = {
    transactions: 'expense_transactions',
    categories:   'expense_categories',
    theme:        'expense_theme',
  };

  // --------------- internal helpers ---------------

  function showStorageBanner() {
    const banner = document.getElementById('storage-banner');
    if (banner) banner.classList.remove('hidden');
  }

  function showToast(message) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.add('toast--fade');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400); // allow CSS fade transition
    }, 5000);
  }

  // --------------- public API ---------------

  function readTransactions() {
    try {
      const raw = localStorage.getItem(KEYS.transactions);
      if (raw === null) return { ok: true, data: [] };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Stored transactions is not an array');
      return { ok: true, data: parsed };
    } catch (err) {
      showStorageBanner();
      return { ok: false, data: [], error: err.message };
    }
  }

  function writeTransactions(transactions) {
    try {
      localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
      return { ok: true };
    } catch (err) {
      showToast('⚠️ Could not save transactions. Changes may be lost.');
      return { ok: false, error: err.message };
    }
  }

  function readCategories() {
    try {
      const raw = localStorage.getItem(KEYS.categories);
      if (raw === null) return { ok: true, data: [] };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Stored categories is not an array');
      return { ok: true, data: parsed };
    } catch (err) {
      return { ok: false, data: [], error: err.message };
    }
  }

  function writeCategories(categories) {
    try {
      localStorage.setItem(KEYS.categories, JSON.stringify(categories));
      return { ok: true };
    } catch (err) {
      showToast('⚠️ Could not save categories. Changes may be lost.');
      return { ok: false, error: err.message };
    }
  }

  function readTheme() {
    try {
      const raw = localStorage.getItem(KEYS.theme);
      if (raw === 'dark') return { ok: true, data: 'dark' };
      return { ok: true, data: 'light' }; // default to light
    } catch (err) {
      return { ok: false, data: 'light', error: err.message };
    }
  }

  function writeTheme(theme) {
    try {
      localStorage.setItem(KEYS.theme, theme);
      return { ok: true };
    } catch (err) {
      showToast('⚠️ Could not save theme preference.');
      return { ok: false, error: err.message };
    }
  }

  return {
    readTransactions,
    writeTransactions,
    readCategories,
    writeCategories,
    readTheme,
    writeTheme,
  };
})();


/* -------------------------------------------------------------
   IN-MEMORY STATE
   Single source of truth for the current session.
   ------------------------------------------------------------- */
const state = {
  transactions: [], // Transaction[] — master list, reverse-chrono order
  categories:   [], // string[]      — default + custom categories
  theme:        'light',
  sortOrder:    'chrono',
};


/* -------------------------------------------------------------
   STATE MODULE
   Pure mutation helpers that operate on the shared `state`
   object. Callers are responsible for calling StorageModule
   and view updaters afterwards.
   ------------------------------------------------------------- */
const StateModule = (() => {

  /** Prepend a transaction to the master list (reverse-chrono). */
  function addTransaction(tx) {
    state.transactions.unshift(tx);
    return state.transactions;
  }

  /** Remove a transaction by id. */
  function removeTransaction(id) {
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    return state.transactions;
  }

  /** Append a trimmed category name to the categories list. */
  function addCategory(name) {
    state.categories.push(name.trim());
    return state.categories;
  }

  /** Sum of all transaction amounts. */
  function computeTotalSpending() {
    return state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Returns { [category]: total } for categories whose total > 0.
   * Used by the pie chart.
   */
  function getCategoryTotals() {
    const totals = {};
    for (const tx of state.transactions) {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    }
    // Remove any that ended up at 0 (shouldn't happen, but guard anyway)
    for (const key of Object.keys(totals)) {
      if (totals[key] <= 0) delete totals[key];
    }
    return totals;
  }

  /**
   * Returns a sorted copy of state.transactions based on state.sortOrder.
   * SortModule (Task 7) will handle the full sort logic; for now only
   * 'chrono' (reverse-chronological insertion order) is implemented.
   */
  function getSortedTransactions() {
    // Delegate to SortModule when it is available; fall back to chrono copy.
    if (typeof SortModule !== 'undefined') {
      return SortModule.sort(state.transactions, state.sortOrder);
    }
    // Default: return a shallow copy preserving insertion order (already reverse-chrono)
    return [...state.transactions];
  }

  return {
    addTransaction,
    removeTransaction,
    addCategory,
    computeTotalSpending,
    getCategoryTotals,
    getSortedTransactions,
  };
})();


/* -------------------------------------------------------------
   VALIDATOR MODULE
   Validates Input Form values before a transaction is built.
   Returns { valid: boolean, errors: [{ field, message }] }.
   ------------------------------------------------------------- */
const ValidatorModule = (() => {
  const MAX_NAME_LENGTH   = 100;
  const MAX_AMOUNT        = 999999999.99;

  /**
   * Validate the three Input Form fields.
   * @param {{ name: string, amount: string|number, category: string }} fields
   * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
   */
  function validateTransaction({ name, amount, category }) {
    const errors = [];

    // ── Item Name ─────────────────────────────────────────────
    const trimmedName = (name || '').trim();
    if (trimmedName.length === 0) {
      errors.push({ field: 'name', message: 'Item name is required.' });
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.push({ field: 'name', message: `Item name must not exceed ${MAX_NAME_LENGTH} characters.` });
    }

    // ── Amount ────────────────────────────────────────────────
    const rawAmount = String(amount).trim();
    if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
      errors.push({ field: 'amount', message: 'Amount is required.' });
    } else {
      const numAmount = parseFloat(rawAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be a positive number greater than zero.' });
      } else if (numAmount > MAX_AMOUNT) {
        errors.push({ field: 'amount', message: `Amount must not exceed ${MAX_AMOUNT.toLocaleString('en-US', { minimumFractionDigits: 2 })}.` });
      }
    }

    // ── Category ──────────────────────────────────────────────
    if (!category || category.trim() === '') {
      errors.push({ field: 'category', message: 'Please select a category.' });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a custom category name against existing categories.
   * @param {{ name: string, existingCategories: string[] }} param
   * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
   */
  function validateCustomCategory({ name, existingCategories }) {
    const errors = [];
    const trimmed = (name || '').trim();

    if (trimmed.length === 0) {
      errors.push({ field: 'custom-category', message: 'Category name is required.' });
    } else if (trimmed.length > 50) {
      errors.push({ field: 'custom-category', message: 'Category name must not exceed 50 characters.' });
    } else {
      const duplicate = (existingCategories || []).some(
        cat => cat.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        errors.push({ field: 'custom-category', message: 'This category already exists.' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  return { validateTransaction, validateCustomCategory };
})();


/* -------------------------------------------------------------
   FORM HELPERS
   showFieldError / clearFieldErrors manage inline error spans
   and aria-invalid attributes on the Input Form fields.
   ------------------------------------------------------------- */

/**
 * Display an inline error for a named field.
 * Finds the [data-error="<field>"] span, sets its text, and
 * marks the corresponding input/select as aria-invalid="true".
 * @param {string} field  — matches the data-error attribute value and the input's name attribute
 * @param {string} message — human-readable error text
 */
function showFieldError(field, message) {
  const errorSpan = document.querySelector(`[data-error="${field}"]`);
  if (errorSpan) {
    errorSpan.textContent = message;
    errorSpan.classList.remove('hidden');
  }

  // Set aria-invalid on the associated input/select (matched by name attribute)
  const input = document.querySelector(`[name="${field}"]`);
  if (input) {
    input.setAttribute('aria-invalid', 'true');
  }
}

/**
 * Clear all inline error spans and reset aria-invalid on all form fields.
 */
function clearFieldErrors() {
  // Reset all [data-error] spans in the form
  const errorSpans = document.querySelectorAll('#expense-form [data-error]');
  errorSpans.forEach(span => {
    span.textContent = '';
    span.classList.add('hidden');
  });

  // Reset aria-invalid on all inputs and selects in the form
  const fields = document.querySelectorAll('#expense-form input, #expense-form select');
  fields.forEach(field => {
    field.removeAttribute('aria-invalid');
  });
}


/* -------------------------------------------------------------
   EXPENSE FORM — SUBMIT HANDLER
   Wired up during App.init(); defined here so it is available
   before the DOM is ready (function declaration hoisting).
   ------------------------------------------------------------- */
function handleExpenseFormSubmit(event) {
  event.preventDefault();

  const form     = event.target;
  const nameVal  = form.elements['name'].value;
  const amountVal = form.elements['amount'].value;
  const categoryVal = form.elements['category'].value;

  // 1. Clear any previous inline errors
  clearFieldErrors();

  // 2. Validate
  const { valid, errors } = ValidatorModule.validateTransaction({
    name:     nameVal,
    amount:   amountVal,
    category: categoryVal,
  });

  if (!valid) {
    // Show inline errors; retain existing field values (form is not reset)
    errors.forEach(({ field, message }) => showFieldError(field, message));
    return;
  }

  // 3. Build Transaction object
  const tx = {
    id:        crypto.randomUUID(),
    name:      nameVal.trim(),
    amount:    parseFloat(amountVal),
    category:  categoryVal,
    createdAt: new Date().toISOString(),
  };

  // 4. Mutate state
  StateModule.addTransaction(tx);

  // 5. Persist
  StorageModule.writeTransactions(state.transactions);

  // 6. Update views
  TotalSpending.render(StateModule.computeTotalSpending());
  TransactionList.render(StateModule.getSortedTransactions());
  if (typeof PieChartModule !== 'undefined') {
    PieChartModule.update(StateModule.getCategoryTotals());
  }

  // 7. Reset form fields and return category select to placeholder
  form.reset();
}


/* -------------------------------------------------------------
   TRANSACTION LIST MODULE
   Renders the transaction list into #transaction-list.
   Uses event delegation for delete actions.
   ------------------------------------------------------------- */
const TransactionList = (() => {

  /** Currency formatter — Rp with two decimal places. */
  const currencyFmt = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  /**
   * Format an amount as a currency string.
   * Intl.NumberFormat for IDR produces "Rp 45.000,00" in id-ID locale.
   * We normalise it to a clean "Rp 45,000.00" for consistency.
   */
  function formatAmount(amount) {
    return currencyFmt.format(amount);
  }

  /**
   * Escape HTML special characters to prevent XSS when inserting
   * user-provided strings into innerHTML.
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build and inject the transaction list HTML.
   * Each row is a list item with the item name, category, amount,
   * and a delete button carrying a data-id attribute.
   * @param {Transaction[]} transactions
   */
  function render(transactions) {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      renderEmpty();
      return;
    }

    const rows = transactions.map(tx => `
      <div class="transaction-item" role="listitem">
        <div class="transaction-item__info">
          <span class="transaction-item__name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</span>
          <span class="transaction-item__meta">${escapeHtml(tx.category)}</span>
        </div>
        <span class="transaction-item__amount">${formatAmount(tx.amount)}</span>
        <button
          class="btn btn--danger"
          type="button"
          data-id="${escapeHtml(tx.id)}"
          aria-label="Delete ${escapeHtml(tx.name)}"
        >Delete</button>
      </div>
    `).join('');

    container.innerHTML = rows;
  }

  /** Show the empty-state message. */
  function renderEmpty() {
    const container = document.getElementById('transaction-list');
    if (!container) return;
    container.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
  }

  /** Show an error message inside the list container. */
  function renderError(message) {
    const container = document.getElementById('transaction-list');
    if (!container) return;
    container.innerHTML = `<p class="error-state">${escapeHtml(message || 'Transaction data could not be loaded.')}</p>`;
  }

  /**
   * Attach a single delegated click listener on #transaction-list.
   * Checks for data-id on the clicked element (or its ancestor up to
   * the container) to identify delete button clicks.
   * Called once from App.init().
   */
  function attachDeleteListener() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    container.addEventListener('click', (event) => {
      // Walk up from the click target to find a [data-id] element
      let target = event.target;
      while (target && target !== container) {
        if (target.dataset && target.dataset.id) {
          handleDelete(target.dataset.id);
          return;
        }
        target = target.parentElement;
      }
    });
  }

  /**
   * Handle a delete action for the given transaction id.
   * Mutates state, persists, and synchronously re-renders all views.
   * @param {string} id
   */
  function handleDelete(id) {
    // 1. Remove from in-memory state
    StateModule.removeTransaction(id);

    // 2. Persist updated transaction list
    StorageModule.writeTransactions(state.transactions);

    // 3. Re-render transaction list
    const sorted = StateModule.getSortedTransactions();
    if (sorted.length === 0) {
      renderEmpty();
    } else {
      render(sorted);
    }

    // 4. Re-render total spending
    TotalSpending.render(StateModule.computeTotalSpending());

    // 5. Update pie chart (PieChartModule implemented in Task 6)
    if (typeof PieChartModule !== 'undefined') {
      const totals = StateModule.getCategoryTotals();
      if (Object.keys(totals).length === 0) {
        PieChartModule.renderPlaceholder();
      } else {
        PieChartModule.update(totals);
      }
    }
  }

  return { render, renderEmpty, renderError, attachDeleteListener };
})();


/* -------------------------------------------------------------
   TOTAL SPENDING MODULE                                  Task 5
   Updates the #total-spending element with a formatted total.
   ------------------------------------------------------------- */
const TotalSpending = (() => {

  /** Currency formatter — IDR with two decimal places. */
  const currencyFmt = new Intl.NumberFormat('id-ID', {
    style:                 'currency',
    currency:              'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  /**
   * Update #total-spending with the formatted total.
   * @param {number} total
   */
  function render(total) {
    const el = document.getElementById('total-spending');
    if (!el) return;
    el.textContent = currencyFmt.format(total);
  }

  /**
   * Display Rp 0.00 in the total spending element (storage error fallback).
   */
  function renderError() {
    render(0);
  }

  return { render, renderError };
})();


/* -------------------------------------------------------------
   PIE CHART MODULE                                       Task 6
   Wraps a single Chart.js v4 instance.

   Public API:
     init(categoryTotals)        — create the Chart instance
     update(categoryTotals)      — mutate data in-place + chart.update()
     renderPlaceholder()         — show "no data" message
     renderError()               — replace canvas with an error message
   ------------------------------------------------------------- */
const PieChartModule = (() => {

  // Fixed palette of 8 accessible colors (WCAG AA contrast on white/dark bg).
  // Cycled when there are more than 8 categories.
  const COLOR_PALETTE = [
    '#E63946', // vivid red
    '#2A9D8F', // teal
    '#E9C46A', // golden yellow
    '#457B9D', // steel blue
    '#F4A261', // sandy orange
    '#6A4C93', // purple
    '#2DC653', // green
    '#FF6B6B', // coral
  ];

  /** Module-level Chart.js instance; null until init() succeeds. */
  let chartInstance = null;

  // --------------- private helpers ---------------

  /**
   * Given a categoryTotals object, return parallel arrays of labels and data,
   * filtering out any categories with a total of 0.
   * @param {Record<string,number>} categoryTotals
   * @returns {{ labels: string[], data: number[], colors: string[] }}
   */
  function buildChartData(categoryTotals) {
    const entries = Object.entries(categoryTotals).filter(([, v]) => v > 0);
    const labels = entries.map(([k]) => k);
    const data   = entries.map(([, v]) => v);
    const colors = labels.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]);
    return { labels, data, colors };
  }

  /**
   * Return the canvas element; null if not found.
   */
  function getCanvas() {
    return document.getElementById('pie-chart');
  }

  /**
   * Return the chart container element; null if not found.
   */
  function getContainer() {
    return document.getElementById('chart-container');
  }

  /**
   * Hide the placeholder text and make the canvas visible.
   */
  function hidePlaceholder() {
    const placeholder = document.getElementById('chart-placeholder');
    if (placeholder) placeholder.classList.add('hidden');
    const canvas = getCanvas();
    if (canvas) canvas.classList.remove('hidden');
  }

  /**
   * Show the placeholder text and hide the canvas.
   */
  function showPlaceholder() {
    const placeholder = document.getElementById('chart-placeholder');
    if (placeholder) placeholder.classList.remove('hidden');
    const canvas = getCanvas();
    if (canvas) canvas.classList.add('hidden');
  }

  // --------------- public API ---------------

  /**
   * Create the Chart.js pie chart.
   * Guards against Chart being undefined (CDN failure).
   * @param {Record<string,number>} categoryTotals
   */
  function init(categoryTotals) {
    // Guard: Chart.js CDN may have failed to load
    if (typeof Chart === 'undefined') {
      renderError();
      return;
    }

    const canvas = getCanvas();
    if (!canvas) {
      renderError();
      return;
    }

    // If a previous instance exists (e.g. re-init after error), destroy it first
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const { labels, data, colors } = buildChartData(categoryTotals || {});

    try {
      chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: 'rgba(255,255,255,0.6)',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                padding: 16,
                font: { size: 13 },
                // Use CSS variable colors if possible; Chart.js reads computed styles
                color: getComputedStyle(document.documentElement)
                         .getPropertyValue('--color-text').trim() || '#111',
              },
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const total = context.dataset.data.reduce((s, v) => s + v, 0);
                  const value = context.parsed;
                  const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  const fmt   = new Intl.NumberFormat('id-ID', {
                    style: 'currency', currency: 'IDR',
                    minimumFractionDigits: 2, maximumFractionDigits: 2,
                  });
                  return ` ${fmt.format(value)} (${pct}%)`;
                },
              },
            },
          },
        },
      });

      hidePlaceholder();
    } catch (err) {
      renderError();
    }
  }

  /**
   * Mutate the existing Chart.js instance's data in-place and redraw.
   * Does NOT destroy and recreate the chart.
   * If no chart instance exists yet, falls back to init().
   * @param {Record<string,number>} categoryTotals
   */
  function update(categoryTotals) {
    if (!chartInstance) {
      // No chart yet — initialise it (covers edge cases like CDN being slow)
      init(categoryTotals);
      return;
    }

    const { labels, data, colors } = buildChartData(categoryTotals || {});

    if (labels.length === 0) {
      renderPlaceholder();
      return;
    }

    // Mutate in-place (Chart.js v4 supports this without destroy/recreate)
    chartInstance.data.labels                    = labels;
    chartInstance.data.datasets[0].data          = data;
    chartInstance.data.datasets[0].backgroundColor = colors;

    // Update legend text color in case the theme changed
    chartInstance.options.plugins.legend.labels.color =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text').trim() || '#111';

    chartInstance.update();
    hidePlaceholder();
  }

  /**
   * Show the "no data" placeholder message; hide the canvas.
   * Called when there are no transactions.
   */
  function renderPlaceholder() {
    // Destroy any existing chart instance so the canvas is clean
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    showPlaceholder();
  }

  /**
   * Replace the chart area with an error message.
   * Called when Chart.js fails to load from CDN or the constructor throws.
   */
  function renderError() {
    const container = getContainer();
    if (!container) return;
    container.innerHTML =
      '<p class="error-state" role="alert">⚠️ Chart could not be rendered. ' +
      'The charting library may have failed to load.</p>';
  }

  return { init, update, renderPlaceholder, renderError };
})();


/* -------------------------------------------------------------
   SORT MODULE                                           Task 7
   Provides sort logic for the transaction list.
   Operates on a copy — never mutates state.transactions.
   ------------------------------------------------------------- */
const SortModule = (() => {
  /**
   * Sort a copy of transactions according to the given order.
   * @param {Transaction[]} transactions
   * @param {'chrono'|'amount-asc'|'amount-desc'|'category-az'} order
   * @returns {Transaction[]}
   */
  function sort(transactions, order) {
    const copy = [...transactions];
    switch (order) {
      case 'amount-asc':
        return copy.sort((a, b) => a.amount - b.amount);
      case 'amount-desc':
        return copy.sort((a, b) => b.amount - a.amount);
      case 'category-az':
        return copy.sort((a, b) => a.category.localeCompare(b.category));
      case 'chrono':
      default:
        return copy; // insertion order is already reverse-chrono
    }
  }

  return { sort };
})();


/* -------------------------------------------------------------
   CUSTOM CATEGORY MODULE                                Task 7
   Handles adding user-defined categories beyond the defaults.
   Validates the input, updates state + storage, and rebuilds
   the category <select> in the Input Form.
   ------------------------------------------------------------- */
const CustomCategoryModule = (() => {

  /**
   * Show an inline error on the custom-category input.
   * @param {string} message
   */
  function showError(message) {
    const errorSpan = document.querySelector('[data-error="custom-category"]');
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.classList.remove('hidden');
    }
    const input = document.getElementById('custom-category-input');
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  /**
   * Clear the inline error on the custom-category input.
   */
  function clearError() {
    const errorSpan = document.querySelector('[data-error="custom-category"]');
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.classList.add('hidden');
    }
    const input = document.getElementById('custom-category-input');
    if (input) input.removeAttribute('aria-invalid');
  }

  /**
   * Rebuild the <option> elements in the expense-category <select>,
   * keeping the disabled placeholder as the first option.
   * @param {string[]} categories
   */
  function populateCategorySelect(categories) {
    const select = document.getElementById('expense-category');
    if (!select) return;

    // Remove all options except the first (disabled placeholder)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add one <option> per category
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  }

  /**
   * Validate and save a new custom category.
   * On success: mutates state, persists, updates the select.
   * On failure: shows the inline error.
   * @param {string} rawName  — the raw value from the text input
   */
  function addCategory(rawName) {
    clearError();

    const { valid, errors } = ValidatorModule.validateCustomCategory({
      name: rawName,
      existingCategories: state.categories,
    });

    if (!valid) {
      // Show the first error (there will only ever be one for this control)
      showError(errors[0].message);
      return;
    }

    const trimmed = rawName.trim();

    // 1. Mutate in-memory state
    StateModule.addCategory(trimmed);

    // 2. Persist updated category list
    StorageModule.writeCategories(state.categories);

    // 3. Rebuild the category select
    populateCategorySelect(state.categories);

    // 4. Clear the input field
    const input = document.getElementById('custom-category-input');
    if (input) input.value = '';
  }

  /**
   * Attach the click listener on the "Add Category" button.
   * Called once from App.init().
   */
  function init() {
    const btn = document.getElementById('add-category-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const input = document.getElementById('custom-category-input');
      const rawName = input ? input.value : '';
      addCategory(rawName);
    });

    // Also allow submitting by pressing Enter inside the input
    const input = document.getElementById('custom-category-input');
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addCategory(input.value);
        }
      });
    }
  }

  return { init, addCategory, populateCategorySelect };
})();


/* -------------------------------------------------------------
   THEME MODULE                                          Task 7
   Applies and persists the dark/light theme preference.
   Theme is applied by setting data-theme on <html> so CSS
   custom-property overrides in [data-theme="dark"] take effect.
   ------------------------------------------------------------- */
const ThemeModule = (() => {
  /**
   * Apply a theme by setting data-theme on <html>.
   * @param {'light'|'dark'} theme
   */
  function apply(theme) {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);

    // Update the toggle button icon to reflect the current theme
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = resolved === 'dark' ? '☀️' : '🌙';
  }

  /**
   * Toggle between dark and light, persist, and re-apply.
   */
  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    state.theme = next;
    apply(next);
    StorageModule.writeTheme(next);

    // Chart legend text color needs updating after theme change
    if (typeof PieChartModule !== 'undefined') {
      PieChartModule.update(StateModule.getCategoryTotals());
    }
  }

  return { apply, toggle };
})();


/* -------------------------------------------------------------
   APP INITIALIZATION
   Wires all modules together and bootstraps the application.
   ------------------------------------------------------------- */
const App = (() => {

  function init() {
    // ── Step 1: Apply saved theme BEFORE paint to avoid flash ─────────
    const themeResult = StorageModule.readTheme();
    state.theme = themeResult.data || 'light';
    ThemeModule.apply(state.theme);

    // ── Step 2: Read transactions and categories from storage ──────────
    const txResult  = StorageModule.readTransactions();
    const catResult = StorageModule.readCategories();

    // Show the storage banner if either critical read failed
    if (!txResult.ok || !catResult.ok) {
      const banner = document.getElementById('storage-banner');
      if (banner) banner.classList.remove('hidden');
    }

    // ── Step 3: Initialize in-memory state ────────────────────────────
    const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

    // Merge stored custom categories with defaults (deduplicated, case-insensitive)
    const storedCats = catResult.data || [];
    const merged = [...DEFAULT_CATEGORIES];
    for (const cat of storedCats) {
      const trimmed = cat.trim();
      if (trimmed && !merged.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        merged.push(trimmed);
      }
    }

    state.transactions = txResult.data || [];
    state.categories   = merged;

    // ── Step 4: Populate the category <select> ────────────────────────
    // CustomCategoryModule owns the select population logic.
    CustomCategoryModule.populateCategorySelect(state.categories);

    // ── Step 5: Initialize CustomCategoryModule (attach button listener) ──
    CustomCategoryModule.init();

    // ── Step 6: Attach form submit listener ───────────────────────────
    const form = document.getElementById('expense-form');
    if (form) {
      form.addEventListener('submit', handleExpenseFormSubmit);
    }

    // ── Step 7: Attach Sort Control listener ──────────────────────────
    const sortControl = document.getElementById('sort-control');
    if (sortControl) {
      sortControl.addEventListener('change', () => {
        state.sortOrder = sortControl.value;
        TransactionList.render(StateModule.getSortedTransactions());
      });
    }

    // ── Step 8: Render Total Spending ─────────────────────────────────
    if (txResult.ok) {
      TotalSpending.render(StateModule.computeTotalSpending());
    } else {
      TotalSpending.renderError();
    }

    // ── Step 9: Render Transaction List ───────────────────────────────
    if (!txResult.ok) {
      TransactionList.renderError('Transaction data could not be retrieved.');
    } else if (state.transactions.length === 0) {
      TransactionList.renderEmpty();
    } else {
      TransactionList.render(StateModule.getSortedTransactions());
    }
    TransactionList.attachDeleteListener();

    // ── Step 10: Initialize Pie Chart ─────────────────────────────────
    const categoryTotals = StateModule.getCategoryTotals();
    if (Object.keys(categoryTotals).length === 0) {
      PieChartModule.renderPlaceholder();
    } else {
      PieChartModule.init(categoryTotals);
    }

    // ── Step 11: Attach Theme Toggle listener ─────────────────────────
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => ThemeModule.toggle());
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
