import { useState } from "react";
import type { OfficeProjectStatus } from "../../types";
import { Badge, Modal } from "../ui";
import OfficeStatusForm from "./OfficeStatusForm";

export default function OfficeStatusCard({
  value,
  projectName,
  onSave,
  onOpen,
}: {
  value: OfficeProjectStatus;
  projectName: string;
  onSave: (status: OfficeProjectStatus) => void;
  onOpen?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const detail = value.detailed_status || "עדיין לא נכתב עדכון מפורט לפרויקט.";
  return (
    <>
      <article className="panel latest-office-card">
        <div className="latest-office-heading">
          <div>
            {onOpen ? (
              <button className="text-button strong" onClick={onOpen}>
                {projectName}
              </button>
            ) : (
              <h2>העדכון האחרון</h2>
            )}
            <p className="muted">
              {value.updated_at
                ? `עודכן ב־${new Intl.DateTimeFormat("he-IL").format(new Date(`${value.updated_at}T12:00:00`))}`
                : "טרם נשמר עדכון"}
              {value.update_owner && ` · ${value.update_owner}`}
            </p>
          </div>
          <Badge>{value.condition}</Badge>
        </div>
        {value.short_status && <h3>{value.short_status}</h3>}
        <p className={`latest-update-text ${expanded ? "" : "is-collapsed"}`}>
          {detail}
        </p>
        {detail.length > 220 && (
          <button
            className="text-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "הצגת תקציר" : "הצגת העדכון המלא"}
          </button>
        )}
        {(value.major_issues || value.manager_issue || value.manager_notes) && (
          <details className="office-additional">
            <summary>נושאים נוספים למעקב</summary>
            {value.major_issues && (
              <>
                <h4>בעיות ודרכי פתרון</h4>
                <p>{value.major_issues}</p>
              </>
            )}
            {value.manager_issue && (
              <>
                <h4>לטיפול מנהל</h4>
                <p>{value.manager_issue}</p>
              </>
            )}
            {value.manager_notes && (
              <>
                <h4>הערות מנהל</h4>
                <p>{value.manager_notes}</p>
              </>
            )}
          </details>
        )}
        <div className="latest-update-action">
          <span className="muted">יש עדכון חדש בפרויקט?</span>
          <button className="primary" onClick={() => setEditing(true)}>
            עדכון סטטוס
          </button>
        </div>
      </article>
      {editing && (
        <Modal
          title={`עדכון סטטוס · ${projectName}`}
          onClose={() => setEditing(false)}
        >
          <OfficeStatusForm
            value={value}
            onCancel={() => setEditing(false)}
            onSave={(status) => {
              onSave(status);
              setEditing(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
