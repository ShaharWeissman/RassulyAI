import { useState } from "react";
import type { Project } from "../../types";
import FileSkillAction from "../ui/FileSkillAction";
import { stages } from "../../types";
import { Badge, Field, Icon, Modal, Options } from "../ui";
export default function ProjectData({
  project,
  onSave,
}: {
  project: Project;
  onSave: (p: Project) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>נתוני פרויקט</h2>
            <p className="muted">פרטי הפרויקט והשלב הנוכחי</p>
          </div>
          <div className="inline-actions">
            <FileSkillAction context="נתוני פרויקט" />
            <button
              onClick={() => {
                setDraft(project);
                setEditing(true);
              }}
            >
              <Icon name="edit" size={16} />
              עריכת נתוני פרויקט
            </button>
          </div>
        </div>
        <dl className="project-details">
          <div>
            <dt>מזמין עבודה</dt>
            <dd>{project.client || "לא צוין בקובץ"}</dd>
          </div>
          <div>
            <dt>סטטוס</dt>
            <dd>
              <Badge>{project.status}</Badge>
            </dd>
          </div>
          <div>
            <dt>שלב פרויקט</dt>
            <dd>{project.current_stage}</dd>
          </div>
          <div>
            <dt>סוג פרויקט</dt>
            <dd>{project.project_type || "טרם הוגדר"}</dd>
          </div>
        </dl>
      </section>
      <section className="stage-panel">
        <span className="eyebrow">מחזור חיי הפרויקט</span>
        <h2>{project.current_stage}</h2>
        <div className="stage-track">
          {stages.slice(0, 8).map((s, i) => (
            <div
              key={s}
              className={
                s === project.current_stage
                  ? "current"
                  : stages.indexOf(project.current_stage) < 8 &&
                      i < stages.indexOf(project.current_stage)
                    ? "past"
                    : ""
              }
            >
              <span>
                {stages.indexOf(project.current_stage) < 8 &&
                i < stages.indexOf(project.current_stage) ? (
                  <Icon name="check" size={13} />
                ) : (
                  i + 1
                )}
              </span>
              <small>{s}</small>
            </div>
          ))}
        </div>
      </section>
      {editing && (
        <Modal title="עריכת נתוני פרויקט" onClose={() => setEditing(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(draft);
              setEditing(false);
            }}
          >
            <Field label="מזמין עבודה" className="full">
              <input
                value={draft.client}
                onChange={(e) => setDraft({ ...draft, client: e.target.value })}
              />
            </Field>
            <Field label="סטטוס">
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as Project["status"],
                  })
                }
              >
                <Options values={["פעיל", "בהמתנה", "הושלם"]} />
              </select>
            </Field>
            <Field label="שלב פרויקט">
              <select
                value={draft.current_stage}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    current_stage: e.target.value as Project["current_stage"],
                  })
                }
              >
                <Options values={stages} />
              </select>
            </Field>
            <Field label="סוג פרויקט">
              <select
                value={draft.project_type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    project_type: e.target.value as Project["project_type"],
                  })
                }
              >
                <option value="">טרם הוגדר</option>
                <Options values={["תכנון", "ביצוע"]} />
              </select>
            </Field>
            <div className="form-actions full">
              <button className="primary">שמירת נתונים</button>
              <button type="button" onClick={() => setEditing(false)}>
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
