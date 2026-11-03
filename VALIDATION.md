# Validation

- TypeScript: `tsc -b` passed.
- Lint: `eslint .` passed with no errors or warnings.
- Production: `vite build` passed (58 modules transformed).
- Local dev server: Vite started at `http://127.0.0.1:5173/`; HTTP GET returned 200.
- Browser QA now passes in the in-app browser: incorrect password rejected; Shahar sees 6 assigned projects; Nave sees 9 different projects, without Shahar's tasks. Saving from the office overview is reflected inside the project. Existing manager notes and workbook budgets remain intact. Temporary test text was removed after verification.
- GitHub: repository metadata is readable and reports user push permission, but both Contents and Git Blob write operations return 403 `Resource not accessible by integration`. This blocks a remote commit/push and also a branch/PR fallback through the same integration. No remote changes were made by these rejected operations.

Lint is run against application files, excluding generated output, node_modules and the environment-local Corepack cache. Final lint and build results are also reported in the delivery message.

The supplied company logo is served from `public/rassuly-logo.png`. Login credentials are demo-only and authentication remains entirely client-side. Workbook originals were read without edits.

After the reference-based restyle, login, project navigation, budget/date summaries and mobile layout were verified again in the browser. The original module structure is retained; the reference's contractor accounts screen is not introduced as an extra module by this visual update.

The compact company badge now follows the latest supplied reference with readable text and three teal bars. The tasks tab was checked in Nave's portfolio: projects with no tasks show an explicit empty state and an add-task button. Module selection focuses and scrolls to the requested content while keeping the module navigation available.

Following the user's clarification, the full company name is shown on the main dashboard and login, and internal pages use the symbol alone as a home-navigation button. The internal-page symbol-only state was visually verified in the browser.

Project module tabs now appear directly after open-project tabs, above the project heading and summary. Their top placement was verified visually in the browser; build, TypeScript and lint pass.

Latest feature checks:

- Browser: the requested Hadassah Ein Kerem client appears for both presentation projects. Manager instructions save independently above the regular tasks and survive module navigation. Temporary validation text was removed; the new-task dialog opens correctly.
- Browser: latest-office-update cards, collapsed detail editor, cost pie chart and switching its metric to actual costs were verified. The plus/minus view displays separate additions, deductions and signed net variance. The fixed return button works while scrolled into a project.
- Data migration: independently checked preservation of existing tasks, manager instructions, office statuses and existing chapter costs; applying the migration twice does not duplicate data or overwrite later client edits.
- XLSX files: independently opened with openpyxl. Verified 6 versus 9 assigned project rows, Hebrew/RTL, numeric money cells, true date cells, frozen headers, formulas, cached totals, source/demonstration labels, zero-cost handling, mixed positive/negative variances and actual-versus-contract comparisons.
- Browser download limitation: waiting for a download confirmation in the in-app browser timed out. Workbook generation and the resulting files are verified, but an end-to-end download confirmation from that browser was not obtained.
