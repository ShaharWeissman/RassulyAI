-- Test login identities retain their existing portfolios.
UPDATE public.worker_workspaces SET email = 'tshaharw@example.com', data = jsonb_set(data, '{workers,0,email}', '"tshaharw@example.com"'::jsonb), revision = revision + 1, updated_at = now() WHERE worker_id = 'shahar' AND email = 'shaharw@rassuly-eng.co.il';
UPDATE public.worker_workspaces SET email = 'tnave@example.com', data = jsonb_set(data, '{workers,0,email}', '"tnave@example.com"'::jsonb), revision = revision + 1, updated_at = now() WHERE worker_id = 'nave' AND email = 'nave@rassuly-eng.co.il';
