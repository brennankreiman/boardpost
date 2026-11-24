import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../worker/index.js";

const env = {
  GITHUB_TOKEN: "test-token",
  GITHUB_OWNER: "brennankreiman",
  GITHUB_REPO: "boardpost",
  ALLOWED_ORIGINS: "http://localhost:3000,https://brennankreiman.github.io",
};

const submission = {
  name: "Local Gravel Fondo",
  eventDate: "2027-09-12",
  registrationDeadline: "2027-09-01",
  cost: "$75",
  category: "Gravel",
  location: "Portland, OR",
  registrationUrl: "https://example.com/fondo",
};

function request(body, { method = "POST", origin = "http://localhost:3000" } = {}) {
  return new Request("https://boardpost-submissions.example/submit", {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function githubMock({ events = [], issueStatus = 201 } = {}) {
  const calls = [];
  const githubFetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/contents/public/data/events/2027.json")) {
      if (events === null) return new Response("missing", { status: 404 });
      return Response.json({
        content: btoa(JSON.stringify(events)),
        encoding: "base64",
      });
    }
    if (url.endsWith("/issues") && init.method === "POST") {
      return Response.json({ number: 42 }, { status: issueStatus });
    }
    return new Response("unexpected", { status: 500 });
  };
  return { calls, githubFetch };
}

describe("submission worker", () => {
  it("answers a preflight from an allowed origin", async () => {
    const response = await handleRequest(
      new Request("https://boardpost-submissions.example/submit", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000" },
      }),
      env
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");
  });

  it("rejects a request from an unknown origin", async () => {
    const response = await handleRequest(request(submission, { origin: "https://evil.example" }), env);
    assert.equal(response.status, 403);
  });

  it("rejects an unknown category", async () => {
    const { githubFetch } = githubMock();
    const response = await handleRequest(
      request({ ...submission, category: "road" }),
      env,
      githubFetch
    );
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /category/);
  });

  it("rejects a duplicate name and date", async () => {
    const { githubFetch, calls } = githubMock({
      events: [{ id: "evt-1", name: "local gravel fondo", eventDate: "2027-09-12" }],
    });
    const response = await handleRequest(request(submission), env, githubFetch);
    assert.equal(response.status, 409);
    assert.equal(calls.some((call) => call.url.endsWith("/issues")), false);
  });

  it("creates a review issue and hides the issue URL from the response", async () => {
    const { githubFetch, calls } = githubMock({ events: null });
    const response = await handleRequest(request(submission), env, githubFetch);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });

    const issueCall = calls.find((call) => call.url.endsWith("/issues"));
    const created = JSON.parse(issueCall.init.body);
    assert.equal(created.title, "Event: Local Gravel Fondo (2027-09-12)");
    assert.match(created.body, /public\/data\/events\/2027\.json/);
    assert.match(created.body, /"category": "Gravel"/);
    assert.deepEqual(created.labels, ["submission"]);
    assert.equal(issueCall.init.headers.get("Authorization"), "Bearer test-token");
  });

  it("reports that submissions are unavailable when the token is missing", async () => {
    const response = await handleRequest(request(submission), { ...env, GITHUB_TOKEN: "" });
    assert.equal(response.status, 503);
  });
});
