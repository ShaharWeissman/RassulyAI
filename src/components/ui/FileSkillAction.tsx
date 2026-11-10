import { useState } from "react";
import { Field, Icon, Modal } from "./index";

export default function FileSkillAction({
  context,
  accept = ".xlsx,.xls,.csv,.pdf",
}: {
  context: string;
  accept?: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFile(undefined);
          setMessage("");
          setOpen(true);
        }}
      >
        <Icon name="sparkles" size={16} /> העלאת קובץ והפעלת סקיל
      </button>
      {open && (
        <Modal title={`קובץ לסקיל · ${context}`} onClose={() => setOpen(false)}>
          <div className="form-grid">
            <Field label="בחירת קובץ" className="full">
              <input
                type="file"
                accept={accept}
                onChange={(event) => {
                  setFile(event.target.files?.[0]);
                  setMessage("");
                }}
              />
            </Field>
            <p className="muted full">
              אפשר לבחור קובץ להדגמה. עיבוד אוטומטי עדיין לא זמין.
            </p>
            {message && (
              <p className="notice full" role="status">
                {message}
              </p>
            )}
            <div className="form-actions full">
              <button
                type="button"
                className="primary"
                disabled={!file}
                onClick={() =>
                  setMessage(
                    `נבחר הקובץ ${file?.name}. הקובץ נשאר בדפדפן והנתונים לא השתנו.`,
                  )
                }
              >
                הפעלת סקיל
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                סגירה
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
