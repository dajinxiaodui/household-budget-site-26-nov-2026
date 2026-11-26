// charts.js — hand-drawn canvas charts for NestEgg. No chart library,
// no network: plain Canvas 2D calls, sized for the device pixel ratio.

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Donut chart of spending by category.
 * slices: [{ label, value, color }]. Draws the ring, the total in the
 * middle, and a small legend is rendered as HTML beside it.
 */
export function drawDonut(canvas, slices, totalLabel, totalValue) {
  const { ctx, width, height } = fitCanvas(canvas);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.min(width, height) / 2 - 8;
  const inner = outer * 0.62;
  ctx.clearRect(0, 0, width, height);
  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.fillStyle = '#e7e2d9';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = cssVar('--card') || '#fffdf8';
    ctx.fill();
    drawDonutCenter(ctx, cx, cy, totalLabel, totalValue);
    return;
  }
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweep = (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    angle += sweep;
  }
  // Inner hole, punched out as a filled circle over the wedges.
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = cssVar('--card') || '#fffdf8';
  ctx.fill();
  drawDonutCenter(ctx, cx, cy, totalLabel, totalValue);
}

function drawDonutCenter(ctx, cx, cy, label, value) {
  ctx.fillStyle = cssVar('--muted') || '#6b6459';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy - 8);
  ctx.fillStyle = cssVar('--ink') || '#2b2620';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(value, cx, cy + 16);
}

/**
 * Grouped bar chart: one group per row, two bars each (spent vs budget).
 * rows: [{ label, spent, budget, color }].
 */
export function drawBudgetBars(canvas, rows) {
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const labelWidth = 92;
  const topPad = 8;
  const bottomPad = 22;
  const plotWidth = width - labelWidth - 8;
  const max = Math.max(1, ...rows.flatMap((r) => [r.spent, r.budget]));
  const groupHeight = (height - topPad - bottomPad) / rows.length;
  const barHeight = Math.min(11, groupHeight / 3);
  ctx.font = '12px system-ui, sans-serif';
  rows.forEach((row, i) => {
    const y = topPad + i * groupHeight;
    ctx.fillStyle = cssVar('--ink') || '#2b2620';
    ctx.textAlign = 'right';
    ctx.fillText(row.label, labelWidth - 8, y + groupHeight / 2 + 4);
    const spentWidth = (row.spent / max) * plotWidth;
    const budgetWidth = (row.budget / max) * plotWidth;
    // Budget bar (pale track) underneath, spent bar on top of it.
    ctx.fillStyle = '#e7e2d9';
    ctx.fillRect(labelWidth, y + groupHeight / 2 - barHeight - 3, budgetWidth, barHeight);
    ctx.fillStyle = row.over ? '#b3402e' : row.color;
    ctx.fillRect(labelWidth, y + groupHeight / 2 + 2, spentWidth, barHeight);
    ctx.fillStyle = cssVar('--muted') || '#6b6459';
    ctx.textAlign = 'left';
    const valueLabel = `$${Math.round(row.spent)} / $${Math.round(row.budget)}`;
    const labelX = labelWidth + Math.max(spentWidth, budgetWidth) + 6;
    const labelWidthPx = ctx.measureText(valueLabel).width;
    // Keep the label inside the canvas on narrow screens.
    ctx.fillText(valueLabel, Math.min(labelX, width - labelWidthPx - 4), y + groupHeight / 2 + 4);
  });
  // Baseline.
  ctx.strokeStyle = '#d8d2c6';
  ctx.beginPath();
  ctx.moveTo(labelWidth, height - bottomPad);
  ctx.lineTo(width, height - bottomPad);
  ctx.stroke();
  ctx.fillStyle = cssVar('--muted') || '#6b6459';
  ctx.textAlign = 'left';
  ctx.fillText('spent (solid) vs budget (pale)', labelWidth, height - 6);
}

/**
 * Simple vertical bar chart for a monthly trend.
 * points: [{ label, value }].
 */
export function drawTrendBars(canvas, points) {
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const topPad = 26;
  const bottomPad = 24;
  const plotHeight = height - topPad - bottomPad;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = width / points.length;
  const barWidth = Math.min(46, slot * 0.55);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  points.forEach((point, i) => {
    const x = slot * i + slot / 2;
    const barHeight = (point.value / max) * plotHeight;
    const y = topPad + (plotHeight - barHeight);
    ctx.fillStyle = i === points.length - 1 ? '#2f6f6a' : '#8fb8b2';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
    ctx.fillStyle = cssVar('--ink') || '#2b2620';
    ctx.fillText(`$${Math.round(point.value)}`, x, y - 6);
    ctx.fillStyle = cssVar('--muted') || '#6b6459';
    ctx.fillText(point.label, x, height - 8);
  });
}
