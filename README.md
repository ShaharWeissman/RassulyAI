# RassulyAI

First frontend mockup for the Rassuly Engineering internal civil-engineering project management system. React, TypeScript and Vite; Hebrew and RTL throughout. No UI library or backend.

## Run

Install Node.js 22 LTS or newer, then from the repository directory:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). Choose Shahar or Nave, enter the corresponding email and password `1234`, then click **התחברות**.

| Account | Email | Projects |
| --- | --- | --- |
| Shahar | shaharw@rassuly-eng.co.il | 6 |
| Nave | nave@rassuly-eng.co.il | 9 |

These are frontend demonstration accounts. Incorrect emails/passwords are rejected by the mock; passwords are not stored in browser storage. This is not server-side authentication.

```sh
pnpm build
pnpm lint
pnpm preview
```

The production bundle is generated in `dist/`. The mock has no environment variables or API keys. `node-linker=hoisted` in `.npmrc` avoids dependency symlink requirements on Windows.

## Implemented

- Two demonstration accounts with separate assigned project lists based on the supplied workbooks. The name, email, project tabs, task lists, office status, mileage and leave requests follow the signed-in user. Logging out clears navigation and open project tabs.
- The supplied Rassuly logo appears in the login screen, navigation and desktop header.
- A compact company badge matches the latest supplied logo treatment. Module navigation moves directly to the selected content; empty task lists show a clear message and an add-task action.
- The main dashboard shows the company symbol with its name; internal pages show only the three-bar symbol. The brand is a menu action that returns to the main dashboard.
- The workspace follows the supplied visual reference: full-width dark top navigation, browser-style project tabs, a white project title area with a six-field summary, underlined module tabs and spacious bordered tables. The same modules remain available on mobile.
- Workspace with open-project tabs and a + project picker. Project name is the page title; data is the default module.
- Read-only project data with an explicit edit dialog: client, status, current stage and type. Stages are a fixed dropdown; progression is stage-based.
- Cost chapter table and calculated budget, approved orders, approved accounts and balance. Approved accounts use the mock actual-cost total; this is a demonstration accounting mapping. Exceptions are shown separately.
- Tasks with inline status changes and a new-task dialog.
- Structured protocol creation and detail display: type, date, participants, summary and multiple decision/task items, each with owner, due date and status. File picker saves metadata only.
- Office status editor inside each project and an all-project overview, sharing exactly the same `office_project_status` state. The form includes general status, stage deadline, budget, budget notes, person responsible for updates, follow-up meeting date, detailed status, issues/solutions and matters requiring manager action. Existing manager notes are read-only and preserved on save.
- Monthly vehicle mileage reporting, with duplicate-month and odometer-sequence validation and report history.
- Vacation and sick-leave requests with date validation and pending approval status.
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
  data/auth.ts                    two demo accounts and assignment selection
  data/mockData.ts                initial application state and sample modules
  data/portfolioData.json         workbook-derived portfolio snapshot
  data/workspaceStorage.ts        versioned browser-local persistence
  types/index.ts                  database-ready interfaces
  styles/tokens.css               requested palette
  styles/app.css                  RTL and responsive layout
  styles/reference.css            reference-based header and workspace styling
```

## Data and mock boundaries

State is held in `App.tsx` and saved to this browser's localStorage under `rassuly-workspace-v2`. Edits survive refresh and user switching on this device. Login is required again after refresh. Storage errors display a visible message; in that case edits last only until refresh. Signing out clears the current identity and open tabs. Client-side filters and mutation guards prevent accidental edits to unassigned projects through the UI, but are not a server security boundary. This mock has no Supabase, server authentication, database authorization, API calls, real approval workflows, file storage or Word/PDF export. Browser data is not synchronized between devices.

The data model includes workers, projects, project_assignments, project_status_updates, requirements_tasks, project_costs, protocols (with structured protocol_items), office_project_status, vehicles, mileage_entries and leave_requests. Project stages use `current_stage`. Protocol items are embedded for this mock and can be normalized into a separate database table later. Editing a project's stage also adds a typed project status update. The current worker's project list is filtered by assignments.

Portfolio names and office status fields are snapshots of the main sheets in the supplied Shahar and Nave accessibility workbooks (6 and 9 rows respectively). Auxiliary sheets are not imported as standalone projects. The originals are read-only inputs and are not modified or synchronized by the app. Each office status record retains its source workbook, sheet and row. Original dates are preserved, including Nave's older 2024 updates; saving a status sets the update date to today. Missing values remain blank or explicitly unclassified. Broad stage strings are mapped to the existing stage dropdown; `אחר` and `טרם הוגדר` cover explicit other/missing source stages without inventing a lifecycle phase.

Cost chapters, selected tasks and vehicle registrations are demonstration data; the office budget comes from the source workbook. Projects without chapter-level costs show a missing-data message. Uploaded files are not transmitted and cannot be downloaded from the mock; only their name, size and MIME type are retained in state.

## Verification

TypeScript compilation and the production Vite build pass. See `VALIDATION.md` for the final check results and environment limitations.
