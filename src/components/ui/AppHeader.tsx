import type { Worker } from "../../types";
import { Icon } from "./index";
import CompanyBrand from "./CompanyBrand";

const links = [
  { id: "dashboard", label: "פרויקטים", icon: "building" },
  { id: "clients", label: "לקוחות", icon: "building" },
  { id: "tasks", label: "משימות", icon: "status" },
  { id: "office", label: "סטטוס משרדית", icon: "status" },
  { id: "billing", label: "מעקב חשבונות", icon: "file" },
  { id: "car", label: "דיווח רכב", icon: "car" },
  { id: "personal", label: "אישי · חופשה / מחלה", icon: "user" },
];

export default function AppHeader({
  worker,
  page,
  title,
  onNavigate,
  onLogout,
}: {
  worker: Worker;
  page: string;
  title?: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  const admin = worker.id === "admin";
  const initials = worker.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <header className="reference-topbar">
      <div className="header-context">
        <button className="home-button" onClick={() => onNavigate("dashboard")}>
          {admin ? "תצוגת מנהל ראשית" : "תצוגה אישית ראשית"}{" "}
          <Icon name="arrow" size={16} />
        </button>
        <span className="header-divider" />
        <span className="header-current">
          <small>
            {page === "project"
              ? "פרויקטים"
              : admin
                ? "ניהול החברה"
                : "סביבת העבודה שלי"}
          </small>
          <span>/</span>
          <strong>{title}</strong>
        </span>
      </div>
      <nav className="header-navigation" aria-label="ניווט ראשי">
        {links
          .filter((link) => admin || link.id !== "clients")
          .map((link) => (
            <button
              key={link.id}
              className={
                page === link.id ||
                (page === "project" && link.id === "dashboard")
                  ? "active"
                  : ""
              }
              aria-current={
                page === link.id ||
                (page === "project" && link.id === "dashboard")
                  ? "page"
                  : undefined
              }
              onClick={() => onNavigate(link.id)}
            >
              <Icon name={link.icon} size={17} />
              {admin && link.id === "dashboard"
                ? "כלל הפרויקטים"
                : admin && link.id === "personal"
                  ? "דיווחי מחלה"
                  : admin && link.id === "car"
                    ? "דיווחי רכב"
                    : link.label}
            </button>
          ))}
      </nav>
      <div className="header-user">
        <span className="user-role">
          {admin ? "מנהל מערכת" : "מנהל פרויקט"}
        </span>
        <span className="avatar">{initials}</span>
        <div>
          <strong>{worker.name}</strong>
          <small dir="ltr">{worker.email}</small>
        </div>
        <button className="header-signout" onClick={onLogout}>
          יציאה
        </button>
      </div>
      <button
        className="brand-home"
        onClick={() => onNavigate("dashboard")}
        aria-label="חזרה למסך הראשי"
      >
        <CompanyBrand
          className="topbar-brand"
          symbolOnly={page !== "dashboard"}
        />
      </button>
      <button
        className="return-personal-dashboard"
        onClick={() => onNavigate("dashboard")}
      >
        <Icon name="grid" size={17} />
        {admin ? "לתצוגת המנהל הראשית" : "לתצוגה האישית הראשית"}
      </button>
    </header>
  );
}
