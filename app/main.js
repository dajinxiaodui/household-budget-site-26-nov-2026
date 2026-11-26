// main.js — NestEgg's wiring: routing, state, forms, import/export.
// The pages themselves are built by views.js; the maths live in money.js;
// the charts are drawn by charts.js. This file only connects them.

import { drawBudgetBars, drawDonut, drawTrendBars } from './charts.js';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAMPLE_BUDGETS,
  categoryColor,
  emptyState,
  loadState,
  newId,
  sampleState,
  saveState,
} from './data.js';
import { currentMonthKey, formatUSD, monthSummary, roundCents, spendingTrend } from './money.js';
import {
  renderBudgets,
  renderDashboard,
  renderInsights,
  renderTransactions,
} from './views.js';

const view = document.getElementById('view');

/** The household's data, loaded from this browser or seeded with a sample. */
let state = loadState();
let seeded = false;
if (!state) {
  state = sampleState();
  saveState(state);
  seeded = true;
}

/** The month currently on screen; defaults to the latest month with data. */
function defaultMonth() {
  const months = state.transactions.map((t) => t.date.slice(0, 7));
  months.sort();
  return months.length ? months[months.length - 1] : currentMonthKey();
}

let month = defaultMonth();

function persist() {
  saveState(state);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page = 'dashboard', monthPart, filterPart] = hash.split('/');
  if (monthPart && /^\d{4}-\d{2}$/.test(monthPart)) month = monthPart;
  const filter = filterPart === 'income' || filterPart === 'expense' ? filterPart : 'all';
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
    link.href = `#/${link.dataset.page}/${month}`;
  });
  if (page === 'transactions') {
    view.innerHTML = renderTransactions(state, month, filter);
    wireTransactionForm();
  } else if (page === 'budgets') {
    view.innerHTML = renderBudgets(state, month);
    wireBudgets();
  } else if (page === 'insights') {
    view.innerHTML = renderInsights(state, month);
    drawInsights();
  } else {
    view.innerHTML = renderDashboard(state, month);
    drawDashboard();
  }
  window.scrollTo(0, 0);
}

function drawDashboard() {
  const canvas = document.getElementById('donut');
  if (!canvas) return;
  const summary = monthSummary(state.transactions, state.budgets, month);
  const slices = summary.byCategory
    .filter((row) => row.spent > 0)
    .map((row) => ({ label: row.category, value: row.spent, color: categoryColor(row.category) }));
  drawDonut(canvas, slices, 'Spent', formatUSD(summary.spent));
}

function drawInsights() {
  const summary = monthSummary(state.transactions, state.budgets, month);
  const bars = document.getElementById('budget-bars');
  if (bars) {
    drawBudgetBars(
      bars,
      summary.byCategory.map((row) => ({
        label: row.category,
        spent: row.spent,
        budget: row.budget,
        color: categoryColor(row.category),
        over: row.over,
      })),
    );
  }
  const trend = document.getElementById('trend-bars');
  if (trend) {
    drawTrendBars(
      trend,
      spendingTrend(state.transactions, month, 6).map((p) => ({
        label: p.label.slice(0, 3),
        value: p.spent,
      })),
    );
  }
}

function categoryOptions(type, selected) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list
    .map((c) => `<option value="${c.name}"${c.name === selected ? ' selected' : ''}>${c.name}</option>`)
    .join('');
}

function wireTransactionForm() {
  const form = document.getElementById('tx-form');
  const typeSelect = document.getElementById('tx-type');
  const categorySelect = document.getElementById('tx-category');
  const dateInput = document.getElementById('tx-date');
  const idInput = document.getElementById('tx-id');
  const submitBtn = document.getElementById('tx-submit');
  const cancelBtn = document.getElementById('tx-cancel');
  const title = document.getElementById('form-title');

  dateInput.value = `${month}-15`;
  categorySelect.innerHTML = categoryOptions(typeSelect.value, '');
  typeSelect.addEventListener('change', () => {
    categorySelect.innerHTML = categoryOptions(typeSelect.value, '');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = roundCents(document.getElementById('tx-amount').value);
    if (!(amount > 0)) return;
    const entry = {
      id: idInput.value || newId(),
      date: dateInput.value,
      type: typeSelect.value,
      category: categorySelect.value,
      description: document.getElementById('tx-description').value.trim(),
      amount,
    };
    if (!entry.description || !entry.date) return;
    const existing = state.transactions.findIndex((t) => t.id === entry.id);
    if (existing >= 0) state.transactions[existing] = entry;
    else state.transactions.push(entry);
    persist();
    month = entry.date.slice(0, 7);
    location.hash = `#/transactions/${month}`;
    route();
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    idInput.value = '';
    title.textContent = 'Add a transaction';
    submitBtn.textContent = 'Add transaction';
    cancelBtn.hidden = true;
    dateInput.value = `${month}-15`;
    categorySelect.innerHTML = categoryOptions(typeSelect.value, '');
  });

}

/** One delegated click handler for the transaction list (attached once). */
function onTransactionListClick(event) {
  const editBtn = event.target.closest('[data-edit]');
  const deleteBtn = event.target.closest('[data-delete]');
  if (editBtn) {
    const entry = state.transactions.find((t) => t.id === editBtn.dataset.edit);
    if (!entry) return;
    document.getElementById('tx-id').value = entry.id;
    document.getElementById('tx-date').value = entry.date;
    document.getElementById('tx-type').value = entry.type;
    document.getElementById('tx-category').innerHTML = categoryOptions(entry.type, entry.category);
    document.getElementById('tx-description').value = entry.description;
    document.getElementById('tx-amount').value = entry.amount;
    document.getElementById('form-title').textContent = 'Edit transaction';
    document.getElementById('tx-submit').textContent = 'Save changes';
    document.getElementById('tx-cancel').hidden = false;
    document.getElementById('tx-form').scrollIntoView({ behavior: 'smooth' });
  }
  if (deleteBtn) {
    const entry = state.transactions.find((t) => t.id === deleteBtn.dataset.delete);
    if (!entry) return;
    if (!window.confirm(`Delete "${entry.description}" (${formatUSD(entry.amount)})?`)) return;
    state.transactions = state.transactions.filter((t) => t.id !== entry.id);
    persist();
    route();
  }
}

function wireBudgets() {
  view.querySelectorAll('[data-budget]').forEach((input) => {
    input.addEventListener('change', () => {
      const value = Math.max(0, roundCents(input.value));
      state.budgets[input.dataset.budget] = value;
      persist();
      route();
    });
  });
  document.getElementById('reset-budgets').addEventListener('click', () => {
    state.budgets = { ...SAMPLE_BUDGETS };
    persist();
    route();
  });
}

/** Export the household's data as a JSON file download. */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nestegg-budget-${month}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Import a JSON file exported earlier (replaces current data). */
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.transactions)) throw new Error('bad file');
      state = {
        budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : { ...SAMPLE_BUDGETS },
        transactions: parsed.transactions.filter((t) => t && t.date && t.amount != null),
      };
      persist();
      month = defaultMonth();
      route();
    } catch {
      window.alert('That file is not a NestEgg export. Nothing was changed.');
    }
  };
  reader.readAsText(file);
}

document.getElementById('export-btn').addEventListener('click', exportJSON);
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) importJSON(file);
  event.target.value = '';
});
document.getElementById('sample-btn').addEventListener('click', () => {
  if (state.transactions.length && !window.confirm('Load the sample household? This replaces your current entries.')) return;
  state = sampleState();
  persist();
  month = defaultMonth();
  location.hash = `#/dashboard/${month}`;
  route();
});
document.getElementById('clear-btn').addEventListener('click', () => {
  if (!window.confirm('Clear all transactions and budgets? This cannot be undone.')) return;
  state = emptyState();
  persist();
  month = currentMonthKey();
  route();
});

if (seeded) {
  const note = document.getElementById('seed-note');
  if (note) note.hidden = false;
}

window.addEventListener('hashchange', route);
view.addEventListener('click', onTransactionListClick);
window.addEventListener('resize', () => {
  const donut = document.getElementById('donut');
  if (donut) drawDashboard();
  const bars = document.getElementById('budget-bars');
  if (bars) drawInsights();
});
route();
