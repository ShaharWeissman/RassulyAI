import { useState } from "react";
import type { ProjectCost } from "../../types";

const colors = ["#177F8C", "#344D68", "#6D8984", "#9D8963", "#879BAB"];
const currency = (value: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
export default function CostPie({ costs }: { costs: ProjectCost[] }) {
  const [metric, setMetric] = useState<"contractual" | "approved" | "actual">(
    "contractual",
  );
  const total = costs.reduce((sum, cost) => sum + cost[metric], 0);
  let angle = -Math.PI / 2;
  const sectors = costs.map((cost, index) => {
    const fraction = total ? cost[metric] / total : 0;
    const start = angle;
    angle += fraction * Math.PI * 2;
    const end = angle,
      r = 94,
      x = 120,
      y = 120;
    const path = `M ${x} ${y} L ${x + r * Math.cos(start)} ${y + r * Math.sin(start)} A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x + r * Math.cos(end)} ${y + r * Math.sin(end)} Z`;
    return { cost, index, fraction, path, middle: (start + end) / 2 };
  });
  return (
    <section className="panel padded cost-pie-panel">
      <h2>חלוקה לפי פרקים</h2>
      <label className="pie-metric">
        הצגה לפי
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="contractual">סכום חוזי</option>
          <option value="approved">סכום מאושר</option>
          <option value="actual">ביצוע בפועל</option>
        </select>
      </label>
      <svg
        className="cost-pie"
        viewBox="0 0 240 240"
        role="img"
        aria-label={`תרשים עוגה של עלויות לפי פרקים, סך הכול ${currency(total)}`}
      >
        <title>חלוקת עלויות הפרויקט לפי פרק</title>
        {!total ? (
          <circle cx="120" cy="120" r="94" fill="#e8eeec" />
        ) : (
          sectors
            .filter((s) => s.fraction > 0)
            .map((s) => (
              <g key={s.cost.id}>
                {s.fraction >= 0.999999 ? (
                  <circle
                    cx="120"
                    cy="120"
                    r="94"
                    fill={colors[s.index % colors.length]}
                  />
                ) : (
                  <path
                    d={s.path}
                    fill={colors[s.index % colors.length]}
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
                <title>
                  {s.cost.chapter}: {currency(s.cost[metric])} (
                  {(s.fraction * 100).toFixed(1)}%)
                </title>
                {s.fraction >= 0.07 && (
                  <text
                    x={120 + 61 * Math.cos(s.middle)}
                    y={124 + 61 * Math.sin(s.middle)}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {Math.round(s.fraction * 100)}%
                  </text>
                )}
              </g>
            ))
        )}
      </svg>
      <div className="pie-total">
        <span>סה״כ</span>
        <strong>{currency(total)}</strong>
      </div>
      <ul className="pie-legend">
        {sectors.map((s) => (
          <li key={s.cost.id}>
            <span
              className="legend-dot"
              style={{ background: colors[s.index % colors.length] }}
            />
            <span>{s.cost.chapter}</span>
            <strong>{currency(s.cost[metric])}</strong>
          </li>
        ))}
      </ul>
      {!total && <p className="muted">הזנת סכומים תציג את החלוקה בעוגה.</p>}
    </section>
  );
}
