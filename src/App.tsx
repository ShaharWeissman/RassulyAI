import { useState } from "react";
import type {
  AppData,
  OfficeProjectStatus as OfficeStatus,
  Project,
} from "./types";
import { currentWorkerId, mockData } from "./data/mockData";
import { Icon } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import OfficeProjectStatus from "./pages/OfficeProjectStatus";
import CarReport from "./components/dashboard/CarReport";
import Personal from "./components/dashboard/Personal";
const navigation = [
  { id: "dashboard", title: "פרויקטים", icon: "grid" },
  { id: "car", title: "דיווח רכב", icon: "car" },
  { id: "personal", title: "אישי", icon: "user" },
  { id: "office", title: "סטטוס פרויקט משרדית", icon: "status" },
];
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<AppData>(mockData);
  const [page, setPage] = useState("dashboard");
  const [projectId, setProjectId] = useState("p1");
  const [openIds, setOpenIds] = useState<string[]>(["p1"]);
  const [module, setModule] = useState("data");
  const [notice, setNotice] = useState("");
  const notify = (message = "השינויים נשמרו בהצלחה") => setNotice(message);
  const navigate = (target: string) => {
    setPage(target);
    setNotice("");
  };
  const openProject = (id: string) => {
    setProjectId(id);
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setPage("project");
    setModule("data");
    setNotice("");
  };
  const saveOffice = (s: OfficeStatus) => {
    setData((d) => ({
      ...d,
      office_project_status: d.office_project_status.map((v) =>
        v.project_id === s.project_id ? s : v,
      ),
    }));
    notify("הסטטוס המשרדי עודכן בכל המסכים");
  };
  const saveProject = (p: Project) => {
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
  const assignedIds = data.project_assignments
    .filter((a) => a.worker_id === currentWorkerId)
    .map((a) => a.project_id);
  const userData = {
    ...data,
    projects: data.projects.filter((p) => assignedIds.includes(p.id)),
    requirements_tasks: data.requirements_tasks.filter((t) =>
      assignedIds.includes(t.project_id),
    ),
    office_project_status: data.office_project_status.filter((s) =>
      assignedIds.includes(s.project_id),
    ),
    mileage_entries: data.mileage_entries.filter(
      (m) => m.worker_id === currentWorkerId,
    ),
    leave_requests: data.leave_requests.filter(
      (l) => l.worker_id === currentWorkerId,
    ),
  };
  if (!loggedIn)
    return (
      <Login
        onLogin={() => {
          setLoggedIn(true);
          setPage("dashboard");
        }}
      />
    );
  const title =
    page === "project"
      ? data.projects.find((p) => p.id === projectId)!.name
      : navigation.find((n) => n.id === page)?.title;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        דלג לתוכן הראשי
      </a>
      <aside className="sidebar">
        <a
          className="wordmark"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
          dir="ltr"
        >
          <span className="logo-symbol">R</span>Rassuly<span>AI</span>
        </a>
        <div className="sidebar-label">סביבת עבודה</div>
        <nav aria-label="ניווט ראשי">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={
                page === n.id || (n.id === "dashboard" && page === "project")
                  ? "active"
                  : ""
              }
              onClick={() => navigate(n.id)}
              aria-current={
                page === n.id || (n.id === "dashboard" && page === "project")
                  ? "page"
                  : undefined
              }
            >
              <Icon name={n.icon} />
              <span>{n.title}</span>
              {n.id === "dashboard" && (
                <span className="nav-count">{userData.projects.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-summary">
            <span className="avatar">שו</span>
            <span>
              <strong>שחר וייסמן</strong>
              <small>מנהל פרויקטים</small>
            </span>
          </div>
          <button
            className="logout"
            onClick={() => {
              setLoggedIn(false);
              setNotice("");
            }}
          >
            <Icon name="logout" size={18} />
            יציאה מהמערכת
          </button>
          <div className="demo-tag">גרסת הדגמה · נתונים מקומיים</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>סביבת העבודה שלי</span>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-identity">
            <span className="system-indicator">
              <span className="dot" />
              רסולי הנדסה
            </span>
            <span className="avatar small">שו</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="content-wrap">
            {notice && (
              <div className="notice" role="status">
                <Icon name="check" size={18} />
                {notice}
                <button aria-label="סגירת הודעה" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}
            {page === "dashboard" && (
              <Dashboard
                data={userData}
                onOpen={openProject}
                onNavigate={navigate}
              />
            )}{" "}
            {page === "project" && (
              <ProjectWorkspace
                key={projectId}
                data={userData}
                projectId={projectId}
                openIds={openIds}
                module={module}
                onModule={(m) => {
                  setModule(m);
                  setNotice("");
                }}
                onOpen={openProject}
                onProjectSave={saveProject}
                onOfficeSave={saveOffice}
                onTaskSave={(t) => {
                  setData((d) => ({
                    ...d,
                    requirements_tasks: d.requirements_tasks.some(
                      (v) => v.id === t.id,
                    )
                      ? d.requirements_tasks.map((v) => (v.id === t.id ? t : v))
                      : [...d.requirements_tasks, t],
                  }));
                  notify();
                }}
                onProtocolSave={(p) => {
                  setData((d) => ({ ...d, protocols: [...d.protocols, p] }));
                  notify("הפרוטוקול נשמר");
                }}
              />
            )}{" "}
            {page === "office" && (
              <OfficeProjectStatus
                data={userData}
                onSave={saveOffice}
                onOpen={openProject}
              />
            )}{" "}
            {page === "car" && (
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
            {page === "personal" && (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">סביבת העבודה שלי</span>
                    <h1>אישי</h1>
                    <p className="muted">חופשות, מחלה ומעקב אחר הבקשות שלך.</p>
                  </div>
                </div>
                <Personal
                  requests={userData.leave_requests}
                  onSave={(request) => {
                    setData((d) => ({
                      ...d,
                      leave_requests: [...d.leave_requests, request],
                    }));
                    notify("הבקשה נשלחה וממתינה לאישור");
                  }}
                />
              </>
            )}
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
