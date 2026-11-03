import type { ProjectCost } from "../../types";
import { Table } from "../ui";

const currency = (value: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
export default function CostVarianceTable({
  costs,
  comparison,
}: {
  costs: ProjectCost[];
  comparison: "approved" | "actual";
}) {
  const values = costs.map((cost) => ({
    ...cost,
    delta: cost[comparison] - cost.contractual,
  }));
  const sum = (field: "contractual" | "approved" | "actual") =>
    costs.reduce((n, cost) => n + cost[field], 0);
  const net = sum(comparison) - sum("contractual");
  return (
    <>
      <p className="variance-explanation">
        פלוס / מינוס ={" "}
        {comparison === "approved" ? "הסכום המאושר" : "הביצוע בפועל"} פחות הסכום
        החוזי. פלוס מציין תוספת עלות, מינוס מציין הפחתה.
      </p>
      <Table
        caption="טבלת פלוס מינוס לפי פרקים"
        headers={[
          "פרק",
          "סכום חוזי",
          comparison === "approved" ? "סכום מאושר" : "ביצוע בפועל",
          "פלוס · תוספות",
          "מינוס · הפחתות",
          "הפרש נטו",
        ]}
      >
        {values.map((cost) => (
          <tr key={cost.id}>
            <td className="strong">{cost.chapter}</td>
            <td className="money">{currency(cost.contractual)}</td>
            <td className="money">{currency(cost[comparison])}</td>
            <td className="variance-plus money">
              {cost.delta > 0 ? currency(cost.delta) : "—"}
            </td>
            <td className="variance-minus money">
              {cost.delta < 0 ? currency(-cost.delta) : "—"}
            </td>
            <td
              className={
                cost.delta > 0
                  ? "variance-plus money"
                  : cost.delta < 0
                    ? "variance-minus money"
                    : "money"
              }
            >
              <bdi>
                {cost.delta > 0 ? "+" : ""}
                {currency(cost.delta)}
              </bdi>
            </td>
          </tr>
        ))}
        <tr className="total-row">
          <td>סה״כ</td>
          <td className="money">{currency(sum("contractual"))}</td>
          <td className="money">{currency(sum(comparison))}</td>
          <td className="variance-plus money">
            {currency(
              values.reduce((n, cost) => n + Math.max(cost.delta, 0), 0),
            )}
          </td>
          <td className="variance-minus money">
            {currency(
              values.reduce((n, cost) => n + Math.max(-cost.delta, 0), 0),
            )}
          </td>
          <td className="money">
            <bdi>
              {net > 0 ? "+" : ""}
              {currency(net)}
            </bdi>
          </td>
        </tr>
      </Table>
    </>
  );
}
