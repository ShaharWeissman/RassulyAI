import { useState } from "react";
import type { RequirementTask, TaskStatus } from "../../types";
import { Badge, Empty, Field, Modal, Options } from "../ui";
import FileSkillAction from "../ui/FileSkillAction";
import "../../styles/organization-tasks.css";
const statuses = ["פתוח", "בטיפול", "הושלם"] as const;
const statusLabel = (status: TaskStatus) =>
  status === "הושלם" ? "בוצע" : status;
const taskGroup = (status: TaskStatus) =>
  status === "באיחור" ? "בטיפול" : status;
const statusOptions = statuses.map((status) => (
  <option key={status} value={status}>
    {statusLabel(status)}
  </option>
));
export default function Tasks({
  projectId,
  assignee,
  isAdmin,
  tasks,
  onSave,
  managerTasks,
  onManagerTasksSave,
}: {
  projectId: string;
  assignee: string;
  isAdmin: boolean;
  tasks: RequirementTask[];
  onSave: (t: RequirementTask) => void;
  managerTasks: string;
  onManagerTasksSave?: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [managerDraft, setManagerDraft] = useState(managerTasks);
  return (
    <>
      <section className="panel padded manager-tasks-panel">
        <h2>הנחיות מנהל לפרויקט</h2>
        {onManagerTasksSave ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onManagerTasksSave(managerDraft);
            }}
          >
            <Field label="משימות והנחיות מנהל לפרויקט">
              <textarea
                rows={4}
                value={managerDraft}
                onChange={(e) => setManagerDraft(e.target.value)}
                placeholder="כתיבת משימות מנהל, הנחיות ונושאים למעקב"
              />
            </Field>
            <div className="form-actions">
              <button className="primary" type="submit">
                שמירת משימות מנהל
              </button>
            </div>
          </form>
        ) : (
          <p className="preserve-whitespace">
            {managerTasks || "אין הנחיות לפרויקט."}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>משימות פרויקט</h2>
            <p className="muted">אחריות, תאריכי יעד ומעקב ביצוע</p>
          </div>
          <div className="inline-actions">
            <FileSkillAction context="משימות פרויקט" />
            <button className="primary" onClick={() => setAdding(true)}>
              {isAdmin ? "הקצאת משימת מנהל" : "הוספת משימה לעצמי"}
            </button>
          </div>
        </div>
        <div className="organization-task-columns project-task-board">
          {statuses.map((status) => {
            const matching = tasks.filter(
              (task) => taskGroup(task.status) === status,
            );
            return (
              <section key={status} className="organization-task-column">
                <h3>
                  {statusLabel(status)} <small>{matching.length}</small>
                </h3>
                {!matching.length && <Empty text="אין משימות" />}
                {matching.map((task) => (
                  <article key={task.id} className="organization-task-card">
                    <strong>{task.title}</strong>
                    <span
                      className={`project-task-origin ${task.origin === "manager" ? "manager" : "personal"}`}
                    >
                      {task.origin === "manager"
                        ? "משימת מנהל"
                        : task.origin === "personal"
                          ? "משימה אישית"
                          : "משימת פרויקט"}
                    </span>
                    <p className="muted">אחראי: {task.assignee}</p>
                    {task.due_date && (
                      <p className="muted">
                        תאריך יעד: <bdi>{task.due_date}</bdi>
                      </p>
                    )}
                    <Badge>{task.priority}</Badge>
                    {task.status === "באיחור" && <Badge>באיחור</Badge>}
                    {task.note && (
                      <p className="preserve-whitespace">{task.note}</p>
                    )}
                    <select
                      className="table-select"
                      aria-label={`סטטוס ${task.title}`}
                      value={taskGroup(task.status)}
                      onChange={(e) =>
                        onSave({
                          ...task,
                          status: e.target.value as TaskStatus,
                        })
                      }
                    >
                      {statusOptions}
                    </select>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </section>
      {adding && (
        <Modal
          title={isAdmin ? "משימת מנהל חדשה" : "משימה אישית חדשה"}
          onClose={() => setAdding(false)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onSave({
                id: crypto.randomUUID(),
                project_id: projectId,
                title: String(f.get("title")),
                assignee,
                origin: isAdmin ? "manager" : "personal",
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
              <input value={assignee} readOnly />
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
              <select name="status">{statusOptions}</select>
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
