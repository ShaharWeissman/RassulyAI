import { strFromU8, unzipSync } from "fflate";
import type { CostVarianceItem, ProjectCost } from "../types";

type CellValue = string | number;
type Row = Record<string, CellValue>;
export type ProjectCostImport = {
  costs: ProjectCost[];
  items: CostVarianceItem[];
  skipped: number;
};

const nodes = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS("*", name));
const text = (value: CellValue | undefined) => String(value ?? "").trim();
const normalized = (value: CellValue | undefined) =>
  text(value)
    .replace(/[״"'׳]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
const number = (value: CellValue | undefined) => {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  const raw = text(value).replace(/[₪,\s]/g, "");
  return /^[-+]?\d+(\.\d+)?$/.test(raw) ? Number(raw) : undefined;
};
const header = (row: Row, names: string[]) =>
  Object.keys(row).find((key) => names.includes(normalized(row[key])));

export function readProjectCosts(
  bytes: Uint8Array,
  projectId: string,
): ProjectCostImport {
  if (bytes.byteLength > 12_000_000)
    throw new Error("אפשר לבחור קובץ Excel בגודל עד 12 מגה.");
  let size = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      if (
        !/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(
          file.name,
        )
      )
        return false;
      size += file.originalSize;
      if (size > 30_000_000)
        throw new Error("גיליונות הקובץ גדולים מדי לייבוא.");
      return true;
    },
  });
  function xml(path: string) {
    if (!files[path]) throw new Error("מבנה קובץ ה־Excel אינו נתמך.");
    const doc = new DOMParser().parseFromString(
      strFromU8(files[path]),
      "application/xml",
    );
    if (doc.querySelector("parsererror"))
      throw new Error("לא ניתן לקרוא את גיליונות ה־Excel.");
    return doc;
  }
  const workbook = xml("xl/workbook.xml");
  const relationships = nodes(
    xml("xl/_rels/workbook.xml.rels"),
    "Relationship",
  );
  const shared = files["xl/sharedStrings.xml"]
    ? nodes(xml("xl/sharedStrings.xml"), "si").map((item) =>
        nodes(item, "t")
          .map((t) => t.textContent)
          .join(""),
      )
    : [];
  function rowsFor(names: string[]) {
    const sheet = nodes(workbook, "sheet").find((s) =>
      names.includes(normalized(s.getAttribute("name") ?? "")),
    );
    if (!sheet) return [];
    const id = sheet.getAttribute("r:id");
    const path = relationships
      .find((rel) => rel.getAttribute("Id") === id)
      ?.getAttribute("Target");
    if (!path) return [];
    const doc = xml(path.startsWith("/") ? path.slice(1) : `xl/${path}`);
    return nodes(doc, "row").map((row) => {
      const values: Row = {};
      for (const cell of nodes(row, "c")) {
        const column = cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0];
        if (!column) continue;
        const type = cell.getAttribute("t");
        const value = nodes(cell, "v")[0]?.textContent;
        if (type === "s" && value != null)
          values[column] = shared[Number(value)] ?? "";
        else if (type === "inlineStr")
          values[column] = nodes(cell, "t")
            .map((t) => t.textContent)
            .join("");
        else if (type === "str" && value != null) values[column] = value;
        else if (
          (!type || type === "n") &&
          value != null &&
          Number.isFinite(Number(value))
        )
          values[column] = Number(value);
      }
      return values;
    });
  }
  const costs: ProjectCost[] = [];
  const items: CostVarianceItem[] = [];
  let skipped = 0;
  const summary = rowsFor(["ריכוז"]);
  const summaryStart = summary.findIndex(
    (row) =>
      header(row, ["סעיף", "פרק"]) && header(row, ["הצעת מחיר", "סכום חוזי"]),
  );
  if (summaryStart >= 0) {
    const headings = summary[summaryStart];
    const chapterCol = header(headings, ["סעיף", "פרק"])!;
    const priceCol = header(headings, ["הצעת מחיר", "סכום חוזי"])!;
    for (const row of summary.slice(summaryStart + 1)) {
      const chapter = text(row[chapterCol]);
      if (/^(סהכ|סך הכל)/.test(normalized(chapter))) break;
      const contractual = number(row[priceCol]);
      if (chapter && contractual != null)
        costs.push({
          id: crypto.randomUUID(),
          project_id: projectId,
          chapter,
          contractual,
          approved: 0,
          actual: 0,
          exceptions: 0,
          data_source: "manual",
          note: "מתוך גיליון ריכוז · הצעת מחיר",
        });
    }
  }
  const variance = rowsFor(["פלוס מינוס", "פלוס מינוס קבלן"]);
  const varianceStart = variance.findIndex(
    (row) =>
      header(row, ["תאור העבודה", "תיאור העבודה"]) && header(row, ["עלות"]),
  );
  if (varianceStart >= 0) {
    const headings = variance[varianceStart];
    const descriptionCol = header(headings, ["תאור העבודה", "תיאור העבודה"])!;
    const costCol = header(headings, ["עלות"])!;
    const updatedCol = header(headings, ["עלות מעודכנת"]);
    const codeCol = header(headings, ["מספר סעיף/חריג", "מספר סעיף / חריג"]);
    const noteCol = header(headings, ["הערות", "הערה"]);
    const approvalCol = header(headings, [
      "אישור מזמין",
      "סטטוס אישור מזמין",
      "אושר על ידי מזמין",
    ]);
    let chapter = "";
    for (const row of variance.slice(varianceStart + 1)) {
      const description = text(row[descriptionCol]);
      if (!description || /^(סהכ|סך הכל)/.test(normalized(description)))
        continue;
      const code = text(row[codeCol ?? ""]);
      const amount = number(row[updatedCol ?? ""]) ?? number(row[costCol]);
      const note = text(row[noteCol ?? ""]);
      if (
        amount == null &&
        !code &&
        !note &&
        [
          "בינוי וכללי",
          "אינסטלציה",
          "חשמל",
          "מיזוג אוויר",
          "תקשורת",
          "גילוי אש ועשן",
          ...costs.map((cost) => normalized(cost.chapter)),
        ].includes(normalized(description))
      ) {
        chapter = description;
        continue;
      }
      if (amount == null) {
        skipped++;
        continue;
      }
      const status = normalized(row[approvalCol ?? ""]);
      items.push({
        id: crypto.randomUUID(),
        code,
        chapter,
        description,
        amount,
        note,
        approval: ["אושר", "כן", "v"].includes(status)
          ? "אושר"
          : ["לא אושר", "לא", "נדחה"].includes(status)
            ? "לא אושר"
            : "ממתין לאישור",
      });
    }
  }
  if (!costs.length && !items.length)
    throw new Error(
      "לא נמצאו שורות לייבוא. בחר קובץ XLSX עם גיליון ״ריכוז״ או ״פלוס מינוס״ בתבנית המעקב.",
    );
  return { costs, items, skipped };
}
