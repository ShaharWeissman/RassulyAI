import type { ProjectCost } from "../types";

const chapters = [
  { name: "בינוי", weight: 0.45 },
  { name: "חשמל", weight: 0.2 },
  { name: "מיזוג אוויר", weight: 0.2 },
  { name: "אינסטלציה", weight: 0.1 },
  { name: "תקשורת", weight: 0.05 },
];

// The workbooks contain overall estimates, not chapter-level cost breakdowns.
// Provide explicitly labelled presentation data until real amounts are entered.
export function demoProjectCosts(
  projectId: string,
  sourceBudget: number | null,
): ProjectCost[] {
  const budget = sourceBudget ?? 1000000;
  let allocated = 0;
  return chapters.map((chapter, index) => {
    const contractual =
      index === chapters.length - 1
        ? budget - allocated
        : Math.round(budget * chapter.weight);
    allocated += contractual;
    return {
      id: `${projectId}-chapter-${index}`,
      project_id: projectId,
      chapter: chapter.name,
      contractual,
      approved: Math.round(contractual * 0.9),
      actual: Math.round(contractual * 0.6),
      exceptions: 0,
      note: "חלוקה להדגמה בלבד — אינה פירוט מהאקסל",
      data_source: "demo",
    };
  });
}
