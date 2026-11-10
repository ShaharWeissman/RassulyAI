# PostgreSQL portfolio import

The initial schema stores workers, projects, project assignments, and the
office status from the source workbooks. This import does not include browser
edits or demo costs. Worker records identify project owners and do not grant
login access.

Use a dedicated database with PostgreSQL's `psql` client on PATH. Set
`PGHOST`, `PGPORT`, `PGDATABASE`, and `PGUSER` for the target database.
Use the provider's TLS settings and a PostgreSQL password file or another
secure credential mechanism. Run from the repository root:

```sh
node database/import-portfolio.mjs
```

The script creates the tables and inserts the workbook records in one
transaction. Repeating it leaves existing rows with matching IDs intact.

The web app currently uses browser storage. The next integration step is
a server API that authenticates each worker and checks project assignments
before reading or updating data. Keep the database credentials on that server.
