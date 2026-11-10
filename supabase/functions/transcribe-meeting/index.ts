import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-project-id, x-workspace-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const maxAudioBytes = 24_000_000;
const json = (body: object, status = 200) =>
  Response.json(body, { status, headers });
const formats = new Set(["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anon || !apiKey) return json({ error: "not_configured" }, 503);
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: identity, error: authError } = await client.auth.getUser(
    authorization.slice(7),
  );
  if (authError || !identity.user) return json({ error: "unauthorized" }, 401);

  const project = request.headers.get("x-project-id");
  const owner = request.headers.get("x-workspace-id");
  if (!project || !owner || project.length > 200 || owner.length > 80)
    return json({ error: "invalid_project" }, 400);
  const { data: workspace, error: workspaceError } = await client.rpc(
    "load_workspace",
    { target_worker_id: owner },
  );
  if (
    workspaceError ||
    !workspace?.data?.project_assignments?.some(
      (assignment: { project_id: string; worker_id: string }) =>
        assignment.project_id === project && assignment.worker_id === owner,
    )
  )
    return json({ error: "project_access_denied" }, 403);

  if (Number(request.headers.get("Content-Length")) > maxAudioBytes + 16_384)
    return json({ error: "file_too_large" }, 413);
  try {
    const file = (await request.formData()).get("file");
    const extension =
      file instanceof File
        ? file.name.split(".").pop()?.toLowerCase()
        : undefined;
    if (
      !(file instanceof File) ||
      !extension ||
      !formats.has(extension) ||
      !file.size ||
      file.size > maxAudioBytes
    )
      return json({ error: "invalid_audio" }, 400);

    const body = new FormData();
    body.set("file", file, `meeting.${extension}`);
    body.set("model", "gpt-transcribe");
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!response.ok) return json({ error: "transcription_failed" }, 502);
    const result = await response.json();
    if (typeof result.text !== "string" || !result.text.trim())
      return json({ error: "no_speech" }, 422);
    return json({ text: result.text });
  } catch {
    return json({ error: "transcription_failed" }, 502);
  }
});
