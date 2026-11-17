import { useEffect, useState } from "react";
import type { ProjectSchedule as Schedule } from "../../types";
import { Field, Icon, Modal, Table } from "../ui";
import ScheduleTimeline from "./ScheduleTimeline";
import { importContractorSchedule } from "../../utils/importContractorSchedule";
import {
  loadScheduleFile,
  pdfType,
  scheduleFileType,
  storeScheduleFile,
} from "../../data/scheduleFiles";
import "../../styles/project-schedule.css";

const milestones = [
  ["workOrderDate", "מועד צו תחילת עבודה"],
  ["contractualEndDate", "מועד סיום חוזי"],
  ["handoverDate", "מועד מסירת הפרויקט"],
] as const;
const formatDate = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC" });
type Contractor = NonNullable<Schedule["contractor"]>;

function FilePreview({
  file,
  filename,
  contentType = file.type,
}: {
  file: Blob;
  filename: string;
  contentType?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file.slice(0, file.size, contentType));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file, contentType]);
  if (!url) return null;
  return (
    <>
      {contentType === pdfType && (
        <iframe
          className="schedule-pdf-preview"
          title={`תצוגה מקדימה של ${filename}`}
          src={url}
        />
      )}
      <a href={url} download={filename}>
        הורדת הקובץ המקורי
      </a>
    </>
  );
}

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
  projectId,
  value,
  onSave,
}: {
  projectId: string;
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
  const [preview, setPreview] = useState<{
    schedule: Contractor;
    skipped: number;
    file: File;
    contentType: string;
  }>();
  const [savedFile, setSavedFile] = useState<Blob>();
  function open(next: "edit" | "view" | "import") {
    setError("");
    setPreview(undefined);
    setSavedFile(undefined);
    setModal(next);
  }
  async function showSavedSchedule() {
    open("view");
    const original = schedule.contractor?.original;
    if (!original) return;
    setLoading(true);
    try {
      setSavedFile(await loadScheduleFile(original.path, original.contentType));
    } catch {
      setError("לא ניתן לטעון את הקובץ המקורי. נסה לפתוח אותו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="panel padded">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2>ציר זמן פרויקט</h2>
          <div className="inline-actions">
            <button
              type="button"
              className="primary"
              onClick={() => open("import")}
            >
              <Icon name="file" size={17} /> העלאת לוז קבלן
            </button>
            <button type="button" onClick={() => open("edit")}>
              <Icon name="edit" size={17} /> עריכת נתוני לוחות זמנים
            </button>
          </div>
        </div>
        <ScheduleTimeline
          schedule={schedule}
          onShowFile={() => void showSavedSchedule()}
        />
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
        <Modal
          title="לו״ז קבלן"
          onClose={() => !loading && setModal(undefined)}
        >
          <p className="muted">{schedule.contractor.filename}</p>
          {schedule.contractor.original?.contentType !== pdfType && (
            <ScheduleTable activities={schedule.contractor.activities} />
          )}
          {loading && <p role="status">טוען את הקובץ המקורי…</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {savedFile && (
            <FilePreview
              file={savedFile}
              filename={schedule.contractor.filename}
            />
          )}
          {!schedule.contractor.original && (
            <p className="muted">
              הטבלה נשמרה בייבוא קודם. כדי לאפשר הורדה של המקור, יש להעלות את
              הקובץ שוב.
            </p>
          )}
        </Modal>
      )}
      {modal === "import" && (
        <Modal
          title="ייבוא לו״ז קבלן"
          onClose={() => !loading && setModal(undefined)}
        >
          <p>
            בחר PDF, Excel ‏(XLSX) או CSV בקידוד UTF-8. לקובץ טבלאי נדרשות
            עמודות פעילות, התחלה וסיום.
          </p>
          <Field label="קובץ לוח זמנים">
            <input
              type="file"
              accept=".xlsx,.csv,.pdf"
              disabled={loading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                setPreview(undefined);
                setError("");
                if (!file) return;
                const contentType = scheduleFileType(file.name);
                if (!contentType || !file.size || file.size > 12_000_000) {
                  setError("בחר קובץ PDF, XLSX או CSV עד 12 מגה.");
                  return;
                }
                setLoading(true);
                try {
                  if (contentType === pdfType) {
                    if (!(await file.slice(0, 1024).text()).includes("%PDF-"))
                      throw new Error("הקובץ אינו מסמך PDF תקין.");
                    setPreview({
                      schedule: { filename: file.name, activities: [] },
                      skipped: 0,
                      file,
                      contentType,
                    });
                  } else {
                    setPreview({
                      ...importContractorSchedule(
                        new Uint8Array(await file.arrayBuffer()),
                        file.name,
                      ),
                      file,
                      contentType,
                    });
                  }
                } catch (reason) {
                  setError(
                    reason instanceof Error &&
                      /[\u0590-\u05ff]/.test(reason.message)
                      ? reason.message
                      : "לא ניתן לקרוא את קובץ לוח הזמנים.",
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
              {preview.contentType !== pdfType && (
                <p>
                  {preview.schedule.activities.length} פעילויות לייבוא. מוצגות
                  עד 8 הפעילויות הראשונות.
                </p>
              )}
              {preview.skipped > 0 && (
                <p className="muted">
                  {preview.skipped} שורות עם מידע חסר או תאריכים לא תקינים לא
                  ייובאו.
                </p>
              )}
              {preview.contentType !== pdfType && (
                <ScheduleTable
                  activities={preview.schedule.activities.slice(0, 8)}
                />
              )}
              <FilePreview
                file={preview.file}
                filename={preview.schedule.filename}
                contentType={preview.contentType}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={loading}
                  onClick={async () => {
                    setError("");
                    setLoading(true);
                    try {
                      const original = await storeScheduleFile(
                        projectId,
                        preview.file,
                        preview.contentType,
                      );
                      onSave({
                        ...schedule,
                        contractor: { ...preview.schedule, original },
                      });
                      setModal(undefined);
                    } catch {
                      setError("שמירת הקובץ המקורי נכשלה. נסה שוב.");
                    } finally {
                      setLoading(false);
                    }
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
