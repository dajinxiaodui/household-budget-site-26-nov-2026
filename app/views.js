// views.js — the four pages of NestEgg as HTML strings.
// Each function takes the household state and the month being viewed and
// returns markup; main.js puts it on the page and wires the controls up.

import {
  averageDailySpend,
  biggestExpense,
  formatSignedUSD,
  formatUSD,
  incomeTrend,
  monthLabel,
  monthSummary,
  shiftMonth,
} from './money.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryColor } from './data.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function monthNav(monthKey) {
  return `<nav class="month-nav" aria-label="Choose month">
    <a class="month-arrow" href="#/dashboard/${shiftMonth(monthKey, -1)}" aria-label="Previous month">&lsaquo; Prev</a>
    <h2>${monthLabel(monthKey)}</h2>
    <a class="month-arrow" href="#/dashboard/${shiftMonth(monthKey, 1)}" aria-label="Next month">Next &rsaquo;</a>
  </nav>`;
}

function progressBar(pct, over) {
  const capped = Math.min(100, pct);
  return `<div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <span class="bar-fill${over ? ' over' : ''}" style="width:${capped}%"></span>
  </div>`;
}

function transactionRow(t) {
  const sign = t.type === 'income' ? '+' : '-';
  return `<li class="tx-row">
    <span class="tx-dot" style="background:${categoryColor(t.category)}"></span>
    <span class="tx-main">
      <strong>${escapeHtml(t.description)}</strong>
      <small>${escapeHtml(t.category)} &middot; ${escapeHtml(t.date)}</small>
    </span>
    <span class="tx-amount ${t.type}">${sign}${formatUSD(t.amount)}</span>
    <span class="tx-actions">
      <button class="link-btn" data-edit="${t.id}">Edit</button>
      <button class="link-btn danger" data-delete="${t.id}">Delete</button>
    </span>
  </li>`;
}

/** Dashboard: the month at a glance. */
export function renderDashboard(state, monthKey) {
  const summary = monthSummary(state.transactions, state.budgets, monthKey);
  const recent = state.transactions
    .filter((t) => t.date.slice(0, 7) === monthKey)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const slices = summary.byCategory
    .filter((row) => row.spent > 0)
    .map((row) => ({ label: row.category, value: row.spent, color: categoryColor(row.category) }));
  const topBudgets = summary.byCategory.slice(0, 5);

  return `
  ${monthNav(monthKey)}
  <section class="stats" aria-label="Month summary">
    <article class="stat"><span>Income</span><strong class="income">${formatUSD(summary.income)}</strong><small>money in this month</small></article>
    <article class="stat"><span>Spent</span><strong class="expense">${formatUSD(summary.spent)}</strong><small>across ${summary.byCategory.filter((r) => r.spent > 0).length} categories</small></article>
    <article class="stat"><span>Remaining</span><strong class="${summary.remaining < 0 ? 'expense' : 'income'}">${formatUSD(summary.remaining)}</strong><small>income minus spending</small></article>
    <article class="stat"><span>Savings rate</span><strong>${summary.savingsRate}%</strong><small>of income left over</small></article>
  </section>

  <div class="grid-two">
    <section class="card" aria-label="Spending by category">
      <h3>Where the money went</h3>
      <div class="donut-wrap">
        <canvas id="donut" width="260" height="260" aria-label="Donut chart of spending by category"></canvas>
        <ul class="legend">
          ${slices.map((s) => `<li><span class="swatch" style="background:${s.color}"></span>${escapeHtml(s.label)}<b>${formatUSD(s.value)}</b></li>`).join('') || '<li>No spending recorded yet this month.</li>'}
        </ul>
      </div>
    </section>

    <section class="card" aria-label="Budget progress">
      <h3>Budget check-in</h3>
      <p class="card-note">${formatUSD(summary.spent)} of ${formatUSD(summary.totalBudget)} budgeted &middot; <a href="#/budgets/${monthKey}">see all budgets &rsaquo;</a></p>
      <ul class="budget-list">
        ${topBudgets.map((row) => `<li>
          <span class="budget-head"><strong>${escapeHtml(row.category)}</strong><span>${formatUSD(row.spent)} of ${formatUSD(row.budget)}</span></span>
          ${progressBar(row.pct, row.over)}
          <small class="${row.over ? 'over-text' : ''}">${row.over ? `Over by ${formatUSD(row.spent - row.budget)}` : `${row.pct}% used &middot; ${formatUSD(row.left)} left`}</small>
        </li>`).join('')}
      </ul>
    </section>
  </div>

  <section class="card" aria-label="Recent transactions">
    <h3>Recent transactions</h3>
    ${recent.length ? `<ul class="tx-list">${recent.map(transactionRow).join('')}</ul>` : '<p class="empty">No transactions this month yet. <a href="#/transactions/' + monthKey + '">Add the first one &rsaquo;</a></p>'}
    <p class="card-foot"><a href="#/transactions/${monthKey}">All transactions &rsaquo;</a></p>
  </section>`;
}

/** Transactions: add, edit, delete, filter. */
export function renderTransactions(state, monthKey, filter) {
  const rows = state.transactions
    .filter((t) => t.date.slice(0, 7) === monthKey)
    .filter((t) => (filter === 'all' ? true : t.type === filter))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const incomeTotal = rows.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenseTotal = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const typeOptions = (selected) =>
    ['income', 'expense'].map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${v === 'income' ? 'Income' : 'Expense'}</option>`).join('');

  return `
  ${monthNav(monthKey)}
  <section class="card" aria-label="Add a transaction">
    <h3 id="form-title">Add a transaction</h3>
    <form id="tx-form" class="tx-form">
      <input type="hidden" id="tx-id" value="">
      <label>Date <input type="date" id="tx-date" required></label>
      <label>Type
        <select id="tx-type">${typeOptions('expense')}</select>
      </label>
      <label>Category
        <select id="tx-category"></select>
      </label>
      <label class="wide">Description <input type="text" id="tx-description" placeholder="e.g. Weekly shop — GreenMart" maxlength="80" required></label>
      <label>Amount ($) <input type="number" id="tx-amount" min="0.01" step="0.01" placeholder="0.00" required></label>
      <span class="form-actions">
        <button class="btn primary" type="submit" id="tx-submit">Add transaction</button>
        <button class="btn" type="button" id="tx-cancel" hidden>Cancel edit</button>
      </span>
    </form>
  </section>

  <section class="card" aria-label="Transactions this month">
    <h3>Transactions — ${monthLabel(monthKey)}</h3>
    <div class="filters" role="group" aria-label="Filter by type">
      <a class="chip${filter === 'all' ? ' active' : ''}" href="#/transactions/${monthKey}/all">All</a>
      <a class="chip${filter === 'income' ? ' active' : ''}" href="#/transactions/${monthKey}/income">Income ${formatUSD(incomeTotal)}</a>
      <a class="chip${filter === 'expense' ? ' active' : ''}" href="#/transactions/${monthKey}/expense">Expenses ${formatUSD(expenseTotal)}</a>
    </div>
    ${rows.length ? `<ul class="tx-list">${rows.map(transactionRow).join('')}</ul>` : '<p class="empty">Nothing here yet for this month and filter.</p>'}
    <p class="card-foot">Net this month: <strong>${formatSignedUSD(incomeTotal - expenseTotal)}</strong></p>
  </section>`;
}

/** Budgets: one monthly limit per category, with progress. */
export function renderBudgets(state, monthKey) {
  const summary = monthSummary(state.transactions, state.budgets, monthKey);
  return `
  ${monthNav(monthKey)}
  <section class="card" aria-label="Monthly budgets">
    <h3>Monthly budgets — ${monthLabel(monthKey)}</h3>
    <p class="card-note">Set a limit for each category. Spending is counted from the transactions you add. Total budget ${formatUSD(summary.totalBudget)} &middot; spent ${formatUSD(summary.spent)}.</p>
    <ul class="budget-list big">
      ${summary.byCategory.map((row) => `<li>
        <span class="budget-head"><strong>${escapeHtml(row.category)}</strong><span>${formatUSD(row.spent)} of ${formatUSD(row.budget)}</span></span>
        ${progressBar(row.pct, row.over)}
        <span class="budget-edit">
          <small class="${row.over ? 'over-text' : ''}">${row.over ? `Over budget by ${formatUSD(row.spent - row.budget)}` : `${row.pct}% used &middot; ${formatUSD(row.left)} left`}</small>
          <label>Monthly limit $ <input type="number" min="0" step="1" value="${row.budget}" data-budget="${escapeHtml(row.category)}" aria-label="Monthly budget for ${escapeHtml(row.category)}"></label>
        </span>
      </li>`).join('')}
    </ul>
    <p class="card-foot"><button class="btn" id="reset-budgets" type="button">Reset to suggested budgets</button>
    <span class="hint">A common starting point is the 50/30/20 rule: about 50% of income for needs, 30% for wants, 20% for saving.</span></p>
  </section>`;
}

/** Insights: charts and plain-language takeaways. */
export function renderInsights(state, monthKey) {
  const summary = monthSummary(state.transactions, state.budgets, monthKey);
  const income = incomeTrend(state.transactions, monthKey, 6);
  const biggest = biggestExpense(state.transactions, monthKey);
  const daily = averageDailySpend(state.transactions, monthKey, new Date());
  const top = summary.byCategory[0];

  return `
  ${monthNav(monthKey)}
  <div class="grid-two">
    <section class="card" aria-label="Spent versus budget">
      <h3>Spent vs budget</h3>
      <p class="card-note">Solid bar: what you spent. Pale bar: what you planned.</p>
      <canvas id="budget-bars" width="520" height="340" aria-label="Bar chart of spending versus budget by category"></canvas>
    </section>
    <section class="card" aria-label="Six month trend">
      <h3>Spending trend — last 6 months</h3>
      <p class="card-note">Total spending per month. This month is the dark bar on the right.</p>
      <canvas id="trend-bars" width="520" height="340" aria-label="Bar chart of monthly spending over six months"></canvas>
    </section>
  </div>

  <section class="card" aria-label="Takeaways">
    <h3>What this month is saying</h3>
    <ul class="takeaways">
      <li><strong>Biggest category:</strong> ${top && top.spent > 0 ? `${escapeHtml(top.category)} at ${formatUSD(top.spent)} — ${top.pct}% of its ${formatUSD(top.budget)} budget.` : 'No spending recorded yet.'}</li>
      <li><strong>Biggest single expense:</strong> ${biggest ? `${escapeHtml(biggest.description)} — ${formatUSD(biggest.amount)} on ${escapeHtml(biggest.date)}.` : 'None yet.'}</li>
      <li><strong>Daily pace:</strong> about ${formatUSD(daily)} a day so far this month.</li>
      <li><strong>Income vs spending:</strong> ${formatUSD(summary.income)} came in and ${formatUSD(summary.spent)} went out, leaving ${formatUSD(summary.remaining)} — a ${summary.savingsRate}% savings rate.</li>
      <li><strong>Income trend:</strong> ${income.map((m) => `${m.label}: ${formatUSD(m.income)}`).join(' &middot; ')}</li>
    </ul>
  </section>

  <section class="card" aria-label="Money habits">
    <h3>Three habits that keep a household budget working</h3>
    <ol class="habits">
      <li><strong>Pay yourself first.</strong> Move savings out on payday, before the month's spending starts — the sample household moves $400 to its emergency fund on the 1st.</li>
      <li><strong>Check in weekly, not daily.</strong> Ten minutes on a Sunday is enough to catch a category drifting over budget while there is still time to pull it back.</li>
      <li><strong>Budget for the irregular.</strong> Car repairs, school trips and gifts are not surprises — give them a small monthly line so they never blow up a month.</li>
    </ol>
  </section>`;
}

export { EXPENSE_CATEGORIES, INCOME_CATEGORIES };
