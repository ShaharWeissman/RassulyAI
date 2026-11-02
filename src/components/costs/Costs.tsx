import type { ProjectCost } from "../../types";
import { Table } from "../ui";
const currency = (n: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
export default function Costs({ costs }: { costs: ProjectCost[] }) {
  const sum = (key: "contractual" | "approved" | "actual" | "exceptions") =>
    costs.reduce((n, c) => n + c[key], 0);
  return (
    <>
      <div className="cost-summary">
        {[
          ["תקציב", sum("contractual")],
          ["הזמנות מאושרות", sum("approved")],
          ["חשבונות מאושרים", sum("actual")],
          ["יתרה", sum("contractual") - sum("actual")],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="muted">{label}</span>
            <strong>{currency(Number(value))}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>עלויות לפי פרק</h2>
            <p className="muted">נתוני עלויות לדוגמה · סכומים בש״ח</p>
          </div>
          <span className="subtle-label">{costs.length} פרקים</span>
        </div>
        <Table
          caption="עלויות פרויקט לפי פרקים"
          headers={[
            "פרק",
            "סכום חוזי",
            "סכום מאושר",
            "ביצוע בפועל",
            "חריגים",
            "הערות",
          ]}
        >
          {costs.map((c) => (
            <tr key={c.id}>
              <td className="strong">{c.chapter}</td>
              <td className="money">{currency(c.contractual)}</td>
              <td className="money">{currency(c.approved)}</td>
              <td className="money">{currency(c.actual)}</td>
              <td
                className={c.exceptions ? "warning-text money" : "muted money"}
              >
                {currency(c.exceptions)}
              </td>
              <td>{c.note}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>סה״כ</td>
            <td className="money">{currency(sum("contractual"))}</td>
            <td className="money">{currency(sum("approved"))}</td>
            <td className="money">{currency(sum("actual"))}</td>
            <td className="money">{currency(sum("exceptions"))}</td>
            <td />
          </tr>
        </Table>
      </section>
      <p className="muted small-note">
        יתרה = תקציב פחות חשבונות מאושרים. עמודת החריגים מוצגת בנפרד ואינה
        מתווספת לתקציב.
      </p>
    </>
  );
}
