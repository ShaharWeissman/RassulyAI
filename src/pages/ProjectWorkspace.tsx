import { useState } from "react";
import type {
  AppData,
  OfficeProjectStatus,
  Project,
  Protocol,
  RequirementTask,
} from "../types";
import { Badge, Modal } from "../components/ui";
import ProjectData from "../components/projects/ProjectData";
import Costs from "../components/costs/Costs";
import Tasks from "../components/tasks/Tasks";
import Protocols from "../components/protocols/Protocols";
import OfficeStatusForm from "../components/office-status/OfficeStatusForm";
export default function ProjectWorkspace({
  data,
  projectId,
  openIds,
  module,
  onModule,
  onOpen,
  onProjectSave,
  onOfficeSave,
  onTaskSave,
  onProtocolSave,
}: {
  data: AppData;
  projectId: string;
  openIds: string[];
  module: string;
  onModule: (m: string) => void;
  onOpen: (id: string) => void;
  onProjectSave: (p: Project) => void;
  onOfficeSave: (s: OfficeProjectStatus) => void;
  onTaskSave: (t: RequirementTask) => void;
  onProtocolSave: (p: Protocol) => void;
}) {
  const [picker, setPicker] = useState(false);
  const p = data.projects.find((p) => p.id === projectId)!;
  const office = data.office_project_status.find(
    (s) => s.project_id === projectId,
  )!;
  return (
    <>
      <div className="project-tabs" role="tablist" aria-label="פרויקטים פתוחים">
        <button
          className="add-project"
          aria-label="הוספה או פתיחה של פרויקט נוסף"
          onClick={() => setPicker(true)}
        >
          +
        </button>
        {openIds.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === projectId}
            className={id === projectId ? "active" : ""}
            onClick={() => onOpen(id)}
          >
            {data.projects.find((p) => p.id === id)?.name}
          </button>
        ))}
      </div>
      <div className="page-heading project-heading">
        <div>
          <span className="eyebrow">
            פרויקט <bdi>{p.code}</bdi> / {p.client}
          </span>
          <h1>{p.name}</h1>
          <p className="muted">
            {p.project_type} <span className="separator">/</span>{" "}
            {p.current_stage}
          </p>
        </div>
        <Badge>{p.status}</Badge>
      </div>
      <div className="module-tabs" role="tablist" aria-label="מודולי פרויקט">
        {[
          ["data", "נתוני פרויקט"],
          ["costs", "עלויות פרויקט"],
          ["tasks", "משימות"],
          ["protocols", "פרוטוקולים"],
          ["office", "סטטוס פרויקט משרדית"],
        ].map(([id, title]) => (
          <button
            role="tab"
            aria-selected={module === id}
            className={module === id ? "active" : ""}
            key={id}
            onClick={() => onModule(id)}
          >
            {title}
          </button>
        ))}
      </div>
      <div
        className="module-content"
        role="tabpanel"
        aria-label={
          module === "data"
            ? "נתוני פרויקט"
            : module === "costs"
              ? "עלויות פרויקט"
              : module === "tasks"
                ? "משימות"
                : module === "protocols"
                  ? "פרוטוקולים"
                  : "סטטוס פרויקט משרדית"
        }
      >
        {module === "data" && (
          <ProjectData project={p} onSave={onProjectSave} />
        )}{" "}
        {module === "costs" && (
          <Costs
            costs={data.project_costs.filter((c) => c.project_id === p.id)}
          />
        )}{" "}
        {module === "tasks" && (
          <Tasks
            projectId={p.id}
            tasks={data.requirements_tasks.filter((t) => t.project_id === p.id)}
            onSave={onTaskSave}
          />
        )}{" "}
        {module === "protocols" && (
          <Protocols
            projectId={p.id}
            protocols={data.protocols.filter((pr) => pr.project_id === p.id)}
            onSave={onProtocolSave}
          />
        )}{" "}
        {module === "office" && (
          <section className="panel padded">
            <div className="section-heading">
              <div>
                <h2>סטטוס פרויקט משרדית</h2>
                <p className="muted">העדכון כאן משותף לתמונת המצב המשרדית.</p>
              </div>
              <Badge>{office.condition}</Badge>
            </div>
            <OfficeStatusForm
              key={`${p.id}-${office.updated_at}-${office.short_status}`}
              value={office}
              onSave={onOfficeSave}
            />
          </section>
        )}
      </div>
      {picker && (
        <Modal title="פתיחת פרויקט נוסף" onClose={() => setPicker(false)}>
          <div className="project-picker">
            {data.projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onOpen(p.id);
                  setPicker(false);
                }}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.client}</small>
                </span>
                <span>{p.current_stage} ←</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
