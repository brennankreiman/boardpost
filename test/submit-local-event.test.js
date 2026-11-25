import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../worker/index.js";

const env = {
  GITHUB_TOKEN: "test-token",
  GITHUB_OWNER: "brennankreiman",
  GITHUB_REPO: "boardpost",
  ALLOWED_ORIGINS: "http://localhost:3000,https://brennankreiman.github.io",
};

const localSubmission = {
  board: "local",
  name: "RiNo Shop Night",
  eventDate: "2027-05-02",
  registrationDeadline: "2027-04-20",
  cost: "Free",
  category: "Social Gathering",
  city: "Denver, CO",
  region: "   ",
  location: "RiNo",
  description: "  Bring a lock. ",
  moreInfoUrl: "",
};

const mainSubmission = {
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

function githubMock({ events = [], issueStatus = 201, file = "public/data/local/2027.json" } = {}) {
  const calls = [];
  const githubFetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith(`/contents/${file}`)) {
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

function issuePayload(calls) {
  const issueCall = calls.find((call) => String(call.url).endsWith("/issues") && call.init?.method === "POST");
  assert.ok(issueCall, "expected an issue request");
  const created = JSON.parse(issueCall.init.body);
  const fenced = created.body.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(fenced, "expected a JSON block in the issue body");
  return { created, record: JSON.parse(fenced[1]) };
}

describe("local submission worker", () => {
  it("files a local issue and omits a blank region and the board flag", async () => {
    const { githubFetch, calls } = githubMock({ events: null });
    const response = await handleRequest(request(localSubmission), env, githubFetch);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });

    assert.ok(calls.some((call) => call.url.endsWith("/contents/public/data/local/2027.json")));
    assert.equal(
      calls.some((call) => call.url.includes("/data/events/")),
      false
    );

    const { created, record } = issuePayload(calls);
    assert.equal(created.title, "Local event: RiNo Shop Night (2027-05-02)");
    assert.match(created.body, /public\/data\/local\/2027\.json/);
    assert.deepEqual(created.labels, ["submission"]);
    assert.equal(record.city, "Denver, CO");
    assert.equal(record.description, "Bring a lock.");
    assert.equal(record.region, undefined);
    assert.equal(record.board, undefined);
    assert.equal(record.source, "submission");
    assert.match(record.id, /^evt-[0-9a-f]{8}$/);
    assert.equal(JSON.stringify(created).includes("github.com"), false);
  });

  it("keeps a region on the stored object", async () => {
    const { githubFetch, calls } = githubMock({ events: [] });
    const response = await handleRequest(
      request({ ...localSubmission, region: "Bay Area", city: "Oakland, CA" }),
      env,
      githubFetch
    );
    assert.equal(response.status, 201);
    const { record } = issuePayload(calls);
    assert.equal(record.region, "Bay Area");
    assert.equal(record.city, "Oakland, CA");
    assert.equal(record.board, undefined);
  });

  it("rejects a region longer than 80 characters before reading GitHub", async () => {
    let called = false;
    const githubFetch = async () => {
      called = true;
      return new Response("no", { status: 500 });
    };
    const response = await handleRequest(
      request({ ...localSubmission, region: "r".repeat(81) }),
      env,
      githubFetch
    );
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /region/);
    assert.equal(called, false);
  });

  it("rejects a duplicate name and date in the local year file", async () => {
    const { githubFetch, calls } = githubMock({
      events: [{ id: "loc-9", name: "rino shop night", eventDate: "2027-05-02" }],
    });
    const response = await handleRequest(request(localSubmission), env, githubFetch);
    assert.equal(response.status, 409);
    assert.equal(
      calls.some((call) => call.url.endsWith("/issues")),
      false
    );
  });

  it("keeps any other board value on the main events path", async () => {
    const { githubFetch, calls } = githubMock({
      events: [],
      file: "public/data/events/2027.json",
    });
    const response = await handleRequest(request({ ...mainSubmission, board: "regional" }), env, githubFetch);
    assert.equal(response.status, 201);
    assert.ok(calls.some((call) => call.url.endsWith("/contents/public/data/events/2027.json")));
    assert.equal(
      calls.some((call) => call.url.includes("/data/local/")),
      false
    );
    const { created, record } = issuePayload(calls);
    assert.equal(created.title, "Event: Local Gravel Fondo (2027-09-12)");
    assert.match(created.body, /public\/data\/events\/2027\.json/);
    assert.equal(record.board, undefined);
  });
});
