import type { Worker } from "../../types";
import { Icon } from "./index";

const links = [
  { id: "dashboard", label: "פרויקטים", icon: "building" },
  { id: "office", label: "סטטוס משרדית", icon: "status" },
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
  const initials = worker.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <header className="reference-topbar">
      <div className="header-context">
        <button className="home-button" onClick={() => onNavigate("dashboard")}>
          דשבורד ראשי <Icon name="arrow" size={16} />
        </button>
        <span className="header-divider" />
        <span className="header-current">
          <small>{page === "project" ? "פרויקטים" : "סביבת העבודה שלי"}</small>
          <span>/</span>
          <strong>{title}</strong>
        </span>
      </div>
      <nav className="header-navigation" aria-label="ניווט ראשי">
        {links.map((link) => (
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
            {link.label}
          </button>
        ))}
      </nav>
      <div className="header-user">
        <span className="user-role">מנהל פרויקט</span>
        <span className="avatar">{initials}</span>
        <div>
          <strong>{worker.name}</strong>
          <small dir="ltr">{worker.email}</small>
        </div>
        <button className="header-signout" onClick={onLogout}>
          יציאה
        </button>
      </div>
      <img
        className="topbar-brand"
        src="/rassuly-logo.png"
        alt="מנשה רסולי — הנדסה אזרחית בע״מ"
      />
    </header>
  );
}
