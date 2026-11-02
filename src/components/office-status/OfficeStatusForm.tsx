import { useState } from "react";
import type { OfficeProjectStatus } from "../../types";
import { Field, Options } from "../ui";
export default function OfficeStatusForm({
  value,
  onSave,
  onCancel,
}: {
  value: OfficeProjectStatus;
  onSave: (value: OfficeProjectStatus) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...draft,
          updated_at: new Date().toLocaleDateString("en-CA"),
        });
      }}
    >
      <Field label="מצב כללי">
        <select
          value={draft.condition}
          onChange={(e) =>
            setDraft({
              ...draft,
              condition: e.target.value as OfficeProjectStatus["condition"],
            })
          }
        >
          <Options values={["תקין", "דורש תשומת לב", "דורש טיפול"]} />
        </select>
      </Field>
      <Field label="עדכון אחרון">
        <input type="date" value={draft.updated_at} readOnly />
        <small className="muted">יתעדכן אוטומטית בשמירה</small>
      </Field>
      <Field label="סטטוס קצר" className="full">
        <input
          required
          value={draft.short_status}
          onChange={(e) => setDraft({ ...draft, short_status: e.target.value })}
        />
      </Field>
      <Field label="נושא הדורש טיפול מנהל" className="full">
        <textarea
          rows={3}
          value={draft.manager_issue}
          onChange={(e) =>
            setDraft({ ...draft, manager_issue: e.target.value })
          }
          placeholder="אין נושאים פתוחים לטיפול מנהל"
        />
      </Field>
      <div className="form-actions full">
        <button type="submit" className="primary">
          שמירת עדכון
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
