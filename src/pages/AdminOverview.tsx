import { useEffect, useState } from "react";
import { Badge, Field, Table } from "../components/ui";
import { demoWorkers } from "../data/auth";
import { fetchWorkspace } from "../data/cloudWorkspace";
import type { AppData } from "../types";

export default function AdminOverview({
  section,
  onProject,
}: {
  section: "dashboard" | "car" | "personal";
  onProject: (owner: string, project: string) => void;
}) {
  const [workspaces, setWorkspaces] = useState<AppData[]>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [owner, setOwner] = useState("");
  const [client, setClient] = useState("");
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(
      demoWorkers
        .filter((w) => w.id !== "admin")
        .map((w) => fetchWorkspace(w.id, false)),
    )
      .then((result) => {
        if (active) setWorkspaces(result.map((w) => w.data));
      })
      .catch(() => {
        if (active) setError("טעינת סביבות העבודה נכשלה.");
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const managers = workspaces?.flatMap((w) => w.workers) ?? [];
  const matches = (...values: string[]) =>
    values.some((value) =>
      value.toLowerCase().includes(search.trim().toLowerCase()),
    );
  const scoped = (workspaces ?? []).filter(
    (w) => !owner || w.workers[0]?.id === owner,
  );
  const title =
    section === "dashboard"
      ? "כל הפרויקטים"
      : section === "car"
        ? "דיווחי רכב"
        : "דיווחי מחלה";
  const projects = scoped.flatMap((w) =>
    w.projects
      .filter(
        (p) =>
          (!client || p.client === client) &&
          (!status || p.status === status) &&
          matches(p.name, p.client, p.code),
      )
      .map((project) => ({ project, worker: w.workers[0] })),
  );
  const mileage = scoped
    .flatMap((w) =>
      w.mileage_entries.map((entry) => ({
        entry,
        worker: w.workers[0],
        vehicle:
          w.vehicles.find((v) => v.id === entry.vehicle_id)?.label ??
          entry.vehicle_id,
      })),
    )
    .filter(
      ({ entry, worker, vehicle }) =>
        (!period || entry.month.startsWith(period)) &&
        matches(worker.name, vehicle, entry.note),
    )
    .sort((a, b) => b.entry.month.localeCompare(a.entry.month));
  const sickness = scoped
    .flatMap((w) =>
      w.leave_requests
        .filter((entry) => entry.kind === "מחלה")
        .map((entry) => ({ entry, worker: w.workers[0] })),
    )
    .filter(
      ({ entry, worker }) =>
        (!period ||
          (entry.from_date.slice(0, 7) <= period &&
            entry.to_date.slice(0, 7) >= period)) &&
        (!status || entry.status === status) &&
        matches(worker.name, entry.status),
    )
    .sort((a, b) => b.entry.from_date.localeCompare(a.entry.from_date));
  const count =
    section === "dashboard"
      ? projects.length
      : section === "car"
        ? mileage.length
        : sickness.length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">תצוגת מנהל מערכת</span>
          <h1>{title}</h1>
          <p className="muted">נתונים מכל מנהלי הפרויקטים.</p>
        </div>
        <button
          onClick={() => {
            setError("");
            setReload((n) => n + 1);
          }}
        >
          רענון
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!workspaces && !error && <p role="status">טוען את נתוני המנהלים…</p>}
      {workspaces && (
        <section className="panel">
          <div className="billing-filters">
            <Field label="מנהל פרויקט">
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">כולם</option>
                {managers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="חיפוש">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            {section === "dashboard" ? (
              <Field label="מזמין עבודה">
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                >
                  <option value="">כולם</option>
                  {Array.from(
                    new Set(
                      workspaces
                        .flatMap((w) => w.projects.map((p) => p.client))
                        .filter(Boolean),
                    ),
                  )
                    .sort()
                    .map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                </select>
              </Field>
            ) : (
              <Field label="חודש">
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </Field>
            )}
            {section !== "car" && (
              <Field label="סטטוס">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">הכול</option>
                  {(section === "dashboard"
                    ? ["פעיל", "בהמתנה", "הושלם"]
                    : ["ממתין לאישור", "אושר"]
                  ).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {section === "dashboard" && (
            <Table
              caption={title}
              headers={[
                "פרויקט",
                "מזמין עבודה",
                "מנהל",
                "שלב",
                "סטטוס",
                "פעולה",
              ]}
            >
              {projects.map(({ project, worker }) => (
                <tr key={`${worker.id}/${project.id}`}>
                  <th scope="row">{project.name}</th>
                  <td>{project.client || "—"}</td>
                  <td>{worker.name}</td>
                  <td>{project.current_stage}</td>
                  <td>
                    <Badge>{project.status}</Badge>
                  </td>
                  <td>
                    <button onClick={() => onProject(worker.id, project.id)}>
                      פתיחת פרויקט
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          {section === "car" && (
            <Table
              caption={title}
              headers={["מנהל פרויקט", "רכב", "חודש", "קילומטרז׳", "הערות"]}
            >
              {mileage.map(({ entry, worker, vehicle }) => (
                <tr key={`${worker.id}/${entry.id}`}>
                  <td>{worker.name}</td>
                  <td>{vehicle}</td>
                  <td>{entry.month}</td>
                  <td>{entry.odometer.toLocaleString("he-IL")}</td>
                  <td>{entry.note || "—"}</td>
                </tr>
              ))}
            </Table>
          )}
          {section === "personal" && (
            <Table
              caption={title}
              headers={["מנהל פרויקט", "מתאריך", "עד תאריך", "סטטוס"]}
            >
              {sickness.map(({ entry, worker }) => (
                <tr key={`${worker.id}/${entry.id}`}>
                  <td>{worker.name}</td>
                  <td>{entry.from_date}</td>
                  <td>{entry.to_date}</td>
                  <td>
                    <Badge>{entry.status}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          {!count && (
            <p className="billing-empty">אין רשומות התואמות למסננים.</p>
          )}
        </section>
      )}
    </>
  );
}
