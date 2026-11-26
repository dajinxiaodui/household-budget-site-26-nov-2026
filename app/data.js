// data.js — categories, sample household, and localStorage persistence.
// Everything the site shows comes from here or from the household's own
// entries; nothing is fetched from anywhere else.

export const STORAGE_KEY = 'nestegg-budget-v1';

/** Expense categories, each with its own chart colour. */
export const EXPENSE_CATEGORIES = [
  { name: 'Housing', color: '#2f6f6a' },
  { name: 'Groceries', color: '#4c9a6c' },
  { name: 'Transport', color: '#d9a441' },
  { name: 'Utilities', color: '#7a8ba0' },
  { name: 'Dining Out', color: '#c96f4a' },
  { name: 'Entertainment', color: '#8a6fb8' },
  { name: 'Health', color: '#4a90b8' },
  { name: 'Shopping', color: '#b85c8a' },
  { name: 'Savings', color: '#3e7d5b' },
  { name: 'Other', color: '#9a938a' },
];

/** Income categories. */
export const INCOME_CATEGORIES = [
  { name: 'Salary', color: '#2f6f6a' },
  { name: 'Freelance', color: '#4c9a6c' },
  { name: 'Other Income', color: '#d9a441' },
];

export function categoryColor(name) {
  const found = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(
    (c) => c.name === name,
  );
  return found ? found.color : '#9a938a';
}

/** A realistic month for a two-adult household, November 2026. */
export const SAMPLE_BUDGETS = {
  Housing: 1500,
  Groceries: 600,
  Transport: 220,
  Utilities: 220,
  'Dining Out': 200,
  Entertainment: 90,
  Health: 150,
  Shopping: 180,
  Savings: 400,
  Other: 60,
};

function tx(id, date, type, category, description, amount) {
  return { id, date, type, category, description, amount };
}

export const SAMPLE_TRANSACTIONS = [
  // November 2026 — the month the screenshots show.
  tx('s01', '2026-11-01', 'income', 'Salary', 'Monthly salary — Maya', 5200),
  tx('s02', '2026-11-01', 'expense', 'Housing', 'Rent — Maple Court Apt 4B', 1450),
  tx('s03', '2026-11-01', 'expense', 'Savings', 'Transfer to emergency fund', 400),
  tx('s04', '2026-11-02', 'expense', 'Transport', 'Fuel — Shell on 5th', 48),
  tx('s05', '2026-11-03', 'expense', 'Groceries', 'Weekly shop — GreenMart', 186.4),
  tx('s06', '2026-11-05', 'expense', 'Utilities', 'Electric bill — City Power', 96.3),
  tx('s07', '2026-11-06', 'expense', 'Entertainment', 'Streaming — movies + music', 15.99),
  tx('s08', '2026-11-07', 'expense', 'Dining Out', 'Dinner with the Patels', 64.8),
  tx('s09', '2026-11-08', 'expense', 'Utilities', 'Internet — Fiber 300', 59),
  tx('s10', '2026-11-09', 'expense', 'Health', 'Pharmacy — allergy meds', 28.4),
  tx('s11', '2026-11-10', 'expense', 'Groceries', 'Weekly shop — GreenMart', 142.75),
  tx('s12', '2026-11-11', 'expense', 'Shopping', 'Winter coats for the kids', 89.99),
  tx('s13', '2026-11-12', 'expense', 'Transport', 'Monthly transit pass', 85),
  tx('s14', '2026-11-13', 'expense', 'Dining Out', 'Lunch — noodle bar', 38.5),
  tx('s15', '2026-11-14', 'income', 'Freelance', 'Weekend design work — Leo', 640),
  tx('s16', '2026-11-15', 'expense', 'Utilities', 'Water bill', 41.2),
  tx('s17', '2026-11-16', 'expense', 'Entertainment', 'Movie night — cinema', 46),
  tx('s18', '2026-11-17', 'expense', 'Groceries', 'Weekly shop — GreenMart', 98.2),
  tx('s19', '2026-11-18', 'expense', 'Other', 'School fundraiser ticket', 25),
  tx('s20', '2026-11-19', 'expense', 'Health', 'Dentist copay — checkup', 75),
  tx('s21', '2026-11-20', 'expense', 'Transport', 'Fuel — Shell on 5th', 42.5),
  tx('s22', '2026-11-21', 'expense', 'Dining Out', 'Saturday pizza night', 72.25),
  tx('s23', '2026-11-22', 'expense', 'Shopping', 'Batteries, bulbs, hooks', 54.3),
  tx('s24', '2026-11-24', 'expense', 'Groceries', 'Weekly shop — GreenMart', 121.55),
  // October 2026 — so the trend chart has something to compare.
  tx('s25', '2026-10-01', 'income', 'Salary', 'Monthly salary — Maya', 5200),
  tx('s26', '2026-10-01', 'expense', 'Housing', 'Rent — Maple Court Apt 4B', 1450),
  tx('s27', '2026-10-01', 'expense', 'Savings', 'Transfer to emergency fund', 400),
  tx('s28', '2026-10-07', 'expense', 'Groceries', 'Weekly shop — GreenMart', 168.9),
  tx('s29', '2026-10-09', 'expense', 'Utilities', 'Electric + internet', 152.4),
  tx('s30', '2026-10-14', 'expense', 'Groceries', 'Weekly shop — GreenMart', 154.2),
  tx('s31', '2026-10-18', 'expense', 'Dining Out', 'Birthday dinner', 96.5),
  tx('s32', '2026-10-21', 'expense', 'Transport', 'Fuel + transit', 131),
  tx('s33', '2026-10-24', 'expense', 'Shopping', 'New kettle + towels', 73.6),
  tx('s34', '2026-10-28', 'expense', 'Groceries', 'Weekly shop — GreenMart', 139.75),
  // September 2026 — a lighter month for the trend.
  tx('s35', '2026-09-01', 'income', 'Salary', 'Monthly salary — Maya', 5200),
  tx('s36', '2026-09-01', 'expense', 'Housing', 'Rent — Maple Court Apt 4B', 1450),
  tx('s37', '2026-09-05', 'expense', 'Groceries', 'Weekly shop — GreenMart', 171.3),
  tx('s38', '2026-09-12', 'expense', 'Utilities', 'Electric + internet', 148.9),
  tx('s39', '2026-09-19', 'expense', 'Groceries', 'Weekly shop — GreenMart', 162.45),
  tx('s40', '2026-09-26', 'expense', 'Transport', 'Fuel + transit', 128.4),
];

/** A fresh state holding the sample household. */
export function sampleState() {
  return {
    budgets: { ...SAMPLE_BUDGETS },
    transactions: SAMPLE_TRANSACTIONS.map((t) => ({ ...t })),
  };
}

/** A fresh, empty state. */
export function emptyState() {
  return { budgets: { ...SAMPLE_BUDGETS }, transactions: [] };
}

/** Read the household's saved state, or null when nothing is saved yet. */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return null;
    return {
      budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : { ...SAMPLE_BUDGETS },
      transactions: parsed.transactions,
    };
  } catch {
    return null;
  }
}

/** Save the household's state to this browser. */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** A short unique id for a new entry. */
export function newId() {
  return 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
