import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const schema = await read("./001_portfolio.sql");
const portfolio = JSON.parse(await read("../src/data/portfolioData.json"));
const workers = [
  { id: "shahar", name: "שחר וייסמן", email: "shaharw@rassuly-eng.co.il" },
  { id: "nave", name: "נווה", email: "nave@rassuly-eng.co.il" },
];

// Base64 keeps imported workbook text separate from SQL syntax.
function records(rows) {
  const payload = Buffer.from(JSON.stringify(rows)).toString("base64");
  return `convert_from(decode('${payload}', 'base64'), 'UTF8')::jsonb`;
}

if (!process.env.PGDATABASE) {
  throw new Error("Set PGDATABASE and the PostgreSQL connection environment before importing.");
}

const sql = `
BEGIN;
${schema}
INSERT INTO workers
SELECT * FROM jsonb_populate_recordset(NULL::workers, ${records(workers)})
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects
SELECT * FROM jsonb_populate_recordset(NULL::projects, ${records(portfolio.projects)})
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_assignments
SELECT * FROM jsonb_populate_recordset(NULL::project_assignments, ${records(portfolio.assignments)})
ON CONFLICT (worker_id, project_id) DO NOTHING;

INSERT INTO office_project_status (project_id, details)
SELECT row->>'project_id', row - 'project_id'
FROM jsonb_array_elements(${records(portfolio.statuses)}) AS rows(row)
ON CONFLICT (project_id) DO NOTHING;
COMMIT;
`;

const psql = spawn("psql", ["-X", "--set=ON_ERROR_STOP=1", "--file=-"], {
  stdio: ["pipe", "inherit", "inherit"],
  env: { ...process.env, PGCLIENTENCODING: "UTF8" },
});

psql.stdin.on("error", (error) => {
  if (error.code !== "EPIPE") throw error;
});
psql.on("error", (error) => {
  console.error(`Could not start psql: ${error.message}`);
  process.exitCode = 1;
});
psql.on("close", (code) => {
  process.exitCode = code ?? 1;
});
psql.stdin.end(sql, "utf8");
