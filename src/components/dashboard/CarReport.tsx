import { useState } from "react";
import type { AppData, MileageEntry } from "../../types";
import { Field, Table, Empty } from "../ui";
export default function CarReport({
  data,
  onSave,
  workerId,
}: {
  data: AppData;
  onSave: (entry: MileageEntry) => void;
  workerId: string;
}) {
  const [error, setError] = useState("");
  return (
    <div className="two-columns">
      <section className="panel padded">
        <h2>דיווח רכב</h2>
        <p className="muted">דיווח חודשי על קריאת הקילומטרז׳ ברכב.</p>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const vehicle_id = String(f.get("vehicle"));
            const month = String(f.get("month"));
            const odometer = Number(f.get("odometer"));
            const previous = data.mileage_entries.filter(
              (v) => v.vehicle_id === vehicle_id,
            );
            if (previous.some((v) => v.month === month)) {
              setError("כבר קיים דיווח לרכב בחודש זה.");
              return;
            }
            if (
              previous.some(
                (v) =>
                  (v.month < month && v.odometer > odometer) ||
                  (v.month > month && v.odometer < odometer),
              )
            ) {
              setError("קריאת הקילומטרז׳ אינה תואמת לרצף הדיווחים הקודמים.");
              return;
            }
            onSave({
              id: crypto.randomUUID(),
              worker_id: workerId,
              vehicle_id,
              month,
              odometer,
              note: String(f.get("note")),
            });
            setError("");
            form.reset();
          }}
        >
          <Field label="חודש">
            <input
              required
              name="month"
              type="month"
              defaultValue={new Date().toLocaleDateString("en-CA").slice(0, 7)}
            />
          </Field>
          <Field label="רכב">
            <select name="vehicle">
              {data.vehicles.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="קריאת קילומטרז׳">
            <input
              required
              name="odometer"
              type="number"
              min="0"
              step="1"
              placeholder="למשל 42850"
            />
          </Field>
          <Field label="הערה">
            <input name="note" placeholder="הערה לדיווח (לא חובה)" />
          </Field>
          {error && (
            <p role="alert" className="error full">
              {error}
            </p>
          )}
          <div className="form-actions full">
            <button className="primary">שמור דיווח</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>הדיווחים שלי</h2>
          <span className="muted">{data.mileage_entries.length} דיווחים</span>
        </div>
        {!data.mileage_entries.length ? (
          <Empty text="עדיין לא נשלחו דיווחי רכב" />
        ) : (
          <Table
            caption="דיווחי רכב שנשלחו"
            headers={["חודש", "רכב", "קילומטרז׳", "הערה"]}
          >
            {data.mileage_entries.map((v) => (
              <tr key={v.id}>
                <td>{v.month}</td>
                <td>
                  {data.vehicles.find((c) => c.id === v.vehicle_id)?.label}
                </td>
                <td>{v.odometer.toLocaleString("he-IL")}</td>
                <td>{v.note || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
