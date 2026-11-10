# Supabase POC setup

Apply the migrations in filename order through Supabase migrations, or run
their SQL in the project's SQL Editor. The first migration creates the
workspace table and restricted RPCs. The second imports workbook portfolios.
Initial chapter amounts are zero pending manual entry.

Create confirmed Supabase Auth accounts for shaharw@rassuly-eng.co.il and
nave@rassuly-eng.co.il. Use the passwords configured in Supabase for cloud
login. The local demo password does not create cloud accounts.

Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the hosting
environment, following .env.example, and rebuild. Use only the public key.

Each worker's portfolio is stored as a JSONB document in PostgreSQL for this
POC. Authenticated RPCs match the confirmed account to its portfolio.
Direct table access is revoked and RLS is enabled. Writes use row locking
and a revision number to prevent concurrent overwrites. A lost-response
retry with the same document is idempotent.

The UI reports successful cloud storage only after the RPC succeeds.
Failed writes remain pending, with retry and JSON backup controls. Closing
a page with pending changes triggers a browser warning. Existing local
browser edits need an explicit import; they are not uploaded automatically.

Before presenting, verify both accounts against the live project. Edit a
status, wait for saved confirmation, reload and sign in again. Verify the
same value from another browser. SQL behavior was tested locally with
PGlite using simulated Supabase Auth identities; live deployment verification
is still required.
