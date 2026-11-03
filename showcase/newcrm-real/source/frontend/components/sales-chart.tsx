"use client";
import { formatToman } from "../lib/sales-entry";
const n = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
export function SalesChart({
  rows,
}: {
  rows: { month: string; start: string; amount: string }[];
}) {
  const max =
    rows.reduce(
      (m, r) => (BigInt(r.amount) > m ? BigInt(r.amount) : m),
      BigInt(0),
    ) || BigInt(1);
  const points = rows
    .map(
      (row, i) =>
        `${70 + i * (840 / Math.max(rows.length - 1, 1))},${215 - Number((BigInt(row.amount) * BigInt(180)) / max)}`,
    )
    .join(" ");
  return (
    <>
      <div
        className="ref-chart"
        role="region"
        tabIndex={0}
        aria-label="نمودار فروش ماهانه به تومان؛ مقادیر دقیق در جدول زیر نمودار"
      >
        <svg viewBox="0 0 960 260" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1="70" x2="920" y1={35 + i * 45} y2={35 + i * 45} />
              <text x="60" y={39 + i * 45} textAnchor="end">
                {new Intl.NumberFormat("fa-IR", {
                  notation:
                    max.toString().length > 12 ? "scientific" : "compact",
                  maximumFractionDigits: 1,
                }).format((max * BigInt(4 - i)) / BigInt(4))}
              </text>
            </g>
          ))}
          <polyline points={points} />
          {rows.map((row, i) => (
            <g key={row.month}>
              <circle
                cx={70 + i * (840 / Math.max(rows.length - 1, 1))}
                cy={215 - Number((BigInt(row.amount) * BigInt(180)) / max)}
                r="4"
              />
              <text
                x={70 + i * (840 / Math.max(rows.length - 1, 1))}
                y="246"
                textAnchor="middle"
              >
                {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Tehran",
                }).format(new Date(row.start + "T12:00:00Z"))}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <details className="ref-chart-values">
        <summary>مقادیر دقیق نمودار</summary>
        <table>
          <caption className="sr-only">فروش ماهانه به تومان</caption>
          <thead>
            <tr>
              <th>ماه شمسی</th>
              <th>فروش</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <th>
                  {new Intl.NumberFormat("fa-IR", {
                    useGrouping: false,
                  }).format(Number(row.month.slice(0, 4)))}
                  /{n(Number(row.month.slice(5)))}
                </th>
                <td>{formatToman(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
