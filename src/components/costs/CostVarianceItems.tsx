import { useState } from "react";
import type { CostVarianceItem } from "../../types";
import { Badge, Field, Modal, Table } from "../ui";

const statuses: CostVarianceItem["approval"][] = [
  "ממתין לאישור",
  "אושר",
  "לא אושר",
];
const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  signDisplay: "exceptZero",
});

export default function CostVarianceItems({
  items,
  onSave,
}: {
  items: CostVarianceItem[];
  onSave: (items: CostVarianceItem[]) => void;
}) {
  const [editing, setEditing] = useState<CostVarianceItem | "new">();
  const [filter, setFilter] = useState("");
  const visible = items.filter((item) => !filter || item.approval === filter);
  const total = (rows: CostVarianceItem[]) =>
    rows.reduce((sum, row) => sum + row.amount, 0);
  const current = editing === "new" ? undefined : editing;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>סעיפי פלוס / מינוס</h2>
          <p className="muted">חריגים ותוספות לפי סעיף ואישור המזמין.</p>
        </div>
        <button
          className="primary"
          type="button"
          onClick={() => setEditing("new")}
        >
          הוספת סעיף
        </button>
      </div>
      <div className="cost-table-toolbar">
        <Field label="אישור מזמין">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">כל הסטטוסים</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <span>
          נטו מאושר:{" "}
          <strong>
            <bdi>
              {currency.format(
                total(items.filter((item) => item.approval === "אושר")),
              )}
            </bdi>
          </strong>
        </span>
      </div>
      <Table
        caption="סעיפי פלוס ומינוס ואישור מזמין"
        headers={[
          "סעיף / חריג",
          "פרק",
          "תיאור העבודה",
          "פלוס",
          "מינוס",
          "אישור מזמין",
          "הערה",
          "פעולה",
        ]}
      >
        {visible.map((item) => (
          <tr key={item.id}>
            <th scope="row">{item.code || "—"}</th>
            <td>{item.chapter || "—"}</td>
            <td>{item.description}</td>
            <td className="money variance-plus">
              {item.amount > 0 ? (
                <bdi>{currency.format(item.amount)}</bdi>
              ) : (
                "—"
              )}
            </td>
            <td className="money variance-minus">
              {item.amount < 0 ? (
                <bdi>{currency.format(item.amount)}</bdi>
              ) : (
                "—"
              )}
            </td>
            <td>
              <Badge>{item.approval}</Badge>
            </td>
            <td>{item.note || "—"}</td>
            <td>
              <button type="button" onClick={() => setEditing(item)}>
                עריכה
              </button>
            </td>
          </tr>
        ))}
        {!visible.length && (
          <tr>
            <td colSpan={8}>אין סעיפים להצגה. אפשר להוסיף סעיף חדש.</td>
          </tr>
        )}
      </Table>
      {editing && (
        <Modal
          title={current ? "עריכת סעיף פלוס / מינוס" : "סעיף פלוס / מינוס חדש"}
          onClose={() => setEditing(undefined)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const field = (key: string) => String(data.get(key) ?? "").trim();
              const description = field("description");
              const amount = Number(field("amount"));
              if (!description || !Number.isFinite(amount)) return;
              const item: CostVarianceItem = {
                id: current?.id ?? crypto.randomUUID(),
                code: field("code"),
                chapter: field("chapter"),
                description,
                amount,
                approval: field("approval") as CostVarianceItem["approval"],
                note: field("note"),
              };
              onSave(
                current
                  ? items.map((row) => (row.id === item.id ? item : row))
                  : [...items, item],
              );
              setFilter("");
              setEditing(undefined);
            }}
          >
            <Field label="מספר סעיף / חריג">
              <input name="code" maxLength={100} defaultValue={current?.code} />
            </Field>
            <Field label="פרק">
              <input
                name="chapter"
                maxLength={120}
                defaultValue={current?.chapter}
              />
            </Field>
            <Field label="תיאור העבודה" className="full">
              <input
                name="description"
                required
                maxLength={250}
                defaultValue={current?.description}
              />
            </Field>
            <Field label="סכום בש״ח (חיובי לתוספת, שלילי להפחתה)">
              <input
                type="number"
                name="amount"
                required
                step="0.01"
                defaultValue={current?.amount}
              />
            </Field>
            <Field label="סטטוס אישור מזמין">
              <select
                name="approval"
                defaultValue={current?.approval ?? statuses[0]}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
            <Field label="הערה" className="full">
              <textarea
                name="note"
                rows={2}
                maxLength={1000}
                defaultValue={current?.note}
              />
            </Field>
            <div className="form-actions full">
              <button className="primary">שמירת סעיף</button>
              <button type="button" onClick={() => setEditing(undefined)}>
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
