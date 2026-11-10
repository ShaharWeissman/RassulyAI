import { useState } from "react";
import type { CostVarianceItem, Project, ProjectCost } from "../../types";
import { Badge, Field, Modal, Table } from "../ui";
import CostPie from "./CostPie";
import CostVarianceTable from "./CostVarianceTable";
import CostVarianceItems from "./CostVarianceItems";
import FileSkillAction from "../ui/FileSkillAction";
import { costsWorkbook, downloadExcel } from "../../utils/excel";
const currency = (value: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
const numericFields = [
  { key: "contractual", label: "סכום חוזי" },
  { key: "approved", label: "סכום מאושר" },
  { key: "actual", label: "ביצוע בפועל" },
  { key: "exceptions", label: "חריגים" },
] as const;

export default function Costs({
  project,
  costs,
  sourceBudget,
  onSave,
  onVarianceSave,
}: {
  project: Project;
  costs: ProjectCost[];
  sourceBudget: number | null;
  onSave: (costs: ProjectCost[]) => void;
  onVarianceSave: (items: CostVarianceItem[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(costs);
  const [error, setError] = useState("");
  const [view, setView] = useState<"chapters" | "variance">("chapters");
  const [comparison, setComparison] = useState<"approved" | "actual">(
    "approved",
  );
  const sum = (key: "contractual" | "approved" | "actual" | "exceptions") =>
    costs.reduce((total, cost) => total + cost[key], 0);
  const hasDemo = costs.some((cost) => cost.data_source !== "manual");
  const update = (
    id: string,
    field: "contractual" | "approved" | "actual" | "exceptions" | "note",
    value: string,
  ) =>
    setDraft((rows) =>
      rows.map((cost) =>
        cost.id === id
          ? {
              ...cost,
              [field]: field === "note" ? value : Number(value),
              data_source: "manual",
              ...(field !== "note" &&
              (cost.note.startsWith("חלוקה להדגמה") ||
                cost.note === "נתוני עלויות לדוגמה")
                ? { note: "" }
                : {}),
            }
          : cost,
      ),
    );
  return (
    <>
      <div className="section-heading costs-heading">
        <div>
          <h2>עלויות פרויקט</h2>
          <p className="muted">מעקב עלויות וחלוקה לפרקים</p>
        </div>
        <div className="inline-actions">
          <FileSkillAction context="עלויות פרויקט" />
          <button
            onClick={() => {
              try {
                downloadExcel(
                  costsWorkbook(project, costs, sourceBudget, comparison),
                  `עלויות-${project.name}`,
                );
                setError("");
              } catch {
                setError("לא ניתן להפיק קובץ אקסל. נסה שוב.");
              }
            }}
          >
            ייצוא לאקסל
          </button>
          <button
            className="primary"
            onClick={() => {
              setDraft(costs.map((cost) => ({ ...cost })));
              setEditing(true);
            }}
          >
            עריכת עלויות
          </button>
        </div>
      </div>
      {hasDemo && (
        <p className="demo-cost-notice">
          חלוקת העלויות לפרקים כוללת נתוני הדגמה לצורך ההצגה. אפשר להחליף אותם
          באמצעות ״עריכת עלויות״; הם מסומנים גם בייצוא לאקסל.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="cost-summary">
        {[
          ["תקציב", sum("contractual")],
          ["הזמנות מאושרות", sum("approved")],
          ["חשבונות מאושרים", sum("actual")],
          ["יתרה", sum("contractual") - sum("actual")],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="muted">{label}</span>
            <strong>{currency(Number(value))}</strong>
          </div>
        ))}
      </div>
      {view === "variance" && (
        <CostVarianceItems
          items={project.variance_items ?? []}
          onSave={onVarianceSave}
        />
      )}
      <div className="costs-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {view === "chapters"
                ? "עלויות לפי פרק"
                : "השוואת פלוס / מינוס לפי פרקים"}
            </h2>
            <span className="subtle-label">{costs.length} פרקים · ש״ח</span>
          </div>
          <div className="cost-table-toolbar">
            <div className="segmented" aria-label="בחירת טבלת עלויות">
              <button
                aria-pressed={view === "chapters"}
                className={view === "chapters" ? "active" : ""}
                onClick={() => setView("chapters")}
              >
                פרקי עלויות
              </button>
              <button
                aria-pressed={view === "variance"}
                className={view === "variance" ? "active" : ""}
                onClick={() => setView("variance")}
              >
                פלוס / מינוס
              </button>
            </div>
            {view === "variance" && (
              <label>
                השוואה לחוזה
                <select
                  value={comparison}
                  onChange={(e) =>
                    setComparison(e.target.value as typeof comparison)
                  }
                >
                  <option value="approved">סכום מאושר</option>
                  <option value="actual">ביצוע בפועל</option>
                </select>
              </label>
            )}
          </div>
          {view === "variance" ? (
            <CostVarianceTable costs={costs} comparison={comparison} />
          ) : (
            <Table
              caption="עלויות פרויקט לפי פרקים"
              headers={[
                "פרק",
                "סכום חוזי",
                "סכום מאושר",
                "ביצוע בפועל",
                "חריגים",
                "הערות",
              ]}
            >
              {costs.map((cost) => (
                <tr key={cost.id}>
                  <td className="strong">
                    {cost.chapter}
                    <small className="cell-sub">
                      {cost.data_source === "manual"
                        ? "הוזן ידנית"
                        : "נתון הדגמה"}
                    </small>
                  </td>
                  <td className="money">{currency(cost.contractual)}</td>
                  <td className="money">{currency(cost.approved)}</td>
                  <td className="money">{currency(cost.actual)}</td>
                  <td
                    className={
                      cost.exceptions ? "warning-text money" : "muted money"
                    }
                  >
                    {currency(cost.exceptions)}
                  </td>
                  <td>{cost.note || "—"}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>סה״כ</td>
                <td className="money">{currency(sum("contractual"))}</td>
                <td className="money">{currency(sum("approved"))}</td>
                <td className="money">{currency(sum("actual"))}</td>
                <td className="money">{currency(sum("exceptions"))}</td>
                <td />
              </tr>
            </Table>
          )}
        </section>
        <CostPie costs={costs} />
      </div>
      <p className="muted small-note">
        יתרה = תקציב פחות חשבונות מאושרים. חריגים מוצגים בנפרד. אומדן מקובץ
        המקור: {sourceBudget === null ? "לא צוין" : currency(sourceBudget)}.
      </p>
      {editing && (
        <Modal
          title={`עריכת עלויות · ${project.name}`}
          onClose={() => setEditing(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                draft.some((cost) =>
                  numericFields.some(
                    (field) =>
                      !Number.isFinite(cost[field.key]) || cost[field.key] < 0,
                  ),
                )
              )
                return;
              onSave(draft);
              setEditing(false);
            }}
          >
            {draft.map((cost) => (
              <fieldset className="cost-edit-chapter" key={cost.id}>
                <legend>
                  {cost.chapter}
                  {cost.data_source !== "manual" && <Badge>הדגמה</Badge>}
                </legend>
                <div className="form-grid">
                  {numericFields.map((field) => (
                    <Field key={field.key} label={`${field.label} (ש״ח)`}>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={cost[field.key]}
                        onChange={(e) =>
                          update(cost.id, field.key, e.target.value)
                        }
                      />
                    </Field>
                  ))}
                  <Field label="הערות" className="full">
                    <input
                      value={cost.note}
                      onChange={(e) => update(cost.id, "note", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>
            ))}
            <div className="form-actions">
              <button className="primary">שמירת עלויות</button>
              <button type="button" onClick={() => setEditing(false)}>
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
