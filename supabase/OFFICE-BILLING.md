# Office billing and meeting transcription

Apply migrations 20261110000900 through 20261110001100 in order, after the
workspace and company-domain migrations. For an existing workspace set up
manually, the SQL Editor can run the combined Office Billing SQL in a single
transaction. Use either migration deployment or the manual script for this
installation, and reconcile migration history before switching workflows.

Billing uses the existing project IDs and assignments in worker_workspaces.
The admin sees all three workspaces and only assigned projects enter billing.
The monthly table includes archived projects. There is one invoice per
project and month, and new files create separate versions. The RPCs check
identity, project assignment and process state. The tables are inaccessible
directly to browser roles. Files live in the private office-billing-private
bucket. Only the administrator can upload or download. If a file uploads
but its association fails, keep the invoice open and retry the association.

In the site, sign in and choose the Office Billing item in the main menu.
The administrator may open forecasts, close them for review, then release the
month after reviewing positive forecasts. Employees can submit a forecast
for active assigned projects during the current month while step 2 is open.
Visibility of older released months and amounts is off by default.
The print button opens the browser's Save as PDF workflow.

For meeting transcription, deploy the transcribe-meeting Edge Function to
the same project and configure OPENAI_API_KEY in Edge Functions secrets.
Do not set it in a VITE_ variable. The function uses the signed-in user's
token and existing workspace RPC to verify project assignment, then sends
the audio to OpenAI. Files are limited to 24 MB. The application stores the
editable transcript with the protocol when saved, separately from the summary.
Verify transcription with an approved recording after configuring the secret.
