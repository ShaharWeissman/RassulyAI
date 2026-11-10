import { strToU8, zipSync } from "fflate";
import type { AppData, Project, ProjectCost } from "../types";

type Value = string | number | null;
interface Cell {
  value?: Value;
  style?: number;
  formula?: string;
}
interface Sheet {
  name: string;
  rows: Cell[][];
  widths: number[];
  headerRow: number;
  dataEndRow?: number;
}
const cell = (value: Value, style = 0): Cell => ({ value, style });
const textRow = (values: Value[], style = 0) =>
  values.map((value) => cell(value, style));
const money = (value: number | null) => cell(value, 2);
const date = (iso: string) =>
  iso
    ? cell(
        (Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000,
        3,
      )
    : cell(null);
const formula = (expression: string, value: number, style = 2): Cell => ({
  formula: expression,
  value,
  style,
});
const xml = (value: string) =>
  Array.from(value)
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 ||
        [9, 10, 13].includes(character.charCodeAt(0)),
    )
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const column = (index: number): string =>
  index < 26
    ? String.fromCharCode(65 + index)
    : column(Math.floor(index / 26) - 1) + column(index % 26);
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

// Small, browser-native XLSX writer: typed cells, formulas, RTL sheets and styling.
export function workbookBytes(sheets: Sheet[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const add = (path: string, content: string) => {
    files[path] = strToU8(declaration + content);
  };
  add(
    "[Content_Types].xml",
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
  );
  add(
    "_rels/.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  add(
    "xl/workbook.xml",
    `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
  );
  add(
    "xl/_rels/workbook.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  add(
    "xl/styles.xml",
    `<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00&quot; ₪&quot;"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="16"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF177F8C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1" readingOrder="2"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" readingOrder="2"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  );
  sheets.forEach((sheet, index) => {
    const lastColumn = column(sheet.widths.length - 1);
    const rows = sheet.rows
      .map((row, ri) => {
        const wrappedLines = Math.max(
          1,
          ...row.map((c, ci) =>
            typeof c.value === "string"
              ? c.value
                  .split("\n")
                  .reduce(
                    (n, line) =>
                      n +
                      Math.max(
                        1,
                        Math.ceil(line.length / (sheet.widths[ci] ?? 30)),
                      ),
                    0,
                  )
              : 1,
          ),
        );
        const height =
          ri + 1 === sheet.headerRow ? 32 : Math.max(24, wrappedLines * 16);
        return `<row r="${ri + 1}" ht="${Math.min(409, height)}" customHeight="1">${row
          .map((c, ci) => {
            const ref = `${column(ci)}${ri + 1}`;
            if (c.formula)
              return `<c r="${ref}" s="${c.style ?? 0}"><f>${xml(c.formula)}</f><v>${c.value ?? 0}</v></c>`;
            if (c.value === null || c.value === undefined)
              return `<c r="${ref}" s="${c.style ?? 0}"/>`;
            if (typeof c.value === "number")
              return `<c r="${ref}" s="${c.style ?? 0}"><v>${Number.isFinite(c.value) ? c.value : 0}</v></c>`;
            return `<c r="${ref}" s="${c.style ?? 0}" t="inlineStr"><is><t xml:space="preserve">${xml(c.value.slice(0, 32767))}</t></is></c>`;
          })
          .join("")}</row>`;
      })
      .join("");
    add(
      `xl/worksheets/sheet${index + 1}.xml`,
      `<worksheet xmlns="${ns}"><dimension ref="A1:${lastColumn}${sheet.rows.length}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="${sheet.headerRow}" topLeftCell="A${sheet.headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData><autoFilter ref="A${sheet.headerRow}:${lastColumn}${sheet.dataEndRow ?? sheet.rows.length}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`,
    );
  });
  return zipSync(files, { level: 6 });
}

export function projectsWorkbook(data: AppData): Uint8Array {
  const summary: Cell[][] = [
    textRow(["הפרויקטים שלי — רסולי הנדסה"], 4),
    textRow([
      `הופק עבור ${data.workers[0]?.name ?? ""} · ${new Date().toLocaleDateString("he-IL")}`,
    ]),
    [],
    textRow(
      [
        "פרויקט",
        "מזמין עבודה",
        "שלב",
        "סוג פרויקט",
        "סטטוס",
        "מצב משרדי",
        "עדכון אחרון",
        "גורם מעדכן",
        "אומדן מקור (ש״ח)",
        "יעד לגמר השלב",
      ],
      1,
    ),
  ];
  const updates: Cell[][] = [
    textRow(["עדכוני פרויקטים"], 4),
    textRow(["העדכון האחרון שנשמר במערכת המקומית"]),
    [],
    textRow(
      [
        "פרויקט",
        "סטטוס כללי",
        "עדכון מפורט",
        "בעיות ודרכי פתרון",
        "לטיפול מנהל",
        "משימות מנהל",
        "הערות מנהל",
      ],
      1,
    ),
  ];
  data.projects.forEach((p) => {
    const s = data.office_project_status.find(
      (status) => status.project_id === p.id,
    )!;
    summary.push([
      cell(p.name),
      cell(p.client),
      cell(p.current_stage),
      cell(p.project_type),
      cell(p.status),
      cell(s.condition),
      date(s.updated_at),
      cell(s.update_owner),
      money(s.budget),
      date(s.stage_due_date),
    ]);
    updates.push(
      textRow([
        p.name,
        s.short_status,
        s.detailed_status,
        s.major_issues,
        s.manager_issue,
        p.manager_tasks ?? "",
        s.manager_notes,
      ]),
    );
  });
  return workbookBytes([
    {
      name: "פרויקטים",
      rows: summary,
      widths: [45, 28, 20, 18, 15, 22, 18, 22, 24, 20],
      headerRow: 4,
    },
    {
      name: "עדכונים",
      rows: updates,
      widths: [45, 35, 90, 70, 55, 60, 45],
      headerRow: 4,
    },
  ]);
}

export function costsWorkbook(
  project: Project,
  costs: ProjectCost[],
  sourceBudget: number | null,
  comparison: "approved" | "actual" = "approved",
): Uint8Array {
  const sum = (key: "contractual" | "approved" | "actual" | "exceptions") =>
    costs.reduce((total, row) => total + row[key], 0);
  const sourceNote = costs.some((cost) => cost.data_source !== "manual")
    ? "כולל נתוני הדגמה: החלוקה לפרקים אינה פירוט מתוך קובצי המקור."
    : "נתוני עלויות שהוזנו במערכת";
  const rows: Cell[][] = [
    textRow([`עלויות פרויקט — ${project.name}`], 4),
    textRow([sourceNote]),
    [],
    textRow(
      [
        "פרק",
        "סכום חוזי",
        "סכום מאושר",
        "ביצוע בפועל",
        "חריגים",
        "חלק מהתקציב",
        "הערות",
        "מקור הנתון",
      ],
      1,
    ),
  ];
  const first = 5,
    last = 4 + costs.length,
    total = last + 1;
  costs.forEach((cost, i) =>
    rows.push([
      cell(cost.chapter),
      money(cost.contractual),
      money(cost.approved),
      money(cost.actual),
      money(cost.exceptions),
      formula(
        `IF(SUM($B$${first}:$B$${last})=0,0,B${first + i}/SUM($B$${first}:$B$${last}))`,
        sum("contractual") ? cost.contractual / sum("contractual") : 0,
        6,
      ),
      cell(cost.note),
      cell(cost.data_source === "manual" ? "הוזן ידנית" : "הדגמה"),
    ]),
  );
  rows.push([
    cell("סה״כ"),
    ...(["contractual", "approved", "actual", "exceptions"] as const).map(
      (key, i) =>
        formula(
          `SUM(${column(i + 1)}${first}:${column(i + 1)}${last})`,
          sum(key),
          5,
        ),
    ),
    formula(`IF(B${total}=0,0,1)`, sum("contractual") ? 1 : 0, 6),
  ]);
  const summary: Cell[][] = [
    textRow([project.name], 4),
    textRow([sourceNote]),
    [],
    textRow(["מדד", "סכום בש״ח"], 1),
    [cell("תקציב פרקים"), formula(`'פרקים'!B${total}`, sum("contractual"))],
    [cell("הזמנות מאושרות"), formula(`'פרקים'!C${total}`, sum("approved"))],
    [cell("חשבונות מאושרים"), formula(`'פרקים'!D${total}`, sum("actual"))],
    [cell("יתרה"), formula("B5-B7", sum("contractual") - sum("actual"))],
    [cell("אומדן מקובץ המקור"), money(sourceBudget)],
  ];
  const varianceRows: Cell[][] = [
    textRow([`פלוס / מינוס — ${project.name}`], 4),
    textRow([
      `${comparison === "approved" ? "סכום מאושר" : "ביצוע בפועל"} פחות סכום חוזי; תוספות והפחתות מוצגות בנפרד.`,
    ]),
    textRow([sourceNote]),
    textRow(
      [
        "פרק",
        "סכום חוזי",
        comparison === "approved" ? "סכום מאושר" : "ביצוע בפועל",
        "פלוס · תוספות",
        "מינוס · הפחתות",
        "הפרש נטו",
        "הערות",
        "מקור הנתון",
      ],
      1,
    ),
  ];
  costs.forEach((cost, i) => {
    const r = first + i,
      delta = cost[comparison] - cost.contractual;
    varianceRows.push([
      cell(cost.chapter),
      money(cost.contractual),
      money(cost[comparison]),
      formula(`MAX(C${r}-B${r},0)`, Math.max(delta, 0)),
      formula(`MAX(B${r}-C${r},0)`, Math.max(-delta, 0)),
      formula(`C${r}-B${r}`, delta),
      cell(cost.note),
      cell(cost.data_source === "manual" ? "הוזן ידנית" : "הדגמה"),
    ]);
  });
  varianceRows.push([
    cell("סה״כ"),
    ...["B", "C", "D", "E", "F"].map((col, i) =>
      formula(
        `SUM(${col}${first}:${col}${last})`,
        costs.reduce(
          (n, cost) =>
            n +
            (i === 0
              ? cost.contractual
              : i === 1
                ? cost[comparison]
                : i === 2
                  ? Math.max(cost[comparison] - cost.contractual, 0)
                  : i === 3
                    ? Math.max(cost.contractual - cost[comparison], 0)
                    : cost[comparison] - cost.contractual),
          0,
        ),
        5,
      ),
    ),
  ]);
  summary.push([
    cell("פלוס / מינוס נטו"),
    formula(`'פלוס מינוס'!F${total}`, sum(comparison) - sum("contractual")),
  ]);
  return workbookBytes([
    { name: "סיכום", rows: summary, widths: [75, 30], headerRow: 4 },
    {
      name: "פרקים",
      rows,
      widths: [25, 25, 25, 25, 22, 22, 65, 20],
      headerRow: 4,
      dataEndRow: last,
    },
    {
      name: "פלוס מינוס",
      rows: varianceRows,
      widths: [25, 25, 25, 25, 25, 25, 65, 20],
      headerRow: 4,
      dataEndRow: last,
    },
    ...(project.variance_items?.length
      ? [
          {
            name: "סעיפי פלוס מינוס",
            rows: [
              textRow(
                [
                  "מספר סעיף / חריג",
                  "פרק",
                  "תיאור",
                  "פלוס",
                  "מינוס",
                  "אישור מזמין",
                  "הערה",
                ],
                1,
              ),
              ...project.variance_items.map((item) => [
                cell(item.code),
                cell(item.chapter),
                cell(item.description),
                money(item.amount > 0 ? item.amount : null),
                money(item.amount < 0 ? item.amount : null),
                cell(item.approval),
                cell(item.note),
              ]),
            ],
            widths: [24, 24, 55, 20, 20, 22, 45],
            headerRow: 1,
          },
        ]
      : []),
  ]);
}

export function downloadExcel(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[<>:"/\\|?*]/g, "-") + ".xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
