import type { Worker } from "../../types";
import { Icon } from "./index";
import CompanyBrand from "./CompanyBrand";

import TwoLevelNavigation from "./TwoLevelNavigation";
import type { ProjectDestination } from "../../data/navigation";

export default function AppHeader({
  worker,
  page,
  module,
  onProjectNavigate,
  title,
  onNavigate,
  onLogout,
}: {
  worker: Worker;
  page: string;
  module: string;
  onProjectNavigate: (module: ProjectDestination) => void;
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
      <TwoLevelNavigation
        admin={admin}
        page={page}
        module={module}
        onNavigate={onNavigate}
        onProjectNavigate={onProjectNavigate}
      />
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
