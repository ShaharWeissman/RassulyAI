import { useState } from "react";
import type { LeaveRequest } from "../../types";
import { Badge, Field, Table } from "../ui";
export default function Personal({
  requests,
  onSave,
  workerId,
}: {
  requests: LeaveRequest[];
  onSave: (request: LeaveRequest) => void;
  workerId: string;
}) {
  const [kind, setKind] = useState<LeaveRequest["kind"]>("חופשה");
  const [from, setFrom] = useState("");
  return (
    <div className="two-columns">
      <section className="panel padded">
        <h2>בקשה חדשה</h2>
        <div className="segmented" aria-label="סוג בקשה">
          {(["חופשה", "מחלה"] as const).map((k) => (
            <button
              className={kind === k ? "active" : ""}
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
            >
              {k}
            </button>
          ))}
        </div>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            onSave({
              id: crypto.randomUUID(),
              worker_id: workerId,
              kind,
              from_date: from,
              to_date: String(f.get("to")),
              note: String(f.get("note")),
              status: "ממתין לאישור",
            });
            form.reset();
            setFrom("");
          }}
        >
          <Field label="מתאריך">
            <input
              required
              type="date"
              name="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="עד תאריך">
            <input required type="date" name="to" min={from} />
          </Field>
          <Field label="הערה (לא חובה)" className="full">
            <textarea name="note" rows={3} />
          </Field>
          <div className="form-actions full">
            <button className="primary">שליחת בקשת {kind}</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>הבקשות שלי</h2>
        </div>
        <Table
          caption="בקשות חופשה ומחלה"
          headers={["סוג", "מתאריך", "עד תאריך", "סטטוס", "הערה"]}
        >
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.kind}</td>
              <td className="numeric">{r.from_date}</td>
              <td className="numeric">{r.to_date}</td>
              <td>
                <Badge>{r.status}</Badge>
              </td>
              <td>{r.note || "—"}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
