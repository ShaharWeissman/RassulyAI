import { useState } from "react";
import type {
  AppData,
  OfficeProjectStatus,
  Project,
  ProjectCost,
  Protocol,
  RequirementTask,
} from "../types";
import { Badge, Modal } from "../components/ui";
import ProjectData from "../components/projects/ProjectData";
import Costs from "../components/costs/Costs";
import Tasks from "../components/tasks/Tasks";
import Protocols from "../components/protocols/Protocols";
import OfficeStatusCard from "../components/office-status/OfficeStatusCard";
import { demoProjectCosts } from "../data/costDefaults";
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
  onCostsSave,
  workerName,
  isAdmin,
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
  onCostsSave: (costs: ProjectCost[]) => void;
  workerName: string;
  isAdmin: boolean;
}) {
  const [picker, setPicker] = useState(false);
  const p = data.projects.find((p) => p.id === projectId)!;
  const office = data.office_project_status.find(
    (s) => s.project_id === projectId,
  )!;
  return (
    <div className="project-workspace">
      <div className="project-tabs" role="tablist" aria-label="פרויקטים פתוחים">
        <button
          className="add-project"
          aria-label="הוספה או פתיחה של פרויקט נוסף"
          onClick={() => setPicker(true)}
        >
          + פתח פרויקט
        </button>
        {openIds.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === projectId}
            className={id === projectId ? "active" : ""}
            onClick={() => onOpen(id)}
          >
            <span className="project-tab-dot" />
            {data.projects.find((p) => p.id === id)?.name}
          </button>
        ))}
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
      <div className="page-heading project-heading">
        <div>
          <span className="eyebrow">
            פרויקט <bdi>{p.code}</bdi> / {p.client}
          </span>
          <div className="project-title-line">
            <h1>{p.name}</h1>
            <Badge>{p.status}</Badge>
          </div>
          <p className="muted">
            מזמין עבודה: {p.client || "לא צוין בקובץ"} · מנהל פרויקט:{" "}
            {workerName}
          </p>
        </div>
        <div className="project-heading-actions">
          <button className="primary" onClick={() => onModule("office")}>
            עדכון סטטוס
          </button>
          <button onClick={() => onModule("data")}>נתוני פרויקט</button>
        </div>
      </div>
      <dl className="workspace-summary">
        <div>
          <dt>סטטוס כללי</dt>
          <dd>{office.short_status || p.current_stage}</dd>
        </div>
        <div>
          <dt>לו״ז לגמר השלב</dt>
          <dd className="numeric">
            {office.stage_due_date
              ? new Intl.DateTimeFormat("he-IL").format(
                  new Date(`${office.stage_due_date}T12:00:00`),
                )
              : "טרם נקבע"}
          </dd>
        </div>
        <div>
          <dt>אומדן / תקציב לביצוע</dt>
          <dd>
            {office.budget === null
              ? "לא צוין"
              : new Intl.NumberFormat("he-IL", {
                  style: "currency",
                  currency: "ILS",
                  maximumFractionDigits: 0,
                }).format(office.budget)}
          </dd>
        </div>
        <div>
          <dt>הגורם הנדרש לעדכן</dt>
          <dd>{office.update_owner || workerName}</dd>
        </div>
        <div>
          <dt>עדכון אחרון</dt>
          <dd className="numeric">
            {office.updated_at
              ? new Intl.DateTimeFormat("he-IL").format(
                  new Date(`${office.updated_at}T12:00:00`),
                )
              : "טרם עודכן"}
          </dd>
        </div>
        <div>
          <dt>מצב משרדי</dt>
          <dd>
            <Badge>{office.condition}</Badge>
          </dd>
        </div>
      </dl>
      <div
        className="module-content"
        id="project-module-content"
        tabIndex={-1}
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
            project={p}
            sourceBudget={office.budget}
            costs={
              data.project_costs.some((c) => c.project_id === p.id)
                ? data.project_costs.filter((c) => c.project_id === p.id)
                : demoProjectCosts(p.id, office.budget)
            }
            onSave={onCostsSave}
            onVarianceSave={(items) =>
              onProjectSave({ ...p, variance_items: items })
            }
          />
        )}{" "}
        {module === "tasks" && (
          <Tasks
            projectId={p.id}
            assignee={data.workers[0]?.name ?? workerName}
            isAdmin={isAdmin}
            managerTasks={p.manager_tasks ?? ""}
            onManagerTasksSave={
              isAdmin
                ? (value) => onProjectSave({ ...p, manager_tasks: value })
                : undefined
            }
            tasks={data.requirements_tasks.filter((t) => t.project_id === p.id)}
            onSave={onTaskSave}
          />
        )}{" "}
        {module === "protocols" && (
          <Protocols
            projectId={p.id}
            workspaceId={data.workers[0]?.id ?? ""}
            protocols={data.protocols.filter((pr) => pr.project_id === p.id)}
            onSave={onProtocolSave}
          />
        )}{" "}
        {module === "office" && (
          <OfficeStatusCard
            key={p.id}
            value={office}
            projectName={p.name}
            onSave={onOfficeSave}
          />
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
    </div>
  );
}
