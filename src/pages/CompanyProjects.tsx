import { useEffect, useState } from "react";
import { Badge, Empty, Field, Modal, Table } from "../components/ui";
import {
  listCloudProjects,
  type CompanyProject,
} from "../data/companyProjects";

export default function CompanyProjects({
  localProjects,
  workerId,
  workerName,
  onHome,
  onOpen,
  onPull,
  canOpenOtherProjects,
}: {
  localProjects?: CompanyProject[];
  workerId: string;
  workerName: string;
  onHome: () => void;
  onOpen: (project: CompanyProject) => void;
  onPull: (project: CompanyProject) => Promise<void>;
  canOpenOtherProjects: boolean;
}) {
  const [remoteProjects, setRemoteProjects] = useState<CompanyProject[]>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<CompanyProject>();
  const [busy, setBusy] = useState(false);
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [manager, setManager] = useState("");
  const [query, setQuery] = useState("");
  const isLocal = localProjects !== undefined;
  useEffect(() => {
    if (isLocal) return;
    let active = true;
    listCloudProjects()
      .then((projects) => {
        if (active) setRemoteProjects(projects);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [isLocal, reload]);
  const projects = localProjects ?? remoteProjects;
  const filters = [
    { title: "מזמין", value: client, setValue: setClient, key: "client" },
    { title: "סטטוס", value: status, setValue: setStatus, key: "status" },
    {
      title: "מנהל / אחראי נוכחי",
      value: manager,
      setValue: setManager,
      key: "owner_name",
    },
  ] as const;
  const search = query.trim().toLowerCase();
  const visible = projects?.filter(
    (project) =>
      filters.every(({ key, value }) => !value || project[key] === value) &&
      [project.name, project.owner_name, project.client].some((value) =>
        value.toLowerCase().includes(search),
      ),
  );
  async function confirmPull(project: CompanyProject) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onPull(project);
      setRemoteProjects((items) =>
        items?.map((item) =>
          item.id === project.id
            ? {
                ...item,
                owner_id: workerId,
                owner_name: workerName,
                transferred_from: project.owner_name,
              }
            : item,
        ),
      );
      setSelected(undefined);
      setReload((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "העברת הפרויקט נכשלה.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>כלל הפרויקטים בחברה</h1>
        <div className="inline-actions">
          <button type="button" onClick={onHome}>
            הפרויקטים שלי
          </button>
          {!isLocal && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setReload((value) => value + 1);
              }}
            >
              רענון
            </button>
          )}
        </div>
      </div>
      {error && !selected && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!projects && !error && <p role="status">טוען פרויקטים…</p>}
      {projects && (
        <section className="panel">
          <div className="billing-filters">
            <Field label="חיפוש פרויקטים">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field>
            {filters.map(({ title, value, setValue, key }) => (
              <Field key={key} label={title}>
                <select
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                >
                  <option value="">הכול</option>
                  {[
                    ...new Set(
                      projects.map((project) => project[key]).filter(Boolean),
                    ),
                  ]
                    .sort((a, b) => a.localeCompare(b, "he"))
                    .map((option) => (
                      <option value={option} key={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </Field>
            ))}
          </div>
          {visible?.length ? (
            <Table
              caption="פרויקטים בחברה"
              headers={[
                "פרויקט",
                "מזמין",
                "סטטוס",
                "מנהל / אחראי נוכחי",
                "פעולה",
              ]}
            >
              {visible.map((project) => (
                <tr key={project.id}>
                  <th scope="row">{project.name}</th>
                  <td>{project.client || "לא צוין"}</td>
                  <td>
                    <Badge>{project.status}</Badge>
                  </td>
                  <td>
                    {project.owner_name}
                    {project.transferred_from && (
                      <div className="muted">
                        הועבר מ{project.transferred_from}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="inline-actions">
                      {(project.owner_id === workerId ||
                        canOpenOtherProjects) && (
                        <button type="button" onClick={() => onOpen(project)}>
                          פתיחת פרויקט
                        </button>
                      )}
                      {project.owner_id !== workerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setSelected(project);
                          }}
                        >
                          משוך פרויקט אליי
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="אין פרויקטים שתואמים לסינון." />
          )}
        </section>
      )}
      {selected && (
        <Modal
          title="העברת פרויקט לטיפולך"
          onClose={() => {
            if (!busy) {
              setSelected(undefined);
              setError("");
            }
          }}
        >
          <p>
            האם להעביר את <strong>{selected.name}</strong> מאחריות{" "}
            {selected.owner_name} לטיפולך?
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => void confirmPull(selected)}
            >
              {busy ? "מעביר…" : "אישור העברה"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSelected(undefined);
                setError("");
              }}
            >
              ביטול
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
