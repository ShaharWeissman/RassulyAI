import { useState } from "react";
import type { RequirementTask, TaskStatus } from "../../types";
import { Badge, Empty, Field, Modal, Options, Table } from "../ui";
const statuses: TaskStatus[] = ["פתוח", "בטיפול", "הושלם", "באיחור"];
export default function Tasks({
  projectId,
  tasks,
  onSave,
}: {
  projectId: string;
  tasks: RequirementTask[];
  onSave: (t: RequirementTask) => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>משימות הפרויקט</h2>
            <p className="muted">אחריות, תאריכי יעד ומעקב ביצוע</p>
          </div>
          <button className="primary" onClick={() => setAdding(true)}>
            + משימה חדשה
          </button>
        </div>
        {!tasks.length ? (
          <Empty text="אין משימות בפרויקט הזה. אפשר להוסיף משימה באמצעות הכפתור למעלה." />
        ) : (
          <Table
            caption="משימות הפרויקט"
            headers={["משימה", "אחראי", "עדיפות", "תאריך יעד", "סטטוס", "הערה"]}
          >
            {tasks.map((t) => (
              <tr key={t.id}>
                <td className="strong">{t.title}</td>
                <td>{t.assignee}</td>
                <td>
                  <Badge>{t.priority}</Badge>
                </td>
                <td className="numeric">{t.due_date}</td>
                <td>
                  <select
                    className="table-select"
                    aria-label={`סטטוס ${t.title}`}
                    value={t.status}
                    onChange={(e) =>
                      onSave({ ...t, status: e.target.value as TaskStatus })
                    }
                  >
                    <Options values={statuses} />
                  </select>
                </td>
                <td>{t.note || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {adding && (
        <Modal title="משימה חדשה" onClose={() => setAdding(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onSave({
                id: crypto.randomUUID(),
                project_id: projectId,
                title: String(f.get("title")),
                assignee: String(f.get("assignee")),
                priority: f.get("priority") as RequirementTask["priority"],
                due_date: String(f.get("due")),
                status: f.get("status") as TaskStatus,
                note: String(f.get("note")),
              });
              setAdding(false);
            }}
          >
            <Field label="משימה" className="full">
              <input required name="title" />
            </Field>
            <Field label="אחראי">
              <input required name="assignee" />
            </Field>
            <Field label="עדיפות">
              <select name="priority">
                <Options values={["רגילה", "גבוהה", "נמוכה"]} />
              </select>
            </Field>
            <Field label="תאריך יעד">
              <input required name="due" type="date" />
            </Field>
            <Field label="סטטוס">
              <select name="status">
                <Options values={statuses} />
              </select>
            </Field>
            <Field label="הערה" className="full">
              <input name="note" />
            </Field>
            <div className="form-actions full">
              <button className="primary">שמירת משימה</button>
              <button type="button" onClick={() => setAdding(false)}>
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
