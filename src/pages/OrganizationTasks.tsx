import { useEffect, useState } from "react";
import { Empty, Field, Modal } from "../components/ui";
import { cloudClient } from "../data/cloudWorkspace";
import "../styles/organization-tasks.css";

const statuses = ["פתוח", "בטיפול", "בוצע"] as const;
type Status = (typeof statuses)[number];
type Task = {
  id: string;
  worker_id: string;
  kind: "manager" | "personal";
  title: string;
  description: string;
  status: Status;
};
type Board = { tasks: Task[]; workers: { id: string; name: string }[] };

async function readBoard(): Promise<Board> {
  if (!cloudClient) throw new Error("לוח המשימות זמין בחיבור לשרת.");
  const { data, error } = await cloudClient.rpc("organization_tasks_read");
  if (error?.code === "PGRST202")
    throw new Error("יש להפעיל את עדכון מסד הנתונים של לוח המשימות.");
  if (error) throw new Error("טעינת המשימות נכשלה.");
  return data as Board;
}

export default function OrganizationTasks({ admin }: { admin: boolean }) {
  const [board, setBoard] = useState<Board>();
  const [owner, setOwner] = useState("");
  const [editor, setEditor] = useState<Task | "new">();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    readBoard()
      .then((value) => {
        if (active) setBoard(value);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  async function save(
    action: "create" | "edit" | "status",
    id: string | null,
    input: object,
  ) {
    if (!cloudClient || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await cloudClient.rpc("organization_tasks_write", {
        action,
        task_id: id,
        input,
      });
      if (result.error)
        throw new Error("שמירת המשימה נכשלה. בדוק את ההרשאה ואת השדות.");
      setEditor(undefined);
      setBoard(await readBoard());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "שמירת המשימה נכשלה.",
      );
    } finally {
      setBusy(false);
    }
  }

  const tasks = (board?.tasks ?? []).filter(
    (task) => !owner || task.worker_id === owner,
  );
  const workerName = (id: string) =>
    board?.workers.find((worker) => worker.id === id)?.name ?? id;
  const editing = editor && editor !== "new" ? editor : undefined;
  return (
    <div className="organization-tasks">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {admin ? "ניהול החברה" : "סביבת העבודה שלי"}
          </span>
          <h1>{admin ? "משימות העובדים" : "המשימות שלי"}</h1>
          <p className="muted">
            {admin
              ? "שיוך משימות מנהל ומעקב אחר ביצוע."
              : "משימות מנהל שהוקצו לך ומשימות שהגדרת לעצמך."}
          </p>
        </div>
        {board && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setError("");
              setEditor("new");
            }}
          >
            {admin ? "הקצאת משימת מנהל" : "הוספת משימה אישית"}
          </button>
        )}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => {
              setError("");
              setReload((n) => n + 1);
            }}
          >
            רענון
          </button>
        </p>
      )}
      {!board && !error && <p role="status">טוען משימות…</p>}
      {board && (
        <>
          {admin && (
            <div className="panel padded">
              <Field label="עובד">
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  <option value="">כולם</option>
                  {board.workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          {(["manager", "personal"] as const).map((kind) => (
            <section className="panel padded" key={kind}>
              <h2>
                {kind === "manager"
                  ? "משימות מנהל"
                  : admin
                    ? "משימות אישיות של העובדים"
                    : "משימות אישיות"}
              </h2>
              <div className="organization-task-columns">
                {statuses.map((status) => {
                  const matching = tasks.filter(
                    (task) => task.kind === kind && task.status === status,
                  );
                  return (
                    <div className="organization-task-column" key={status}>
                      <h3>
                        {status} <small>{matching.length}</small>
                      </h3>
                      {!matching.length && <Empty text="אין משימות" />}
                      {matching.map((task) => (
                        <article
                          className="organization-task-card"
                          key={task.id}
                        >
                          <strong>{task.title}</strong>
                          {admin && (
                            <small className="muted">
                              {workerName(task.worker_id)}
                            </small>
                          )}
                          {task.description && (
                            <p className="preserve-whitespace">
                              {task.description}
                            </p>
                          )}
                          {(!admin || kind === "manager") && (
                            <select
                              aria-label={`סטטוס: ${task.title}`}
                              disabled={busy}
                              value={task.status}
                              onChange={(e) =>
                                void save("status", task.id, {
                                  status: e.target.value,
                                })
                              }
                            >
                              {statuses.map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          )}
                          {(admin
                            ? kind === "manager"
                            : kind === "personal") && (
                            <button
                              disabled={busy}
                              onClick={() => {
                                setError("");
                                setEditor(task);
                              }}
                            >
                              עריכה
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
      {editor && (
        <Modal
          title={
            editing
              ? "עריכת משימה"
              : admin
                ? "הקצאת משימת מנהל"
                : "משימה אישית חדשה"
          }
          onClose={() => !busy && setEditor(undefined)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void save(editing ? "edit" : "create", editing?.id ?? null, {
                title: form.get("title"),
                description: form.get("description"),
                worker_id: form.get("worker_id"),
                status: form.get("status"),
              });
            }}
          >
            {admin && !editing && (
              <Field label="עובד" className="full">
                <select name="worker_id" required defaultValue={owner}>
                  <option value="" disabled>
                    בחר עובד
                  </option>
                  {board?.workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="כותרת" className="full">
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={editing?.title}
              />
            </Field>
            <Field label="פרטים" className="full">
              <textarea
                name="description"
                maxLength={3000}
                defaultValue={editing?.description}
              />
            </Field>
            {!admin && !editing && (
              <Field label="סטטוס">
                <select name="status">
                  {statuses.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            )}
            {error && (
              <p className="full" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions full">
              <button className="primary" disabled={busy}>
                שמירת משימה
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditor(undefined)}
              >
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
