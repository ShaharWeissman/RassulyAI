import { useState } from "react";
import { Field, Icon, Modal, Table } from "../ui";
import {
  readProjectCosts,
  type ProjectCostImport,
} from "../../utils/importProjectCosts";

const money = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
});

export default function CostWorkbookImport({
  projectId,
  onSave,
}: {
  projectId: string;
  onSave: (data: ProjectCostImport) => void;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ProjectCostImport>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPreview(undefined);
          setError("");
          setOpen(true);
        }}
      >
        <Icon name="file" size={16} /> ייבוא קובץ עלויות
      </button>
      {open && (
        <Modal
          title="ייבוא קובץ מעקב עלויות"
          onClose={() => !loading && setOpen(false)}
        >
          <p className="muted">
            בחר XLSX עם גיליונות ״ריכוז״ או ״פלוס מינוס״. הסכומים נקראים מהערכים
            השמורים בקובץ.
          </p>
          <Field label="קובץ עלויות">
            <input
              type="file"
              accept=".xlsx"
              disabled={loading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                setPreview(undefined);
                setError("");
                if (!file) return;
                setLoading(true);
                try {
                  if (!/\.xlsx$/i.test(file.name) || file.size > 12_000_000)
                    throw new Error("בחר קובץ XLSX עד 12 מגה.");
                  setPreview(
                    readProjectCosts(
                      new Uint8Array(await file.arrayBuffer()),
                      projectId,
                    ),
                  );
                } catch (reason) {
                  setError(
                    reason instanceof Error &&
                      /[\u0590-\u05ff]/.test(reason.message)
                      ? reason.message
                      : "לא ניתן לקרוא את קובץ ה־Excel.",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            />
          </Field>
          {loading && <p role="status">קורא את גיליונות העלויות…</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {preview && (
            <>
              <p className="notice">
                {preview.costs.length} פרקים · {preview.items.length} סעיפי פלוס
                / מינוס
                {preview.skipped
                  ? ` · ${preview.skipped} שורות ללא סכום לא יובאו`
                  : ""}
                .
              </p>
              {preview.costs.length > 0 && (
                <Table
                  caption="תצוגה מקדימה של פרקי עלויות"
                  headers={["פרק", "הצעת מחיר מהקובץ"]}
                >
                  {preview.costs.map((cost) => (
                    <tr key={cost.id}>
                      <td>{cost.chapter}</td>
                      <td>{money.format(cost.contractual)}</td>
                    </tr>
                  ))}
                </Table>
              )}
              {preview.items.length > 0 && (
                <Table
                  caption="תצוגה מקדימה של סעיפי פלוס מינוס"
                  headers={["סעיף", "סכום", "אישור מזמין"]}
                >
                  {preview.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{money.format(item.amount)}</td>
                      <td>{item.approval}</td>
                    </tr>
                  ))}
                </Table>
              )}
              <p className="muted">
                השמירה תחליף את הרשימות שהקובץ מכיל בפרויקט הזה. סכומי אישור
                וביצוע קיימים נשמרים כששם הפרק זהה. בלי אישור מזמין מפורש, הסעיף
                ימתין לאישור.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    onSave(preview);
                    setOpen(false);
                  }}
                >
                  החלפת הנתונים ושמירה
                </button>
                <button type="button" onClick={() => setOpen(false)}>
                  ביטול
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
