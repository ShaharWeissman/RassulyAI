import { useEffect, useState } from "react";
import type {
  OfficeProjectStatus as OfficeStatus,
  Project,
  Worker,
} from "./types";
import { assignedProjectIds } from "./data/auth";
import { useWorkspace } from "./data/useWorkspace";
import {
  cloudEnabled,
  fetchWorkspace,
  restoreSession,
  signOut,
  submitLeaveRequest,
} from "./data/cloudWorkspace";
import { Icon } from "./components/ui";
import AppHeader from "./components/ui/AppHeader";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import OfficeProjectStatus from "./pages/OfficeProjectStatus";
import OfficeBilling from "./pages/OfficeBilling";
import AdminOverview from "./pages/AdminOverview";
import OrganizationTasks from "./pages/OrganizationTasks";
import OfficeContacts from "./pages/OfficeContacts";
import CarReport from "./components/dashboard/CarReport";
import Personal from "./components/dashboard/Personal";
import { navigationPageTitle } from "./data/navigation";
import "./styles/motion.css";

const navigationKey = "rassuly-navigation";
const projectModules = ["data", "costs", "tasks", "protocols", "office"];
type SavedNavigation = {
  workerId: string;
  ownerId: string;
  page: string;
  projectId: string;
  module: string;
  openIds: string[];
};

function readNavigation(workerId: string): SavedNavigation | null {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(navigationKey) ?? "null",
    ) as SavedNavigation | null;
    return saved?.workerId === workerId ? saved : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const {
    data,
    setData,
    initialize,
    pending,
    saving,
    error,
    retry,
    downloadBackup,
  } = useWorkspace();
  const currentWorkerId = cloudEnabled
    ? (data.workers[0]?.id ?? "")
    : (worker?.id ?? "");
  const supervisor = worker?.id === "admin";
  const [switching, setSwitching] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [projectId, setProjectId] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [module, setModule] = useState("data");
  const [notice, setNotice] = useState("");
  const [restoring, setRestoring] = useState(cloudEnabled);
  const [restoreError, setRestoreError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  useEffect(() => {
    if (!cloudEnabled) return;
    let active = true;
    async function restore() {
      try {
        const session = await restoreSession();
        if (!active || !session) return;
        const admin = session.worker.id === "admin";
        const saved = readNavigation(session.worker.id);
        let workspace = session;
        if (
          admin &&
          saved?.page === "project" &&
          saved.ownerId &&
          saved.ownerId !== session.worker.id
        ) {
          try {
            workspace = {
              ...(await fetchWorkspace(saved.ownerId)),
              worker: session.worker,
            };
          } catch {
            // A removed assignment must not prevent entering the workspace.
          }
        }
        if (!active) return;
        const allowed = assignedProjectIds(
          workspace.data,
          workspace.data.workers[0]?.id ?? "",
        );
        const validProject =
          saved?.page === "project" &&
          allowed.includes(saved.projectId) &&
          workspace.data.projects.some(
            (project) => project.id === saved.projectId,
          );
        initialize(workspace.data, workspace.revision);
        setWorker(session.worker);
        if (validProject && saved) {
          setPage("project");
          setProjectId(saved.projectId);
          setOpenIds(
            Array.from(
              new Set([
                ...(Array.isArray(saved.openIds)
                  ? saved.openIds.filter((id) => allowed.includes(id))
                  : []),
                saved.projectId,
              ]),
            ),
          );
          setModule(
            projectModules.includes(saved.module) ? saved.module : "data",
          );
        } else if (saved && navigationPageTitle(saved.page, admin)) {
          setPage(saved.page);
        }
      } catch {
        if (active)
          setRestoreError("לא הצלחנו לשחזר את החיבור. אפשר לנסות שוב.");
      } finally {
        if (active) setRestoring(false);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, [initialize, restoreAttempt]);

  useEffect(() => {
    if (!cloudEnabled || !worker) return;
    try {
      const saved: SavedNavigation = {
        workerId: worker.id,
        ownerId: currentWorkerId,
        page,
        projectId,
        module,
        openIds,
      };
      sessionStorage.setItem(navigationKey, JSON.stringify(saved));
    } catch {
      // Navigation works even when browser storage is unavailable.
    }
  }, [worker, currentWorkerId, page, projectId, module, openIds]);
  const assignedIds = assignedProjectIds(data, currentWorkerId);
  const notify = (message = "השינויים נשמרו בהצלחה") =>
    setNotice(cloudEnabled ? "" : message);
  const navigate = (target: string) => {
    setPage(target);
    setNotice("");
    window.scrollTo({ top: 0 });
  };
  const selectProjectModule = (target: string) => {
    setModule(target);
    setNotice("");
    requestAnimationFrame(() => {
      const content = document.getElementById("project-module-content");
      content?.focus({ preventScroll: true });
      content?.scrollIntoView({ block: "start" });
    });
  };
  const openProject = (id: string) => {
    if (!assignedIds.includes(id)) return;
    setProjectId(id);
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setPage("project");
    setModule("data");
    setNotice("");
    window.scrollTo({ top: 0 });
  };
  const openAdminProject = async (owner: string, id: string) => {
    if (!supervisor || switching) return;
    if (pending) {
      setNotice("יש להמתין לסיום השמירה לפני מעבר לפרויקט אחר.");
      return;
    }
    setSwitching(true);
    try {
      const workspace = await fetchWorkspace(owner);
      initialize(workspace.data, workspace.revision);
      setProjectId(id);
      setOpenIds([id]);
      setModule("data");
      navigate("project");
    } catch {
      setNotice("לא ניתן לפתוח את הפרויקט.");
    } finally {
      setSwitching(false);
    }
  };
  const saveOffice = (s: OfficeStatus) => {
    if (!assignedIds.includes(s.project_id)) return;
    setData((d) => ({
      ...d,
      office_project_status: d.office_project_status.map((v) =>
        v.project_id === s.project_id
          ? { ...s, manager_notes: v.manager_notes, source: v.source }
          : v,
      ),
    }));
    notify("הסטטוס המשרדי עודכן בכל המסכים");
  };
  const saveProject = (p: Project) => {
    if (!assignedIds.includes(p.id)) return;
    setData((d) => ({
      ...d,
      projects: d.projects.map((v) => (v.id === p.id ? p : v)),
      project_status_updates:
        d.projects.find((v) => v.id === p.id)?.current_stage !== p.current_stage
          ? [
              ...d.project_status_updates,
              {
                id: crypto.randomUUID(),
                project_id: p.id,
                current_stage: p.current_stage,
                updated_at: new Date().toISOString(),
                worker_id: currentWorkerId,
              },
            ]
          : d.project_status_updates,
    }));
    notify();
  };
  const userData = {
    ...data,
    workers: data.workers.filter((w) => w.id === currentWorkerId),
    project_assignments: data.project_assignments.filter(
      (a) => a.worker_id === currentWorkerId,
    ),
    projects: data.projects.filter((p) => assignedIds.includes(p.id)),
    requirements_tasks: data.requirements_tasks.filter((t) =>
      assignedIds.includes(t.project_id),
    ),
    office_project_status: data.office_project_status.filter((s) =>
      assignedIds.includes(s.project_id),
    ),
    project_costs: data.project_costs.filter((c) =>
      assignedIds.includes(c.project_id),
    ),
    protocols: data.protocols.filter((p) => assignedIds.includes(p.project_id)),
    project_status_updates: data.project_status_updates.filter((s) =>
      assignedIds.includes(s.project_id),
    ),
    mileage_entries: data.mileage_entries.filter(
      (m) => m.worker_id === currentWorkerId,
    ),
    leave_requests: data.leave_requests.filter(
      (l) => l.worker_id === currentWorkerId,
    ),
  };
  if (restoring || restoreError)
    return (
      <main
        className="session-restore"
        role={restoreError ? "alert" : "status"}
      >
        <p>{restoreError || "משחזר את סביבת העבודה…"}</p>
        {restoreError && (
          <button
            className="primary"
            onClick={() => {
              setRestoring(true);
              setRestoreError("");
              setRestoreAttempt((attempt) => attempt + 1);
            }}
          >
            ניסיון נוסף
          </button>
        )}
      </main>
    );
  if (!worker)
    return (
      <Login
        onLogin={(selected, workspace) => {
          if (workspace) initialize(workspace.data, workspace.revision);
          setWorker(selected);
          setProjectId("");
          setOpenIds([]);
          setModule("data");
          setNotice("");
          setPage("dashboard");
          window.scrollTo({ top: 0 });
        }}
      />
    );
  const title =
    page === "project"
      ? data.projects.find((p) => p.id === projectId)!.name
      : navigationPageTitle(page, supervisor);
  return (
    <div className={`app-shell ${page === "project" ? "is-project" : ""}`}>
      <a className="skip-link" href="#main-content">
        דלג לתוכן הראשי
      </a>

      <div className="main-shell">
        <AppHeader
          worker={worker}
          page={page}
          title={title}
          module={module}
          onProjectNavigate={selectProjectModule}
          onNavigate={(target) => {
            navigate(target);
            requestAnimationFrame(() =>
              document
                .getElementById("main-content")
                ?.focus({ preventScroll: true }),
            );
          }}
          onLogout={async () => {
            if (switching) return;
            if (pending) {
              setNotice(
                "יש שינויים שטרם נשמרו. יש להמתין לשמירה או להוריד גיבוי.",
              );
              return;
            }
            setSwitching(true);
            try {
              await signOut();
            } catch {
              setNotice("היציאה נכשלה. נסה שוב.");
              return;
            } finally {
              setSwitching(false);
            }
            try {
              sessionStorage.removeItem(navigationKey);
            } catch {
              /* Optional browser storage. */
            }
            setWorker(null);
            setPage("dashboard");
            setProjectId("");
            setOpenIds([]);
            setNotice("");
            window.scrollTo({ top: 0 });
          }}
        />
        <main id="main-content" tabIndex={-1} inert={switching}>
          <div className="content-wrap">
            {import.meta.env.DEV && (
              <details className="development-view">
                <summary>תצוגת פיתוח</summary>
                <div className="development-view-panel">
                  <span role="status">
                    {pending || saving
                      ? "יש שינויים שממתינים לשמירה"
                      : cloudEnabled
                        ? "מחובר לשרת"
                        : "מצב מקומי · נשמר בדפדפן בלבד"}
                  </span>
                  <button onClick={downloadBackup}>הורדת גיבוי</button>
                </div>
              </details>
            )}
            {error && (
              <div className="notice" role="alert">
                <span>{error}</span>
                <button onClick={retry}>ניסיון שמירה נוסף</button>
                <button onClick={downloadBackup}>הורדת גיבוי</button>
              </div>
            )}
            {notice && (
              <div className="notice" role="status">
                <Icon name="check" size={18} />
                {notice}
                <button aria-label="סגירת הודעה" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}
            <div
              className="screen-motion"
              key={`${page}/${page === "project" ? projectId : ""}`}
            >
              {supervisor &&
                (page === "dashboard" ||
                  page === "car" ||
                  page === "personal" ||
                  page === "office" ||
                  page === "clients") && (
                  <AdminOverview
                    key={page}
                    section={page}
                    onProject={(owner, id) => void openAdminProject(owner, id)}
                  />
                )}
              {!supervisor && page === "dashboard" && (
                <Dashboard
                  data={userData}
                  workerName={
                    data.workers.find((person) => person.id === currentWorkerId)
                      ?.name ?? worker.name
                  }
                  onOpen={openProject}
                  onNavigate={navigate}
                />
              )}{" "}
              {page === "project" && (
                <ProjectWorkspace
                  key={projectId}
                  data={userData}
                  projectId={projectId}
                  workerName={worker.name}
                  isAdmin={supervisor}
                  openIds={openIds}
                  module={module}
                  onModule={selectProjectModule}
                  onOpen={openProject}
                  onProjectSave={saveProject}
                  onOfficeSave={saveOffice}
                  onCostsSave={(costs) => {
                    if (
                      !costs.length ||
                      !assignedIds.includes(costs[0].project_id) ||
                      costs.some(
                        (cost) => cost.project_id !== costs[0].project_id,
                      )
                    )
                      return;
                    setData((d) => ({
                      ...d,
                      project_costs: [
                        ...d.project_costs.filter(
                          (cost) => cost.project_id !== costs[0].project_id,
                        ),
                        ...costs,
                      ],
                    }));
                    notify("עלויות הפרויקט עודכנו");
                  }}
                  onTaskSave={(t) => {
                    if (!assignedIds.includes(t.project_id)) return;
                    setData((d) => ({
                      ...d,
                      requirements_tasks: d.requirements_tasks.some(
                        (v) => v.id === t.id,
                      )
                        ? d.requirements_tasks.map((v) =>
                            v.id === t.id ? t : v,
                          )
                        : [...d.requirements_tasks, t],
                    }));
                    notify();
                  }}
                  onProtocolSave={(p) => {
                    if (!assignedIds.includes(p.project_id)) return;
                    setData((d) => ({ ...d, protocols: [...d.protocols, p] }));
                    notify("הפרוטוקול נשמר");
                  }}
                />
              )}{" "}
              {page === "billing" && <OfficeBilling />}
              {page === "contacts" && <OfficeContacts />}
              {page === "tasks" && <OrganizationTasks admin={supervisor} />}
              {!supervisor && page === "office" && (
                <OfficeProjectStatus
                  data={userData}
                  onSave={saveOffice}
                  onOpen={openProject}
                />
              )}{" "}
              {!supervisor && page === "car" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">דיווחים אישיים</span>
                      <h1>דיווח רכב</h1>
                      <p className="muted">
                        ריכוז הנסיעות והדיווחים החודשיים שלך.
                      </p>
                    </div>
                  </div>
                  <CarReport
                    data={userData}
                    workerId={currentWorkerId}
                    onSave={(entry) => {
                      setData((d) => ({
                        ...d,
                        mileage_entries: [...d.mileage_entries, entry],
                      }));
                      notify("דיווח הרכב נשמר");
                    }}
                  />
                </>
              )}{" "}
              {!supervisor && page === "personal" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">סביבת העבודה שלי</span>
                      <h1>אישי</h1>
                      <p className="muted">
                        חופשות, מחלה ומעקב אחר הבקשות שלך.
                      </p>
                    </div>
                  </div>
                  <Personal
                    requests={userData.leave_requests}
                    workerId={currentWorkerId}
                    onRefresh={
                      cloudEnabled
                        ? async () => {
                            if (pending || switching) {
                              setNotice(
                                "יש להמתין לסיום השמירה לפני רענון הבקשות.",
                              );
                              return;
                            }
                            setSwitching(true);
                            try {
                              const workspace = await fetchWorkspace();
                              initialize(workspace.data, workspace.revision);
                              setNotice("");
                            } catch {
                              setNotice("רענון הבקשות נכשל.");
                            } finally {
                              setSwitching(false);
                            }
                          }
                        : undefined
                    }
                    onSave={async (request) => {
                      if (cloudEnabled) {
                        if (pending || switching) {
                          setNotice("יש להמתין לסיום השמירה לפני שליחת הבקשה.");
                          return false;
                        }
                        setSwitching(true);
                        try {
                          const workspace = await submitLeaveRequest(request);
                          initialize(workspace.data, workspace.revision);
                          setNotice("הבקשה נשלחה וממתינה לאישור");
                          return true;
                        } catch (reason) {
                          setNotice(
                            reason instanceof Error
                              ? reason.message
                              : "שליחת הבקשה נכשלה.",
                          );
                          return false;
                        } finally {
                          setSwitching(false);
                        }
                      }
                      setData((d) => ({
                        ...d,
                        leave_requests: [...d.leave_requests, request],
                      }));
                      notify("הבקשה נשלחה וממתינה לאישור");
                      return true;
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </main>
        <footer className="app-footer">
          <span>RassulyAI</span>
          <span>ניהול פרויקטים · רסולי הנדסה</span>
        </footer>
      </div>
    </div>
  );
}
