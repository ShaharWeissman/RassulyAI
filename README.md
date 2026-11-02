# RassulyAI

First frontend mockup for the Rassuly Engineering internal civil-engineering project management system. React, TypeScript and Vite; Hebrew and RTL throughout. No UI library or backend.

## Run

Install Node.js 22 LTS or newer, then from the repository directory:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). Click **התחברות** with or without credentials. Credentials are neither validated nor stored.

```sh
pnpm build
pnpm lint
pnpm preview
```

The production bundle is generated in `dist/`. The mock has no environment variables or API keys. `node-linker=hoisted` in `.npmrc` avoids dependency symlink requirements on Windows.

## Implemented

- Mock login and project manager dashboard with assigned project cards: שיבא נוירו, איתנים, אלרגיה, מיון.
- Workspace with open-project tabs and a + project picker. Project name is the page title; data is the default module.
- Read-only project data with an explicit edit dialog: client, status, current stage and type. Stages are a fixed dropdown; progression is stage-based.
- Cost chapter table and calculated budget, approved orders, approved accounts and balance. Approved accounts use the mock actual-cost total; this is a demonstration accounting mapping. Exceptions are shown separately.
- Tasks with inline status changes and a new-task dialog.
- Structured protocol creation and detail display: type, date, participants, summary and multiple decision/task items, each with owner, due date and status. File picker saves metadata only.
- Office status editor inside each project and an all-project overview, sharing exactly the same `office_project_status` state. Both update/edit actions open the shared editor.
- Monthly vehicle mileage reporting, with duplicate-month and odometer-sequence validation and report history.
- Vacation and sick-leave requests with date validation and pending/approved examples.
- Neutral design tokens, thin borders, muted teal active states, responsive cards, scrolling tables/project tabs, accessible labels, focus states and native modal dialogs.

## Source layout

```text
src/
  App.tsx                         shared application state and navigation
  main.tsx                        React entry point
  pages/                          Login, Dashboard, ProjectWorkspace, OfficeProjectStatus
  components/
    ui/                           controls, icons, modal, table, badges
    dashboard/                    CarReport, Personal
    projects/                     ProjectData
    costs/                        Costs
    tasks/                        Tasks
    protocols/                    Protocols
    office-status/                shared OfficeStatusForm
  data/mockData.ts                sample data and current mock worker
  types/index.ts                  database-ready interfaces
  styles/tokens.css               requested palette
  styles/app.css                  RTL and responsive layout
```

## Data and mock boundaries

All state is held in memory in `App.tsx`. Changes survive navigation and project switching but reset on refresh. Signing out returns to the login screen; it is not a security boundary. This is intentionally a mock, without Supabase, real authentication, role enforcement, API calls, approval workflows, file storage, or Word/PDF export.

The data model includes workers, projects, project_assignments, project_status_updates, requirements_tasks, project_costs, protocols (with structured protocol_items), office_project_status, vehicles, mileage_entries and leave_requests. Project stages use `current_stage`. Protocol items are embedded for this mock and can be normalized into a separate database table later. Editing a project's stage also adds a typed project status update. The current worker's project list is filtered by assignments.

Example names, dates, costs, vehicle registrations and statuses are fictional sample data. Any submitted login values are ignored. Uploaded files are not transmitted and cannot be downloaded from the mock; only their name, size and MIME type are retained in state.

## Verification

TypeScript compilation and the production Vite build pass. See `VALIDATION.md` for the final check results and environment limitations.
