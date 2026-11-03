import type { AppData, OfficeProjectStatus as OfficeStatus } from "../types";
import OfficeStatusCard from "../components/office-status/OfficeStatusCard";
import ExportProjectsButton from "../components/ui/ExportProjectsButton";
export default function OfficeProjectStatus({
  data,
  onSave,
  onOpen,
}: {
  data: AppData;
  onSave: (s: OfficeStatus) => void;
  onOpen: (id: string) => void;
}) {
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
      <div className="office-overview-actions">
        <ExportProjectsButton data={data} />
      </div>
      <div className="office-status-grid">
        {data.projects.map((project) => (
          <OfficeStatusCard
            key={project.id}
            projectName={project.name}
            value={
              data.office_project_status.find(
                (status) => status.project_id === project.id,
              )!
            }
            onSave={onSave}
            onOpen={() => onOpen(project.id)}
          />
        ))}
      </div>
    </>
  );
}
