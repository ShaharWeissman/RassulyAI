import { useState } from "react";
import type { ProjectSchedule as Schedule } from "../../types";
import { Field, Modal, Table } from "../ui";
import { importContractorSchedule } from "../../utils/importContractorSchedule";
import "../../styles/project-schedule.css";

const milestones = [
  ["workOrderDate", "מועד צו תחילת עבודה"],
  ["contractualEndDate", "מועד סיום חוזי"],
  ["handoverDate", "מועד מסירת הפרויקט"],
] as const;
const formatDate = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC" });

function ScheduleTable({
  activities,
}: {
  activities: NonNullable<Schedule["contractor"]>["activities"];
}) {
  return (
    <Table caption="פעילויות בלו״ז הקבלן" headers={["פעילות", "תחילה", "סיום"]}>
      {activities.map(({ name, start, end }, index) => (
        <tr key={index}>
          <th scope="row">{name}</th>
          <td className="numeric">{formatDate.format(new Date(start))}</td>
          <td className="numeric">{formatDate.format(new Date(end))}</td>
        </tr>
      ))}
    </Table>
  );
}

export default function ProjectSchedule({
  value,
  onSave,
}: {
  value?: Schedule;
  onSave: (value: Schedule) => void;
}) {
  const schedule = value ?? {
    workOrderDate: "",
    contractualEndDate: "",
    handoverDate: "",
  };
  const [modal, setModal] = useState<"edit" | "view" | "import">();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] =
    useState<ReturnType<typeof importContractorSchedule>>();
  function open(next: "edit" | "view" | "import") {
    setError("");
    setPreview(undefined);
    setModal(next);
  }

  return (
    <>
      <section className="panel padded">
        <div className="project-schedule-heading">
          <h2>ציר זמן פרויקטלי</h2>
          <button type="button" onClick={() => open("edit")}>
            עדכון מועדים
          </button>
        </div>
        <ol className="project-timeline">
          {milestones.map(([key, label]) => (
            <li key={key}>
              <strong>{label}</strong>
              {schedule[key] ? (
                <time dateTime={schedule[key]}>
                  {formatDate.format(new Date(schedule[key]))}
                </time>
              ) : (
                <span className="muted">טרם נקבע</span>
              )}
            </li>
          ))}
        </ol>
      </section>
      <section className="panel padded">
        <div className="project-schedule-heading">
          <div>
            <h2>לוח זמנים של הקבלן</h2>
            <p className="muted">
              {schedule.contractor
                ? `${schedule.contractor.activities.length} פעילויות · ${schedule.contractor.filename}`
                : "טרם יובא לוח זמנים."}
            </p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              disabled={!schedule.contractor}
              onClick={() => open("view")}
            >
              הצגת לו״ז קבלן
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => open("import")}
            >
              ייבוא לו״ז קבלן
            </button>
          </div>
        </div>
      </section>
      {modal === "edit" && (
        <Modal title="עדכון מועדי הפרויקט" onClose={() => setModal(undefined)}>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const workOrderDate = String(form.get("workOrderDate"));
              const contractualEndDate = String(form.get("contractualEndDate"));
              const handoverDate = String(form.get("handoverDate"));
              if (
                workOrderDate &&
                [contractualEndDate, handoverDate].some(
                  (date) => date && date < workOrderDate,
                )
              ) {
                setError(
                  "מועדי הסיום והמסירה אינם יכולים להקדים את צו תחילת העבודה.",
                );
                return;
              }
              onSave({
                ...schedule,
                workOrderDate,
                contractualEndDate,
                handoverDate,
              });
              setModal(undefined);
            }}
          >
            {milestones.map(([key, label]) => (
              <Field label={label} key={key}>
                <input type="date" name={key} defaultValue={schedule[key]} />
              </Field>
            ))}
            {error && (
              <p role="alert" className="error full">
                {error}
              </p>
            )}
            <div className="form-actions full">
              <button className="primary">שמירת מועדים</button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "view" && schedule.contractor && (
        <Modal title="לו״ז קבלן" onClose={() => setModal(undefined)}>
          <p className="muted">{schedule.contractor.filename}</p>
          <ScheduleTable activities={schedule.contractor.activities} />
        </Modal>
      )}
      {modal === "import" && (
        <Modal
          title="ייבוא לו״ז קבלן"
          onClose={() => !loading && setModal(undefined)}
        >
          <p>בחר קובץ XLSX עם עמודות פעילות, התחלה וסיום.</p>
          <Field label="קובץ לוח זמנים">
            <input
              type="file"
              accept=".xlsx"
              disabled={loading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                setPreview(undefined);
                setError("");
                if (!file) return;
                if (!/\.xlsx$/i.test(file.name) || file.size > 12_000_000) {
                  setError("בחר קובץ XLSX עד 12 מגה.");
                  return;
                }
                setLoading(true);
                try {
                  setPreview(
                    importContractorSchedule(
                      new Uint8Array(await file.arrayBuffer()),
                      file.name,
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
          {loading && <p role="status">קורא את לוח הזמנים…</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {preview && (
            <>
              <p>{preview.schedule.activities.length} פעילויות לייבוא.</p>
              {preview.skipped > 0 && (
                <p className="muted">
                  {preview.skipped} שורות עם מידע חסר או תאריכים לא תקינים לא
                  ייובאו.
                </p>
              )}
              <ScheduleTable
                activities={preview.schedule.activities.slice(0, 8)}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    onSave({ ...schedule, contractor: preview.schedule });
                    setModal(undefined);
                  }}
                >
                  {schedule.contractor ? "החלפת לו״ז קיים" : "שמירת לו״ז קבלן"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
