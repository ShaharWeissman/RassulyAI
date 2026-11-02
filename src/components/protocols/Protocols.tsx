import { useState } from "react";
import type { Protocol, ProtocolItem, TaskStatus } from "../../types";
import { Badge, Empty, Field, Options } from "../ui";
const newItem = (): ProtocolItem => ({
  id: crypto.randomUUID(),
  title: "",
  assignee: "",
  due_date: "",
  status: "פתוח",
});
export default function Protocols({
  projectId,
  protocols,
  onSave,
}: {
  projectId: string;
  protocols: Protocol[];
  onSave: (p: Protocol) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<ProtocolItem[]>([newItem()]);
  const [selected, setSelected] = useState<string | null>(null);
  const update = (id: string, change: Partial<ProtocolItem>) =>
    setItems(items.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const protocol = protocols.find((p) => p.id === selected);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>פרוטוקולים</h2>
            <p className="muted">סיכומים, החלטות ומשימות להמשך</p>
          </div>
          <button
            className="primary"
            onClick={() => {
              setItems([newItem()]);
              setCreating(true);
              setSelected(null);
            }}
          >
            + פרוטוקול חדש
          </button>
        </div>
        {protocols.length ? (
          <div className="protocol-list">
            {protocols.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelected(p.id);
                  setCreating(false);
                }}
              >
                <span>
                  <strong>{p.protocol_type}</strong>
                  <small>{p.participants}</small>
                </span>
                <span>{p.date}</span>
                <span>{p.items.length} החלטות</span>
                <span>פתיחה ←</span>
              </button>
            ))}
          </div>
        ) : (
          !creating && (
            <Empty text="אין פרוטוקולים בפרויקט. אפשר ליצור את הפרוטוקול הראשון." />
          )
        )}
      </section>
      {creating && (
        <section className="panel padded">
          <h2>פרוטוקול חדש</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const files = f
                .getAll("attachments")
                .filter((v): v is File => v instanceof File && !!v.name);
              onSave({
                id: crypto.randomUUID(),
                project_id: projectId,
                protocol_type: String(f.get("type")),
                date: String(f.get("date")),
                participants: String(f.get("participants")),
                summary: String(f.get("summary")),
                items,
                attachments: files.map((file) => ({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                })),
              });
              setCreating(false);
            }}
          >
            <Field label="סוג פרוטוקול">
              <select name="type">
                <Options
                  values={[
                    "פגישת סטטוס",
                    "מסירה",
                    "פגישת תכנון",
                    "סטטוס פרויקט מול מזמין",
                  ]}
                />
              </select>
            </Field>
            <Field label="תאריך">
              <input
                required
                type="date"
                name="date"
                defaultValue={new Date().toLocaleDateString("en-CA")}
              />
            </Field>
            <Field label="משתתפים" className="full">
              <input
                required
                name="participants"
                placeholder="שמות המשתתפים בפגישה"
              />
            </Field>
            <Field label="סיכום / החלטות" className="full">
              <textarea required name="summary" rows={3} />
            </Field>
            <div className="full">
              <div className="section-heading compact">
                <h3>משימות / החלטות</h3>
                <button
                  type="button"
                  onClick={() => setItems([...items, newItem()])}
                >
                  + הוספת סעיף
                </button>
              </div>
              {items.map((item, i) => (
                <fieldset className="protocol-item" key={item.id}>
                  <legend>סעיף {i + 1}</legend>
                  <Field label="משימה / החלטה" className="full">
                    <input
                      required
                      value={item.title}
                      onChange={(e) =>
                        update(item.id, { title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="אחראי">
                    <input
                      required
                      value={item.assignee}
                      onChange={(e) =>
                        update(item.id, { assignee: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="תאריך יעד">
                    <input
                      required
                      type="date"
                      value={item.due_date}
                      onChange={(e) =>
                        update(item.id, { due_date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="סטטוס">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        update(item.id, {
                          status: e.target.value as TaskStatus,
                        })
                      }
                    >
                      <Options values={["פתוח", "בטיפול", "הושלם", "באיחור"]} />
                    </select>
                  </Field>
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems(items.filter((it) => it.id !== item.id))
                    }
                  >
                    הסרת סעיף
                  </button>
                </fieldset>
              ))}
            </div>
            <Field label="צירוף קבצים" className="full">
              <input name="attachments" type="file" multiple />
              <small className="muted">
                בהדגמה נשמרים שמות הקבצים בלבד; תוכן הקבצים אינו מועלה.
              </small>
            </Field>
            <div className="form-actions full">
              <button className="primary">שמירת פרוטוקול</button>
              <button type="button" onClick={() => setCreating(false)}>
                ביטול
              </button>
            </div>
          </form>
        </section>
      )}
      {protocol && (
        <section className="panel padded">
          <div className="section-heading">
            <h2>{protocol.protocol_type}</h2>
            <span>{protocol.date}</span>
          </div>
          <dl className="protocol-details">
            <dt>משתתפים</dt>
            <dd>{protocol.participants}</dd>
            <dt>סיכום / החלטות</dt>
            <dd className="preserve-whitespace">{protocol.summary}</dd>
          </dl>
          <h3>משימות / החלטות</h3>
          {protocol.items.map((i, index) => (
            <div className="saved-item" key={i.id}>
              <strong>
                {index + 1}. {i.title}
              </strong>
              <span>{i.assignee}</span>
              <span>{i.due_date}</span>
              <Badge>{i.status}</Badge>
            </div>
          ))}
          <h3>קבצים מצורפים</h3>
          {protocol.attachments.length ? (
            <ul>
              {protocol.attachments.map((f, i) => (
                <li key={i}>
                  {f.name} · {Math.ceil(f.size / 1024)} KB{" "}
                  <span className="muted">(פרטי קובץ בלבד)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">לא צורפו קבצים</p>
          )}
        </section>
      )}
    </>
  );
}
