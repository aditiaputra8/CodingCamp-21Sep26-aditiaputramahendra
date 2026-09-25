# Requirements Document

## Introduction

**Expense & Budget Visualizer** is a static, mobile-friendly single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It allows users to record daily expenses, view and manage a transaction history, track total spending, and visualize spending distribution by category via a pie chart powered by Chart.js.

All data is persisted client-side using the Browser Local Storage API. The application must run entirely without a backend and be deployable as a static site on GitHub Pages. It targets modern versions of Chrome, Firefox, Edge, and Safari.

Three optional features are included in scope:
1. **Custom categories** — users may add their own categories beyond the three defaults.
2. **Sort transactions** — users may sort the transaction list by amount or category.
3. **Dark/light mode** — users may toggle between dark and light UI themes.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense record containing an item name, an amount, and a category.
- **Transaction_List**: The rendered list of all recorded transactions shown in the UI.
- **Input_Form**: The HTML form through which the user submits a new transaction.
- **Category**: A label classifying a transaction (e.g., Food, Transport, Fun, or a custom label).
- **Default_Categories**: The three built-in categories: Food, Transport, and Fun.
- **Custom_Category**: A category added by the user beyond the Default_Categories.
- **Total_Spending**: The sum of the amounts of all transactions currently stored.
- **Pie_Chart**: The Chart.js-rendered pie chart displaying spending distribution by category.
- **Storage**: The Browser Local Storage API used to persist transaction and settings data.
- **Sort_Control**: The UI control that allows sorting the Transaction_List by amount or category.
- **Theme_Toggle**: The UI control that switches the App between dark mode and light mode.
- **Validator**: The client-side input validation logic applied to the Input_Form before submission.

---

## Requirements

---

### Requirement 1: Record a New Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new daily expense.

#### Acceptance Criteria

1. THE Input_Form SHALL contain three fields: item name (text, maximum 100 characters), amount (number), and category (select).
2. THE Input_Form SHALL populate the category select element with at least the Default_Categories (Food, Transport, Fun) on page load.
3. WHEN the user submits the Input_Form with all fields filled and valid, THE App SHALL add the transaction to the Transaction_List and persist it to Storage.
4. WHEN the user submits the Input_Form with all fields filled and valid, THE App SHALL clear all Input_Form fields and reset the category select to its default placeholder value after the transaction is saved.
5. IF the user submits the Input_Form with the item name field empty, THEN THE Validator SHALL display an inline error message indicating the item name is required.
6. IF the user submits the Input_Form with the item name field containing more than 100 characters, THEN THE Validator SHALL display an inline error message indicating the item name must not exceed 100 characters.
7. IF the user submits the Input_Form with the amount field empty, THEN THE Validator SHALL display an inline error message indicating the amount is required.
8. IF the user submits the Input_Form with an amount value that is not a positive number greater than zero or exceeds 999999999.99, THEN THE Validator SHALL display an inline error message indicating the amount must be a positive number no greater than 999,999,999.99.
9. IF the user submits the Input_Form with no category selected, THEN THE Validator SHALL display an inline error message indicating a category must be selected.
10. WHEN the Validator detects one or more invalid fields, THE App SHALL prevent the transaction from being added and retain the current values in all Input_Form fields.

---

### Requirement 2: Display the Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored transaction sorted by entry date with the most recently added entry appearing first, showing item name, amount formatted to two decimal places with the currency symbol, and category for each entry.
2. THE App SHALL render the Transaction_List on initial application load using data retrieved from Storage.
3. WHEN a new transaction is added, THE Transaction_List SHALL update to include the new entry at the top of the list without requiring a page reload.
4. WHILE the number of transactions exceeds the visible area of the Transaction_List container, THE Transaction_List SHALL remain scrollable so all entries are accessible.
5. IF Storage contains no transactions, THEN THE Transaction_List SHALL display an empty-state message indicating no expenses have been recorded.
6. IF Storage cannot be read on initial application load, THEN THE App SHALL display an error message indicating that transaction data could not be retrieved and THE Transaction_List SHALL display no entries.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a clearly labeled delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from Storage and re-render the Transaction_List within 500ms.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Total_Spending display within 500ms of the deletion.
4. WHEN a transaction is deleted, THE App SHALL update the Pie_Chart to reflect the removal of that transaction's amount from its category within 500ms of the deletion.
5. IF a transaction's deletion causes its category to have a total amount of zero, THEN THE App SHALL remove that category's slice from the Pie_Chart entirely.

---

### Requirement 4: Display Total Spending

**User Story:** As a user, I want to see my total spending at the top of the page, so that I always know how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL display the Total_Spending value at the top of the page as a formatted number with two decimal places and a currency symbol on initial load.
2. THE App SHALL calculate Total_Spending as the sum of the amounts of all transactions in Storage.
3. WHEN a transaction is added, THE App SHALL recalculate and display the updated Total_Spending within 500ms without requiring a page reload.
4. WHEN a transaction is deleted, THE App SHALL recalculate and display the updated Total_Spending within 500ms without requiring a page reload.
5. IF no transactions are stored, THEN THE App SHALL display a Total_Spending value of 0.00 with the currency symbol.
6. IF Storage is unavailable on load, THEN THE App SHALL display a Total_Spending value of 0.00 with the currency symbol and show an error notice.

---

### Requirement 5: Visualize Spending by Category (Pie Chart)

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand which categories consume the most of my budget.

#### Acceptance Criteria

1. THE App SHALL render a Pie_Chart using Chart.js that shows each category as a slice proportional to the total amount spent in that category, with only categories that have a total amount greater than zero displayed as slices.
2. THE App SHALL initialize the Pie_Chart on initial application load using data retrieved from Storage.
3. WHEN a transaction is added, THE App SHALL update the Pie_Chart to reflect the new category distribution within 500ms without requiring a page reload.
4. WHEN a transaction is deleted, THE App SHALL update the Pie_Chart to reflect the updated category distribution within 500ms without requiring a page reload.
5. THE Pie_Chart SHALL display a legend identifying each visible category by name and its corresponding slice color.
6. IF no transactions are stored, THE App SHALL display the Pie_Chart canvas in a placeholder state with a visible message indicating no data is available.
7. IF Chart.js fails to load or initialize, THEN THE App SHALL display an error message in place of the Pie_Chart indicating the chart could not be rendered.

---

### Requirement 6: Persist Data with Local Storage

**User Story:** As a user, I want my transactions to be saved in my browser, so that my data is still available when I refresh the page or reopen the tab.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Storage under the key "expense_transactions".
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Storage under the key "expense_transactions".
3. WHEN the App loads, THE App SHALL read transactions from Storage under the key "expense_transactions" and render them in the Transaction_List, the Total_Spending display, and the Pie_Chart.
4. IF Storage is unavailable or returns data that cannot be parsed as a valid JSON array on load, THEN THE App SHALL initialize with an empty transaction list and display a notice to the user that data could not be loaded.
5. WHEN any Storage write operation fails, THE App SHALL display an error message indicating the data could not be saved and THE App SHALL not modify the in-memory transaction list.

---

### Requirement 7: Custom Categories (Optional Feature 1)

**User Story:** As a user, I want to add my own expense categories, so that I can track spending in areas beyond the default options.

#### Acceptance Criteria

1. THE App SHALL provide a UI control that allows the user to enter a category name of 1 to 50 characters and save it as a new Custom_Category.
2. IF the user submits a Custom_Category with an empty name or a name consisting entirely of whitespace, THEN THE Validator SHALL prevent the category from being saved and display an inline error indicating the category name is required.
3. IF the user submits a Custom_Category whose name, after trimming leading and trailing whitespace, is identical to an existing category name using a case-insensitive comparison, THEN THE Validator SHALL prevent the duplicate from being saved and display an inline error indicating the category already exists.
4. IF the user submits a Custom_Category name exceeding 50 characters, THEN THE Validator SHALL prevent the category from being saved and display an inline error indicating the name must not exceed 50 characters.
5. WHEN a valid Custom_Category is saved, THE App SHALL add it to the category select in the Input_Form within 500ms.
6. WHEN a valid Custom_Category is saved, THE App SHALL persist the updated category list to Storage under the key "expense_categories" so it is available after page reload.
7. THE App SHALL load any previously saved Custom_Categories from Storage under the key "expense_categories" on page load and include them in the Input_Form category select before the user interacts with the form.

---

### Requirement 8: Sort Transactions (Optional Feature 2)

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can find and compare entries more easily.

#### Acceptance Criteria

1. THE App SHALL display a Sort_Control that offers the following sort options: sort by amount ascending, sort by amount descending, and sort by category alphabetically (A to Z).
2. WHEN the user selects a sort option, THE App SHALL re-render the Transaction_List in the chosen order within 500ms without altering the data persisted in Storage.
3. WHEN a new transaction is added while a sort option is active, THE App SHALL render the Transaction_List in the currently active sort order after adding the new entry.
4. WHEN a transaction is deleted while a sort option is active, THE App SHALL re-render the Transaction_List in the currently active sort order after removing the deleted entry.
5. WHEN no sort option is selected or the sort control is reset, THE App SHALL display transactions in reverse chronological order (newest first).

---

### Requirement 9: Dark/Light Mode (Optional Feature 3)

**User Story:** As a user, I want to switch between a dark theme and a light theme, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL display a Theme_Toggle control that switches the UI between dark mode and light mode.
2. WHEN the user activates the Theme_Toggle, THE App SHALL apply the selected theme to all visible UI elements within 300ms.
3. WHEN the user activates the Theme_Toggle, THE App SHALL persist the selected theme preference to Storage under the key "expense_theme".
4. WHEN the App loads, THE App SHALL read the theme preference from Storage under the key "expense_theme" and apply it before rendering page content, preventing a flash of the unselected theme.
5. IF no theme preference is stored under the key "expense_theme", THE App SHALL default to the light theme on load.
6. THE dark theme SHALL maintain a minimum contrast ratio of 4.5:1 between text and background colors.
7. THE light theme SHALL maintain a minimum contrast ratio of 4.5:1 between text and background colors.

---

### Requirement 10: Responsive and Accessible UI

**User Story:** As a user, I want the application to work well on my phone as well as my desktop, so that I can record expenses anywhere.

#### Acceptance Criteria

1. THE App SHALL use a single CSS file located at `css/styles.css` and a single JavaScript file located at `js/app.js`.
2. THE App SHALL apply a responsive layout that adapts to viewport widths from 320px to 1440px without causing horizontal scrolling at any width within that range.
3. THE App SHALL use a minimum font size of 14px for all body text.
4. THE App SHALL maintain a minimum contrast ratio of 4.5:1 between text and background in both light and dark themes, as required by WCAG 2.1 AA Success Criterion 1.4.3.
5. THE App SHALL be fully functional in the latest stable releases of Chrome, Firefox, Edge, and Safari.
6. THE App SHALL be deployable as a static site on GitHub Pages with no server-side dependencies.
7. ALL Input_Form fields and interactive controls SHALL have associated accessible labels so that screen readers can identify the purpose of each control.

---

## Application Structure

```
/
├── index.html
├── css/
│   └── styles.css
└── js/
    └── app.js
```

---

## Data Model

```json
// Storage key: "expense_transactions"
[
  {
    "id": "<uuid or timestamp string>",
    "name": "Lunch",
    "amount": 45000,
    "category": "Food",
    "createdAt": "<ISO 8601 timestamp>"
  }
]

// Storage key: "expense_categories"
["Food", "Transport", "Fun", "CustomCategoryName"]

// Storage key: "expense_theme"
"light" | "dark"
```

---

## Main Components

| Component | Responsibility |
|---|---|
| Input Form | Collects and validates new transaction data |
| Transaction List | Renders, scrolls, and provides deletion for all transactions |
| Total Spending Display | Shows the running sum of all transaction amounts |
| Pie Chart (Chart.js) | Visualizes spending per category |
| Sort Control | Re-orders the Transaction List without modifying Storage |
| Custom Category Manager | Adds user-defined categories to the select and Storage |
| Theme Toggle | Switches and persists the dark/light theme preference |
| Storage Module | Centralizes all read/write operations to Local Storage |

---

## User Flow

1. User opens `index.html` → App reads Storage, renders Total Spending, Transaction List, Pie Chart, and applies saved theme.
2. User fills in the Input Form (name, amount, category) → Validator checks fields.
3. On valid submission → Transaction is saved to Storage, Transaction List updates, Total Spending updates, Pie Chart updates, form resets.
4. User clicks delete on a transaction → Transaction removed from Storage, all dependent views update.
5. User adds a Custom Category → Category saved to Storage, category select updates immediately.
6. User changes sort order → Transaction List re-renders in selected order (Storage unchanged).
7. User toggles theme → Theme applied instantly and saved to Storage.

---

## Implementation Order

1. Project scaffold — `index.html`, `css/styles.css`, `js/app.js`
2. Storage module — read/write helpers for transactions, categories, and theme
3. Input Form — markup, default categories, validation
4. Transaction List — render, scroll, delete
5. Total Spending — calculation and display
6. Pie Chart — Chart.js integration, initial render, update on data change
7. Custom Categories — UI, validation, Storage persistence
8. Sort Control — sort logic and re-render
9. Dark/Light Mode — CSS variables for themes, toggle, Storage persistence
10. Responsive polish — media queries, contrast, font sizes, cross-browser check
