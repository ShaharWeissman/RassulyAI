import { useEffect, useState } from "react";
import { Badge, Field, Icon, Modal, Table } from "../components/ui";
import {
  downloadBillingDocument,
  invoiceStatuses,
  readBilling,
  uploadBillingDocument,
  writeBilling,
  type BillingData,
  type BillingInvoice,
  type BillingProject,
} from "../data/officeBilling";
import { downloadExcel, workbookBytes } from "../utils/excel";
import "../styles/billing.css";
import FileSkillAction from "../components/ui/FileSkillAction";

const steps = [
  "טרם נפתחה תחזית",
  "פתוח לסימון עובדים",
  "ממתינה לאישור וסינון",
  "שוחררה לעובדים",
];
const stepNotes = [
  "התחזיות סגורות",
  "עובדים יכולים לסמן תחזית",
  "המנהל מכריע בתחזיות",
  "התוצאות זמינות לפי הרשאה",
];
const stepIcons = ["calendar", "edit", "status", "check"];
const auditLabels: Record<string, string> = {
  step: "מעבר תחנה",
  forecast: "עדכון תחזית",
  review: "החלטת מנהל",
  invoice: "עדכון חשבון",
  document: "העלאת גרסה",
  visibility: "עדכון הרשאות צפייה",
};
const monthText = (month: string) =>
  new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month));
const currency = (amount: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(
    amount,
  );
const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).formatToParts();
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-01`;
};
const shiftMonth = (month: string, back: number) => {
  const date = new Date(month);
  date.setUTCMonth(date.getUTCMonth() - back);
  return date.toISOString().slice(0, 10);
};
const forecastLabel = (forecast?: BillingData["forecasts"][number]) =>
  forecast
    ? `${forecast.expected ? "כן" : "לא"}${forecast.decision === "approved" ? " · אושרה" : forecast.decision === "excluded" ? " · הוחרגה" : ""}`
    : "טרם עודכן";

export default function OfficeBilling() {
  const [month, setMonth] = useState(currentMonth);
  const [history, setHistory] = useState(3);
  const [result, setResult] = useState<{
    month: string;
    history: number;
    data: BillingData;
  }>();
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manager, setManager] = useState("");
  const [client, setClient] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "manager" | "client">("name");
  const [ascending, setAscending] = useState(true);
  const [transition, setTransition] = useState<number>();
  const [record, setRecord] = useState<{
    project: BillingProject;
    month: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    readBilling(month, history)
      .then((data) => {
        if (!cancelled) setResult({ month, history, data });
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [month, history, reload]);

  const data =
    result?.month === month && result.history === history
      ? result.data
      : undefined;
  const cycle = data?.cycles.find((c) => c.month === month);
  const step = cycle?.step ?? 1;
  const admin = data?.admin === true;
  const canForecast = data?.current_month === month && step === 2;
  const invoiceFor = (id: string, period = month) =>
    data?.invoices.find((i) => i.project_id === id && i.month === period);
  const forecastFor = (id: string, period = month) =>
    data?.forecasts.find((f) => f.project_id === id && f.month === period);
  const projects = (data?.projects ?? [])
    .filter(
      (p) =>
        (admin ||
          p.active ||
          data?.invoices.some((i) => i.project_id === p.id) ||
          data?.forecasts.some((f) => f.project_id === p.id)) &&
        (!manager || manager === p.owner_id) &&
        (!client || client === p.client) &&
        (!projectFilter || projectFilter === p.id) &&
        (!status || status === (invoiceFor(p.id)?.status ?? "draft")) &&
        [p.name, p.client, p.manager].some((v) =>
          v?.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (a[sort] ?? "").localeCompare(b[sort] ?? "", "he"),
    );
  const periods = Array.from({ length: history + 1 }, (_, index) =>
    shiftMonth(month, index),
  );
  const monthly = projects.flatMap((p) => invoiceFor(p.id) ?? []);
  const forecasts = projects.flatMap((p) => forecastFor(p.id) ?? []);
  const missingWorkers = new Set(
    projects
      .filter((p) => p.active && !forecastFor(p.id))
      .map((p) => p.owner_id),
  ).size;
  const amountsVisible =
    admin ||
    (cycle?.step === 4 &&
      cycle.employee_amounts &&
      (data?.current_month === month || cycle.employee_history));

  async function run(action: () => Promise<void>, refresh = true) {
    setError("");
    setBusy(true);
    try {
      await action();
      if (refresh)
        setResult({ month, history, data: await readBilling(month, history) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "הפעולה נכשלה.");
    } finally {
      setBusy(false);
    }
  }
  const act = (
    action: string,
    project: string | null,
    input: object,
    period = month,
  ) => run(() => writeBilling(action, period, project, input));
  const updateSort = (column: typeof sort) => {
    setAscending(sort === column ? !ascending : true);
    setSort(column);
  };
  const exportReport = () => {
    const header = [
      "פרויקט",
      "מזמין",
      "מנהל פרויקט",
      "חודש",
      "תחזית",
      "סטטוס",
      ...(admin ? ["הוגש ₪", "אושר ₪", "תאריך הגשה", "תאריך אישור"] : []),
    ];
    const rows = projects.flatMap((p) =>
      periods.flatMap((period) => {
        const i = invoiceFor(p.id, period);
        const f = forecastFor(p.id, period);
        if (period !== month && !i && !f) return [];
        return [
          [
            p.name,
            p.client,
            p.manager,
            monthText(period),
            forecastLabel(f),
            i ? invoiceStatuses[i.status] : "—",
            ...(admin
              ? [
                  i?.submitted_amount ?? null,
                  i?.approved_amount ?? null,
                  i?.submitted_on ?? "",
                  i?.approved_on ?? "",
                ]
              : []),
          ],
        ];
      }),
    );
    downloadExcel(
      workbookBytes([
        {
          name: "חשבונות משרדיים",
          headerRow: 1,
          widths: [34, 24, 22, 18, 19, 20, 15, 15, 16, 16],
          rows: [header, ...rows].map((row) => row.map((value) => ({ value }))),
        },
      ]),
      `office-billing-${month.slice(0, 7)}.xlsx`,
    );
  };

  return (
    <div className="office-billing">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ניהול החברה</span>
          <h1>מעקב חשבונות משרדיים</h1>
          <p className="muted">
            תחזיות, הגשות והיסטוריית חשבונות מול מזמיני העבודה.
          </p>
        </div>
        <Field label="חודש חיוב">
          <input
            type="month"
            value={month.slice(0, 7)}
            disabled={busy}
            onChange={(e) => {
              if (!e.target.value) return;
              setError("");
              setMonth(`${e.target.value}-01`);
            }}
          />
        </Field>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              setReload((n) => n + 1);
            }}
          >
            רענון
          </button>
        </p>
      )}
      {!data && !error && <p role="status">טוען נתוני חשבונות…</p>}
      {data && (
        <>
          <div className="billing-kpis">
            {[
              ["פרויקטים פעילים", projects.filter((p) => p.active).length],
              ["תחזיות שהתקבלו", forecasts.length],
              ...(admin ? [["עובדים שטרם השלימו", missingWorkers]] : []),
              [
                "חשבונות שהוגשו",
                monthly.filter((i) => i.status !== "draft").length,
              ],
              [
                "ממתינים לאישור",
                monthly.filter((i) =>
                  ["submitted", "pending"].includes(i.status),
                ).length,
              ],
              [
                "אושרו",
                monthly.filter((i) =>
                  ["approved", "partial"].includes(i.status),
                ).length,
              ],
              ...(amountsVisible
                ? [
                    [
                      "סה״כ הוגש",
                      currency(
                        monthly.reduce(
                          (n, i) => n + (i.submitted_amount ?? 0),
                          0,
                        ),
                      ),
                    ],
                    [
                      "סה״כ אושר",
                      currency(
                        monthly.reduce(
                          (n, i) => n + (i.approved_amount ?? 0),
                          0,
                        ),
                      ),
                    ],
                  ]
                : []),
            ].map(([label, value]) => (
              <div className="panel padded" key={label}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <section className="panel padded billing-workflow">
            <h2>מחזור {monthText(month)}</h2>
            <ol className="billing-steps" aria-label="תחנות התהליך">
              {steps.map((title, index) => (
                <li
                  key={title}
                  className={
                    index + 1 < step
                      ? "complete"
                      : index + 1 === step
                        ? "current"
                        : ""
                  }
                  aria-current={index + 1 === step ? "step" : undefined}
                >
                  <span className="billing-step-icon">
                    <Icon
                      name={index + 1 < step ? "check" : stepIcons[index]}
                      size={17}
                    />
                  </span>
                  <strong>
                    {index + 1}. {title}
                  </strong>
                  <small>{stepNotes[index]}</small>
                </li>
              ))}
            </ol>
            {!admin && step < 4 && (
              <p className="muted">
                רק מנהל מערכת יכול לקדם את מחזור החשבונות לשלב הבא.
              </p>
            )}
            {admin && (
              <div className="billing-actions">
                {step < 4 && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => setTransition(step + 1)}
                  >
                    {["פתיחת תחזית", "סגירה לסינון", "שחרור לעובדים"][step - 1]}
                  </button>
                )}
                {step > 1 && step < 4 && (
                  <button
                    disabled={busy}
                    onClick={() => setTransition(step - 1)}
                  >
                    חזרה לתחנה הקודמת
                  </button>
                )}
                <label>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={cycle?.employee_history ?? false}
                    onChange={(e) =>
                      void act("visibility", null, {
                        history: e.target.checked,
                        amounts: cycle?.employee_amounts ?? false,
                      })
                    }
                  />{" "}
                  חשיפת היסטוריה לעובדים
                </label>
                <label>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={cycle?.employee_amounts ?? false}
                    onChange={(e) =>
                      void act("visibility", null, {
                        history: cycle?.employee_history ?? false,
                        amounts: e.target.checked,
                      })
                    }
                  />{" "}
                  חשיפת סכומים לאחר שחרור
                </label>
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>חשבונות לפי פרויקט</h2>
              <div className="billing-actions">
                <button
                  onClick={() => {
                    setError("");
                    setReload((n) => n + 1);
                  }}
                >
                  רענון
                </button>
                <button onClick={exportReport}>ייצוא Excel</button>
                <FileSkillAction context="חשבונות משרדיים" />
                <button onClick={() => window.print()}>הדפסה / PDF</button>
              </div>
            </div>
            <div className="billing-filters">
              <Field label="חיפוש">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Field>
              {admin && (
                <Field label="מנהל פרויקט">
                  <select
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                  >
                    <option value="">כולם</option>
                    {Array.from(
                      new Map(
                        data.projects.map((p) => [p.owner_id, p.manager]),
                      ),
                    ).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="מזמין">
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                >
                  <option value="">כולם</option>
                  {Array.from(
                    new Set(data.projects.map((p) => p.client).filter(Boolean)),
                  )
                    .sort()
                    .map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                </select>
              </Field>
              <Field label="פרויקט">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="">כולם</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="סטטוס חשבון">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">הכול</option>
                  {Object.entries(invoiceStatuses).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="חודשים בתצוגה">
                <select
                  value={history}
                  disabled={busy}
                  onChange={(e) => {
                    setError("");
                    setHistory(Number(e.target.value));
                  }}
                >
                  <option value={3}>4 חודשים</option>
                  <option value={11}>12 חודשים</option>
                  <option value={23}>24 חודשים</option>
                </select>
              </Field>
              <Field label="מיון">
                <select
                  value={sort}
                  onChange={(e) => updateSort(e.target.value as typeof sort)}
                >
                  <option value="name">פרויקט</option>
                  <option value="client">מזמין</option>
                  <option value="manager">מנהל</option>
                </select>
              </Field>
              <button onClick={() => setAscending((value) => !value)}>
                {ascending ? "סדר עולה ↑" : "סדר יורד ↓"}
              </button>
            </div>
            <Table
              caption="חשבונות משרדיים לפי חודש ופרויקט"
              headers={[
                "פרויקט",
                "מזמין",
                "מנהל",
                "תחזית",
                ...periods.map(monthText),
              ]}
            >
              {projects.map((p) => {
                const f = forecastFor(p.id);
                return (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    <td>{p.client || "—"}</td>
                    <td>{p.manager || "—"}</td>
                    <td>
                      {canForecast &&
                      p.active &&
                      (!admin || p.owner_id === "admin") ? (
                        <select
                          aria-label={`תחזית — ${p.name}`}
                          disabled={busy}
                          value={f ? String(f.expected) : ""}
                          onChange={(e) =>
                            void act("forecast", p.id, {
                              expected: e.target.value === "true",
                            })
                          }
                        >
                          <option value="" disabled>
                            טרם עודכן
                          </option>
                          <option value="true">כן</option>
                          <option value="false">לא</option>
                        </select>
                      ) : (
                        <span>{forecastLabel(f)}</span>
                      )}
                      {admin && step === 3 && f && (
                        <select
                          aria-label={`החלטה — ${p.name}`}
                          disabled={busy}
                          value={f.decision ?? ""}
                          onChange={(e) =>
                            void act("review", p.id, {
                              decision: e.target.value,
                            })
                          }
                        >
                          <option value="" disabled>
                            להכרעה
                          </option>
                          <option value="approved">אישור</option>
                          <option value="excluded">החרגה</option>
                        </select>
                      )}
                    </td>
                    {periods.map((period) => {
                      const i = invoiceFor(p.id, period);
                      return (
                        <td key={period}>
                          {admin || i ? (
                            <button
                              className="billing-cell"
                              disabled={busy}
                              onClick={() => {
                                setError("");
                                setRecord({ project: p, month: period });
                              }}
                            >
                              <Badge>
                                {i
                                  ? invoiceStatuses[i.status]
                                  : period === month
                                    ? "טרם הוגש"
                                    : "—"}
                              </Badge>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Table>
            {!projects.length && (
              <p className="billing-empty">אין פרויקטים התואמים למסננים.</p>
            )}
          </section>
          {admin && (
            <section className="panel padded billing-audit">
              <h2>היסטוריית המחזור</h2>
              <AuditList
                entries={data.audit.filter(
                  (a) => a.month === month && a.project_id === null,
                )}
              />
            </section>
          )}
          {admin && transition !== undefined && (
            <Modal
              title="אישור מעבר תחנה"
              onClose={() => !busy && setTransition(undefined)}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(
                    new FormData(e.currentTarget).get("reason") ?? "",
                  );
                  void run(async () => {
                    await writeBilling("step", month, null, {
                      step: transition,
                      previous: step,
                      reason,
                    });
                    setTransition(undefined);
                  });
                }}
              >
                <p>התחנה הנוכחית: {steps[step - 1]}</p>
                <p>התחנה המבוקשת: {steps[transition - 1]}</p>
                <p>
                  {stepNotes[transition - 1]}.{" "}
                  {transition === 2
                    ? "ניתן לשנות תחזיות בחודש הנוכחי."
                    : "לא ניתן לסמן או לשנות תחזיות עובדים."}
                </p>
                {transition < step && (
                  <Field label="סיבת החזרה">
                    <textarea name="reason" required maxLength={1000} />
                  </Field>
                )}
                {error && <p role="alert">{error}</p>}
                <div className="billing-actions">
                  <button className="primary" disabled={busy}>
                    אישור מעבר
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setTransition(undefined)}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </Modal>
          )}
          {record && (
            <InvoiceCard
              key={`${record.project.id}/${record.month}`}
              project={record.project}
              month={record.month}
              invoice={invoiceFor(record.project.id, record.month)}
              data={data}
              busy={busy}
              error={error}
              onClose={() => {
                if (!busy) {
                  setRecord(undefined);
                  setError("");
                }
              }}
              run={run}
            />
          )}
        </>
      )}
    </div>
  );
}

function AuditList({ entries }: { entries: BillingData["audit"] }) {
  if (!entries.length) return <p className="muted">טרם נרשמו פעולות.</p>;
  return (
    <ul className="billing-audit-list">
      {entries.map((event) => (
        <li key={event.id}>
          <strong>{auditLabels[event.action] ?? event.action}</strong> ·{" "}
          {new Date(event.created_at).toLocaleString("he-IL")}
          {event.details?.to && (
            <span>
              {" "}
              · {steps[(event.details.from ?? 1) - 1]} ←{" "}
              {steps[event.details.to - 1]}
            </span>
          )}
          {event.details?.reason && <span> · {event.details.reason}</span>}
          {event.details?.name && <span> · {event.details.name}</span>}
          {event.actor && (
            <small className="muted"> מזהה מבצע: {event.actor}</small>
          )}
        </li>
      ))}
    </ul>
  );
}

function InvoiceCard({
  project,
  month,
  invoice,
  data,
  busy,
  error,
  onClose,
  run,
}: {
  project: BillingProject;
  month: string;
  invoice?: BillingInvoice;
  data: BillingData;
  busy: boolean;
  error: string;
  onClose: () => void;
  run: (action: () => Promise<void>, refresh?: boolean) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [pendingFile, setPendingFile] = useState<{
    path: string;
    name: string;
  }>();
  const documents = data.documents.filter((d) => d.invoice_id === invoice?.id);
  return (
    <Modal
      title={`${project.name} · ${monthText(month)}`}
      onClose={() => {
        if (
          !pendingFile ||
          window.confirm("הקובץ הועלה אך עדיין לא שויך. לסגור את הכרטסת?")
        )
          onClose();
      }}
    >
      <p className="muted">
        {[project.client, project.manager].filter(Boolean).join(" · ")}
      </p>
      {data.admin ? (
        <>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const fields = new FormData(e.currentTarget);
              const amount = (key: string) =>
                fields.get(key) === "" ? null : Number(fields.get(key));
              void run(() =>
                writeBilling("invoice", month, project.id, {
                  revision: invoice?.revision ?? 0,
                  status: fields.get("status"),
                  number: fields.get("number"),
                  submitted_amount: amount("submitted_amount"),
                  approved_amount: amount("approved_amount"),
                  submitted_on: fields.get("submitted_on") || null,
                  approved_on: fields.get("approved_on") || null,
                  notes: fields.get("notes"),
                }),
              );
            }}
          >
            <Field label="סטטוס">
              <select name="status" defaultValue={invoice?.status ?? "draft"}>
                {Object.entries(invoiceStatuses).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="מספר חשבון">
              <input
                name="number"
                maxLength={100}
                defaultValue={invoice?.number}
              />
            </Field>
            <Field label="סכום שהוגש (₪)">
              <input
                name="submitted_amount"
                type="number"
                min="0"
                max="999999999999.99"
                step="0.01"
                defaultValue={invoice?.submitted_amount ?? ""}
              />
            </Field>
            <Field label="סכום שאושר (₪)">
              <input
                name="approved_amount"
                type="number"
                min="0"
                max="999999999999.99"
                step="0.01"
                defaultValue={invoice?.approved_amount ?? ""}
              />
            </Field>
            <Field label="תאריך הגשה">
              <input
                name="submitted_on"
                type="date"
                defaultValue={invoice?.submitted_on ?? ""}
              />
            </Field>
            <Field label="תאריך אישור">
              <input
                name="approved_on"
                type="date"
                defaultValue={invoice?.approved_on ?? ""}
              />
            </Field>
            <Field label="הערות">
              <textarea
                name="notes"
                maxLength={5000}
                defaultValue={invoice?.notes}
              />
            </Field>
            <div className="billing-actions">
              <button className="primary" disabled={busy}>
                שמירת חשבון
              </button>
            </div>
          </form>
          <section className="billing-documents">
            <h3>קבצים וגרסאות</h3>
            {!invoice?.id ? (
              <p className="muted">שמור את החשבון לפני העלאת קובץ.</p>
            ) : (
              <>
                <Field label="קובץ PDF או XLSX (עד 10 מגה)">
                  <input
                    type="file"
                    accept=".pdf,.xlsx"
                    disabled={busy || !!pendingFile}
                    onChange={(e) => setFile(e.target.files?.[0])}
                  />
                </Field>
                <button
                  disabled={busy || (!file && !pendingFile)}
                  onClick={() =>
                    void run(async () => {
                      if (!invoice.id) return;
                      const attachment =
                        pendingFile ??
                        (file &&
                          (await uploadBillingDocument(invoice.id, file)));
                      if (!attachment) return;
                      setPendingFile(attachment);
                      await writeBilling(
                        "document",
                        month,
                        project.id,
                        attachment,
                      );
                      setPendingFile(undefined);
                      setFile(undefined);
                    })
                  }
                >
                  {pendingFile ? "נסה לשייך את הקובץ שוב" : "העלאת חשבון"}
                </button>
                <ul className="billing-audit-list">
                  {documents.map((d) => (
                    <li key={d.id}>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(() => downloadBillingDocument(d), false)
                        }
                      >
                        {d.original_name}
                      </button>
                      <span>
                        {" "}
                        · {new Date(d.uploaded_at).toLocaleString("he-IL")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="billing-audit">
            <h3>היסטוריית פעולות</h3>
            <AuditList
              entries={data.audit.filter(
                (a) => a.project_id === project.id && a.month === month,
              )}
            />
          </section>
        </>
      ) : (
        <>
          <p>
            <Badge>
              {invoice ? invoiceStatuses[invoice.status] : "טרם הוגש"}
            </Badge>
          </p>
          {invoice?.submitted_amount != null && (
            <p>הוגש: {currency(invoice.submitted_amount)}</p>
          )}
          {invoice?.approved_amount != null && (
            <p>אושר: {currency(invoice.approved_amount)}</p>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}
