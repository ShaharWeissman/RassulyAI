import type { AppData } from "../types";
import { Badge, Icon } from "../components/ui";
export default function Dashboard({
  data,
  onOpen,
  onNavigate,
}: {
  data: AppData;
  onOpen: (id: string) => void;
  onNavigate: (page: string) => void;
}) {
  const openTasks = data.requirements_tasks.filter((t) => t.status !== "הושלם");
  const attention = data.office_project_status.filter(
    (s) => s.condition !== "תקין",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">סביבת העבודה שלי</span>
          <h1>שלום, שחר</h1>
          <p className="muted">כל הפרויקטים והעדכונים שלך, במבט אחד.</p>
        </div>
        <span className="date-label">
          {new Intl.DateTimeFormat("he-IL", { dateStyle: "full" }).format(
            new Date(),
          )}
        </span>
      </div>
      <div className="metrics">
        <div>
          <span className="metric-icon">
            <Icon name="building" />
          </span>
          <span>
            <small>הפרויקטים שלי</small>
            <strong>{data.projects.length.toString().padStart(2, "0")}</strong>
          </span>
        </div>
        <div>
          <span className="metric-icon">
            <Icon name="status" />
          </span>
          <span>
            <small>משימות פתוחות</small>
            <strong>{openTasks.length.toString().padStart(2, "0")}</strong>
          </span>
        </div>
        <div>
          <span className="metric-icon">
            <Icon name="clock" />
          </span>
          <span>
            <small>דורשים תשומת לב</small>
            <strong>{attention.length.toString().padStart(2, "0")}</strong>
          </span>
        </div>
      </div>
      <section className="projects-section">
        <div className="section-heading">
          <div>
            <h2>
              הפרויקטים שלי{" "}
              <span className="count">{data.projects.length}</span>
            </h2>
            <p className="muted">בחירת פרויקט תפתח את סביבת העבודה שלו.</p>
          </div>
          <span className="subtle-label">משויך אליי</span>
        </div>
        <div className="project-grid">
          {data.projects.map((p) => {
            const office = data.office_project_status.find(
              (s) => s.project_id === p.id,
            )!;
            return (
              <button
                className="project-card"
                key={p.id}
                onClick={() => onOpen(p.id)}
              >
                <div className="card-top">
                  <span className="project-icon">
                    <Icon name="building" size={24} />
                  </span>
                  <Badge>{p.status}</Badge>
                </div>
                <span className="project-code" dir="ltr">
                  {p.code}
                </span>
                <h3>{p.name}</h3>
                <p className="muted">{p.client}</p>
                <div className="stage-row">
                  <span className="muted">שלב פרויקט</span>
                  <strong>{p.current_stage}</strong>
                </div>
                <div className="card-bottom">
                  <span
                    className={
                      office.condition === "תקין"
                        ? "condition-ok"
                        : "condition-warning"
                    }
                  >
                    <span className="dot" />
                    {office.condition}
                  </span>
                  <span className="open-project">
                    פתיחת פרויקט <Icon name="arrow" size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="section-heading">
        <div>
          <h2>עוד בסביבת העבודה</h2>
          <p className="muted">דיווחים אישיים ועדכוני משרד</p>
        </div>
      </section>
      <div className="shortcut-grid">
        {[
          {
            page: "car",
            icon: "car",
            title: "דיווח רכב",
            text: "עדכון קריאת קילומטרז׳ ודיווח חודשי",
          },
          {
            page: "personal",
            icon: "user",
            title: "אישי",
            text: "בקשות חופשה, מחלה ומעקב אישורים",
          },
          {
            page: "office",
            icon: "status",
            title: "סטטוס פרויקט משרדית",
            text: "תמונת מצב משרדית לכל הפרויקטים",
          },
        ].map((s) => (
          <button
            className="shortcut"
            key={s.page}
            onClick={() => onNavigate(s.page)}
          >
            <span className="shortcut-icon">
              <Icon name={s.icon} />
            </span>
            <span>
              <strong>{s.title}</strong>
              <small>{s.text}</small>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>
      <div className="dashboard-footer">
        <span className="dot" />
        נתוני הדגמה · סביבת עבודה מקומית
      </div>
    </>
  );
}
