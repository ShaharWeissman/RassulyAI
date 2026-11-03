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
          <Options
            values={["לא סווג", "תקין", "דורש תשומת לב", "דורש טיפול"]}
          />
        </select>
      </Field>
      <Field label="עדכון אחרון">
        <input type="date" value={draft.updated_at} readOnly />
        <small className="muted">יתעדכן אוטומטית בשמירה</small>
      </Field>
      <Field label="סטטוס כללי" className="full">
        <input
          required
          value={draft.short_status}
          onChange={(e) => setDraft({ ...draft, short_status: e.target.value })}
        />
      </Field>
      <Field label="סטטוס מפורט" className="full">
        <textarea
          rows={5}
          value={draft.detailed_status}
          onChange={(e) =>
            setDraft({ ...draft, detailed_status: e.target.value })
          }
        />
      </Field>
      <details className="full office-editor-more">
        <summary>תקציב, לוחות זמנים ונושאים נוספים</summary>
        <div className="form-grid">
          {" "}
          <Field label="לוח זמנים לגמר השלב">
            <input
              type="date"
              value={draft.stage_due_date}
              onChange={(e) =>
                setDraft({ ...draft, stage_due_date: e.target.value })
              }
            />
          </Field>
          <Field label="אומדן / תקציב לביצוע (נטו, ש״ח)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.budget ?? ""}
              placeholder="לא צוין בקובץ"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  budget: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="הערות לאומדן / יתרה לביצוע" className="full">
            <textarea
              rows={2}
              value={draft.budget_notes}
              onChange={(e) =>
                setDraft({ ...draft, budget_notes: e.target.value })
              }
            />
          </Field>
          <Field label="הגורם הנדרש לעדכן">
            <input
              value={draft.update_owner}
              onChange={(e) =>
                setDraft({ ...draft, update_owner: e.target.value })
              }
            />
          </Field>
          <Field label="מועד מתוכנן לפגישת מעקב במשרד">
            <input
              type="date"
              value={draft.followup_date}
              onChange={(e) =>
                setDraft({ ...draft, followup_date: e.target.value })
              }
            />
          </Field>
          <Field label="בעיות מהותיות ודרכי פתרון" className="full">
            <textarea
              rows={4}
              value={draft.major_issues}
              onChange={(e) =>
                setDraft({ ...draft, major_issues: e.target.value })
              }
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
          <Field label="הערות מנהל מהקובץ" className="full">
            <textarea
              readOnly
              rows={2}
              value={draft.manager_notes}
              placeholder="אין הערות מנהל בקובץ"
            />
            <small className="muted">
              הערות המנהל נשמרות ללא שינוי. אפשר להוסיף נושא חדש לטיפול מנהל
              בשדה שמעל.
            </small>
          </Field>
          <p className="source-note full">
            נתוני הפתיחה מתוך {value.source.workbook} · גיליון{" "}
            {value.source.sheet} · שורה {value.source.row}. השמירה מעדכנת את
            המערכת המקומית בלבד.
          </p>
        </div>
      </details>
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
