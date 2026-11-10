CREATE TABLE IF NOT EXISTS workers (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE CHECK (email = lower(email))
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  client text NOT NULL,
  status text NOT NULL,
  current_stage text NOT NULL,
  project_type text NOT NULL,
  manager_tasks text
);

CREATE TABLE IF NOT EXISTS project_assignments (
  project_id text NOT NULL REFERENCES projects(id),
  worker_id text NOT NULL REFERENCES workers(id),
  PRIMARY KEY (worker_id, project_id)
);

CREATE TABLE IF NOT EXISTS office_project_status (
  project_id text PRIMARY KEY REFERENCES projects(id),
  details jsonb NOT NULL CHECK (jsonb_typeof(details) = 'object')
);
