import { findDuplicates } from "../public/lib/duplicates.js";
import { localSubmissionIssues, localSubmissionRecord } from "../public/lib/validate-local-submission.js";
import { submissionIssues, submissionRecord } from "../public/lib/validate-submission.js";

const MAX_BODY_BYTES = 8000;

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env, githubFetch = fetch) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const cors = origin && allowed.includes(origin) ? corsHeaders(origin) : null;

  if (request.method === "OPTIONS") {
    if (!cors) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  if (!cors) {
    return json({ error: "This form cannot be submitted from this site." }, 403, null);
  }

  if (!env.GITHUB_TOKEN) {
    console.error(JSON.stringify({ message: "GITHUB_TOKEN is not configured" }));
    return json({ error: "Submissions are not available right now." }, 503, cors);
  }

  let raw;
  try {
    raw = await readLimitedBody(request);
  } catch (err) {
    if (err?.code === "too_large") {
      return json({ error: "Submission is too large." }, 413, cors);
    }
    throw err;
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Submission must be JSON." }, 400, cors);
  }

  const local = isLocalSubmission(body);
  const issues = local ? localSubmissionIssues(body) : submissionIssues(body);
  if (issues.length) {
    return json({ error: issues[0] }, 400, cors);
  }

  const event = local ? localSubmissionRecord(body) : submissionRecord(body);
  const year = event.eventDate.slice(0, 4);
  const collection = local ? "local" : "events";

  let existing;
  try {
    existing = await loadYearEvents(env, year, githubFetch, collection);
  } catch (err) {
    console.error(JSON.stringify({ message: "failed to read events", error: errorMessage(err) }));
    return json({ error: "Could not submit the event. Try again." }, 502, cors);
  }

  const pending = { ...event, id: "pending" };
  const duplicate = findDuplicates([...existing, pending]).find((match) => match.id === "pending");
  if (duplicate) {
    const which = duplicate.match === "url" ? "registration URL and date" : "name and date";
    return json({ error: `An event with this ${which} is already listed.` }, 409, cors);
  }

  const record = {
    ...event,
    id: `evt-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`,
    source: "submission",
  };

  try {
    const issue = await createIssue(env, record, year, githubFetch, collection);
    console.log(JSON.stringify({ message: "issue created", issue: issue.number }));
    return json({ ok: true }, 201, cors);
  } catch (err) {
    console.error(JSON.stringify({ message: "failed to create issue", error: errorMessage(err) }));
    return json({ error: "Could not submit the event. Try again." }, 502, cors);
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(payload, status, cors) {
  const headers = { "Content-Type": "application/json", ...(cors ?? {}) };
  return new Response(JSON.stringify(payload), { status, headers });
}

async function readLimitedBody(request) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    const error = new Error("body too large");
    error.code = "too_large";
    throw error;
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      const error = new Error("body too large");
      error.code = "too_large";
      throw error;
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(concatBytes(chunks, received));
}

function concatBytes(chunks, length) {
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isLocalSubmission(body) {
  return Boolean(body && typeof body === "object" && !Array.isArray(body) && body.board === "local");
}

async function loadYearEvents(env, year, githubFetch, collection = "events") {
  const response = await github(
    env,
    githubFetch,
    `/repos/${repoPath(env)}/contents/public/data/${collection}/${year}.json`
  );
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`contents ${response.status}`);
  }

  const payload = await response.json();
  const encoded = String(payload.content ?? "").replaceAll("\n", "");
  const events = JSON.parse(atob(encoded));
  if (!Array.isArray(events)) throw new Error("year file is not an array");
  return events;
}

async function createIssue(env, record, year, githubFetch, collection = "events") {
  const title =
    collection === "local"
      ? `Local event: ${record.name} (${record.eventDate})`
      : `Event: ${record.name} (${record.eventDate})`;
  const intro =
    collection === "local"
      ? "Submitted from the local board for review."
      : "Submitted from the board for review.";
  const body = [
    intro,
    "",
    `Add this object to \`public/data/${collection}/${year}.json\`.`,
    `If that file does not exist, create it and add the year to \`public/data/${collection}/index.json\`.`,
    "",
    "```json",
    JSON.stringify(record, null, 2),
    "```",
  ].join("\n");

  const labeled = await github(env, githubFetch, `/repos/${repoPath(env)}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body, labels: ["submission"] }),
  });

  if (labeled.ok) return labeled.json();

  if (labeled.status === 422) {
    const retry = await github(env, githubFetch, `/repos/${repoPath(env)}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    if (retry.ok) return retry.json();
    throw new Error(`issues ${retry.status}`);
  }

  throw new Error(`issues ${labeled.status}`);
}

function repoPath(env) {
  return `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
}

function github(env, githubFetch, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
  headers.set("User-Agent", "boardpost-submissions");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  if (init.body) headers.set("Content-Type", "application/json");
  return githubFetch(`https://api.github.com${path}`, { ...init, headers });
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}
