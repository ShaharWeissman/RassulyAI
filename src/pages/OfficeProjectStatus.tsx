import { useState } from "react";
import type { AppData, OfficeProjectStatus as OfficeStatus } from "../types";
import { Badge, Modal, Table } from "../components/ui";
import OfficeStatusForm from "../components/office-status/OfficeStatusForm";
export default function OfficeProjectStatus({
  data,
  onSave,
  onOpen,
}: {
  data: AppData;
  onSave: (s: OfficeStatus) => void;
  onOpen: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const selected = data.office_project_status.find(
    (s) => s.project_id === editing,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">מבט רוחבי</span>
          <h1>סטטוס פרויקט משרדית</h1>
          <p className="muted">עדכונים שוטפים מכל הפרויקטים שלך, במקום אחד.</p>
        </div>
        <span className="subtle-label">
          {data.projects.length} פרויקטים משויכים
        </span>
      </div>
      <section className="panel">
        <Table
          caption="סטטוס משרדי לכל הפרויקטים"
          headers={[
            "פרויקט",
            "שלב",
            "סטטוס משרדית",
            "גורם מעדכן",
            "יעד לגמר השלב",
            "עדכון אחרון",
            "פעולה",
          ]}
        >
          {data.projects.map((p) => {
            const s = data.office_project_status.find(
              (s) => s.project_id === p.id,
            )!;
            return (
              <tr key={p.id}>
                <td>
                  <button
                    className="text-button strong"
                    onClick={() => onOpen(p.id)}
                  >
                    {p.name}
                  </button>
                  <small className="cell-sub">{p.client}</small>
                </td>
                <td>{p.current_stage}</td>
                <td>
                  <Badge>{s.condition}</Badge>
                  <small className="cell-sub">{s.short_status}</small>
                </td>
                <td>{s.update_owner || "—"}</td>
                <td className="numeric">{s.stage_due_date || "—"}</td>
                <td className="numeric">{s.updated_at || "—"}</td>
                <td>
                  <div className="inline-actions">
                    <button onClick={() => setEditing(p.id)}>עדכון</button>
                    <button
                      className="text-button"
                      onClick={() => setEditing(p.id)}
                    >
                      עריכה
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </section>
      {selected && (
        <Modal
          title={`עדכון משרדית · ${data.projects.find((p) => p.id === editing)!.name}`}
          onClose={() => setEditing(null)}
        >
          <OfficeStatusForm
            value={selected}
            onSave={(s) => {
              onSave(s);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
