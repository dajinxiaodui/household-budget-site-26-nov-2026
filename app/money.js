// money.js — pure budget arithmetic for NestEgg.
// No DOM, no storage, no network: every function here takes plain data
// and returns plain data, so it can be tested on its own in Node.

/** Format a dollar amount as US currency, e.g. 1234.5 -> "$1,234.50". */
export function formatUSD(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/** Format with an explicit + / - sign, e.g. -42.5 -> "-$42.50". */
export function formatSignedUSD(amount) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  return sign + formatUSD(Math.abs(value));
}

/** Round a dollar amount to whole cents to dodge float dust. */
export function roundCents(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/** "2026-11-14" -> "2026-11". */
export function monthKeyOf(dateString) {
  return String(dateString).slice(0, 7);
}

/** "2026-11" -> "November 2026". */
export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Shift a "YYYY-MM" key by n months. */
export function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Today's month key, e.g. "2026-11". */
export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** All transactions of one type ("income" | "expense") in one month. */
export function transactionsInMonth(list, type, monthKey) {
  return list.filter(
    (t) => t.type === type && monthKeyOf(t.date) === monthKey,
  );
}

/** Total dollars of one type in one month. */
export function totalInMonth(list, type, monthKey) {
  return roundCents(
    transactionsInMonth(list, type, monthKey).reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    ),
  );
}

/** Spending per expense category in one month: { Groceries: 549.9, ... }. */
export function spentByCategory(list, monthKey) {
  const out = {};
  for (const t of transactionsInMonth(list, 'expense', monthKey)) {
    out[t.category] = roundCents((out[t.category] || 0) + Number(t.amount));
  }
  return out;
}

/**
 * One month's whole picture: income, spending, what is left, the savings
 * rate, and a per-category budget status row for every budgeted category.
 */
export function monthSummary(transactions, budgets, monthKey) {
  const income = totalInMonth(transactions, 'income', monthKey);
  const spent = totalInMonth(transactions, 'expense', monthKey);
  const spentMap = spentByCategory(transactions, monthKey);
  const remaining = roundCents(income - spent);
  const savingsRate = income > 0 ? Math.round((remaining / income) * 100) : 0;

  const byCategory = Object.keys(budgets)
    .map((category) => {
      const budget = Number(budgets[category]) || 0;
      const spentInCat = spentMap[category] || 0;
      const pct = budget > 0 ? Math.round((spentInCat / budget) * 100) : 0;
      return {
        category,
        budget: roundCents(budget),
        spent: spentInCat,
        left: roundCents(budget - spentInCat),
        pct,
        over: spentInCat > budget,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const totalBudget = roundCents(
    Object.values(budgets).reduce((s, v) => s + Number(v), 0),
  );

  return { income, spent, remaining, savingsRate, byCategory, totalBudget };
}

/** The single biggest expense in a month (or null when there is none). */
export function biggestExpense(transactions, monthKey) {
  const rows = transactionsInMonth(transactions, 'expense', monthKey);
  if (rows.length === 0) return null;
  return rows.reduce((big, t) => (Number(t.amount) > Number(big.amount) ? t : big));
}

/** Average daily spending in a month, over the days elapsed so far. */
export function averageDailySpend(transactions, monthKey, today) {
  const spent = totalInMonth(transactions, 'expense', monthKey);
  const [year, month] = monthKey.split('-').map(Number);
  const day = today.getFullYear() === year && today.getMonth() + 1 === month
    ? today.getDate()
    : new Date(year, month, 0).getDate();
  return roundCents(spent / Math.max(1, day));
}

/** Spending totals for the last n months ending at monthKey, oldest first. */
export function spendingTrend(transactions, monthKey, months = 6) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    out.push({ month: key, label: monthLabel(key), spent: totalInMonth(transactions, 'expense', key) });
  }
  return out;
}

/** Income totals for the last n months ending at monthKey, oldest first. */
export function incomeTrend(transactions, monthKey, months = 6) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = shiftMonth(monthKey, -i);
    out.push({ month: key, label: monthLabel(key), income: totalInMonth(transactions, 'income', key) });
  }
  return out;
}
