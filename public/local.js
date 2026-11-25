import { eventIdFromSearch, searchWithEventId, usesDesktopDetail } from "./lib/event-detail.js";
import { filterEvents, todayISODate } from "./lib/filter-events.js";
import { citiesForRegion, filterByPlace, matchesLocalQuery, regionsFromEvents } from "./lib/filter-local.js";
import { listLocalCategories } from "./lib/local-categories.js";
import { selectYears } from "./lib/select-years.js";

const board = document.getElementById("board");
const resultCount = document.getElementById("result-count");
const filterQ = document.getElementById("filter-q");
const filterCategory = document.getElementById("filter-category");
const filterRegion = document.getElementById("filter-region");
const filterCity = document.getElementById("filter-city");
const filterFrom = document.getElementById("filter-from");
const filterTo = document.getElementById("filter-to");
const openFormBtn = document.getElementById("open-form");
const dialog = document.getElementById("event-dialog");
const form = document.getElementById("event-form");
const formCategory = document.getElementById("form-category");
const formNote = document.getElementById("form-note");
const regionSuggestions = document.getElementById("region-suggestions");
const submitBtn = form.querySelector("[type=submit]");
const detailDialog = document.getElementById("detail-dialog");
const detailTitle = document.getElementById("detail-title");
const detailBody = document.getElementById("detail-body");

const SUBMISSION_URL = "https://boardpost-submissions.brennankreiman.workers.dev";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

let loadedEvents = [];
let openId = eventIdFromSearch(window.location.search);
let suppressDetailClose = false;
let desktopDetail = usesDesktopDetail(window.innerWidth);

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

function daysUntil(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / 86400000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeHttpUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed;
}

function placeLine(event) {
  return event.region ? `${event.city} · ${event.region}` : event.city;
}

function fillSelect(select, values) {
  const current = select.value || "All";
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "All";
  all.textContent = "All";
  select.appendChild(all);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = values.includes(current) ? current : "All";
}

function loadCategories() {
  for (const category of listLocalCategories()) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filterCategory.appendChild(option);
    formCategory.appendChild(option.cloneNode(true));
  }
}

function syncRegionOptions() {
  fillSelect(filterRegion, regionsFromEvents(loadedEvents));
}

function syncCityOptions() {
  fillSelect(filterCity, citiesForRegion(loadedEvents, filterRegion.value));
}

function syncRegionSuggestions() {
  regionSuggestions.replaceChildren();
  for (const region of regionsFromEvents(loadedEvents)) {
    const option = document.createElement("option");
    option.value = region;
    regionSuggestions.appendChild(option);
  }
}

async function loadEvents() {
  const indexRes = await fetch("data/local/index.json");
  if (!indexRes.ok) throw new Error("Failed to load local event index");
  const index = await indexRes.json();
  const years = selectYears(index.years, {
    from: filterFrom.value,
    to: filterTo.value,
    today: todayISODate(),
  });

  const groups = await Promise.all(
    years.map(async (year) => {
      const res = await fetch(`data/local/${year}.json`);
      if (!res.ok) throw new Error(`Failed to load ${year} local events`);
      return res.json();
    })
  );

  return groups.flat();
}

function visibleEvents() {
  const dated = filterEvents(loadedEvents, {
    category: filterCategory.value,
    from: filterFrom.value,
    to: filterTo.value,
    today: todayISODate(),
  });
  const queried = dated.filter((event) => matchesLocalQuery(event, filterQ.value));
  return filterByPlace(queried, {
    region: filterRegion.value,
    city: filterCity.value,
  });
}

function detailActions(event, { includeRegister = true } = {}) {
  const actions = [];
  const register = safeHttpUrl(event.registrationUrl);
  const more = safeHttpUrl(event.moreInfoUrl);
  if (includeRegister && register) {
    actions.push(
      `<a class="btn btn-register" href="${escapeHtml(register)}" target="_blank" rel="noopener noreferrer">Register</a>`
    );
  }
  if (more) {
    actions.push(
      `<a class="btn btn-ghost" href="${escapeHtml(more)}" target="_blank" rel="noopener noreferrer">More info</a>`
    );
  }
  actions.push(`<button type="button" class="btn btn-ghost" data-close-detail>Close</button>`);
  return `<div class="detail-actions">${actions.join("")}</div>`;
}

function detailMarkup(event, { compact = false } = {}) {
  const description = event.description
    ? `<p class="detail-description">${escapeHtml(event.description)}</p>`
    : "";
  if (compact) {
    return `${description}${detailActions(event, { includeRegister: false })}`;
  }

  const deadlineDays = daysUntil(event.registrationDeadline);
  const deadlineWarn = deadlineDays >= 0 && deadlineDays <= 14;
  const location =
    event.location && event.location !== event.city
      ? `<p class="event-location">${escapeHtml(event.location)}</p>`
      : "";

  return `
    <p class="detail-kicker">${escapeHtml(placeLine(event))}</p>
    ${location}
    <div class="detail-facts">
      <div>
        <span class="meta-label">Event date</span>
        <div class="meta-value">${formatDate(event.eventDate)}</div>
      </div>
      <div class="${deadlineWarn ? "deadline warn" : "deadline"}">
        <span class="meta-label">Register by</span>
        <div class="meta-value">${formatDate(event.registrationDeadline)}</div>
      </div>
      <div>
        <span class="meta-label">Cost</span>
        <div class="meta-value">${escapeHtml(event.cost)}</div>
      </div>
      <div>
        <span class="meta-label">Category</span>
        <div class="meta-value">${escapeHtml(event.category)}</div>
      </div>
    </div>
    ${description}
    ${detailActions(event)}
  `;
}

function renderEvents(events) {
  if (!events.length) {
    resultCount.textContent = "No events match these filters.";
    board.innerHTML = `<div class="empty">Try clearing filters, or <button type="button" data-open-event-form>add a local event</button>.</div>`;
    return;
  }

  resultCount.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;

  board.innerHTML = events
    .map((event) => {
      const deadlineDays = daysUntil(event.registrationDeadline);
      const deadlineWarn = deadlineDays >= 0 && deadlineDays <= 14;
      const location =
        event.location && event.location !== event.city
          ? `<p class="event-location">${escapeHtml(event.location)}</p>`
          : "";
      const register = safeHttpUrl(event.registrationUrl);
      const registerBtn = register
        ? `<a class="btn btn-register" href="${escapeHtml(register)}" target="_blank" rel="noopener noreferrer">Register</a>`
        : "";

      return `
        <article class="event-row" data-event-id="${escapeHtml(event.id)}">
          <div class="event-main">
            <button type="button" class="event-name-btn">${escapeHtml(event.name)}</button>
            <p class="event-place">${escapeHtml(placeLine(event))}</p>
            ${location}
            <span class="category-pill" style="margin-top:0.55rem">${escapeHtml(event.category)}</span>
          </div>
          <div>
            <span class="meta-label">Event date</span>
            <div class="meta-value">${formatDate(event.eventDate)}</div>
          </div>
          <div class="${deadlineWarn ? "deadline warn" : "deadline"}">
            <span class="meta-label">Register by</span>
            <div class="meta-value">${formatDate(event.registrationDeadline)}</div>
          </div>
          <div>
            <span class="meta-label">Cost</span>
            <div class="meta-value">${escapeHtml(event.cost)}</div>
          </div>
          <div class="event-actions">
            ${registerBtn}
          </div>
        </article>
      `;
    })
    .join("");
}

function clearExpanded() {
  for (const row of board.querySelectorAll(".event-row")) {
    row.classList.remove("is-expanded");
    row.removeAttribute("aria-expanded");
    row.querySelector(".event-detail")?.remove();
  }
}

function closeDetailDialog() {
  if (!detailDialog.open) return;
  suppressDetailClose = true;
  try {
    detailDialog.close();
  } finally {
    suppressDetailClose = false;
  }
}

function writeEventUrl(id) {
  const currentId = eventIdFromSearch(window.location.search);
  const nextId = id == null || String(id).trim() === "" ? null : String(id);
  if (currentId === nextId) return;
  const nextSearch = searchWithEventId(window.location.search, nextId);
  const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  history.pushState({ eventId: nextId }, "", url);
}

function eventById(id) {
  return loadedEvents.find((event) => event.id === id) ?? null;
}

function applyDetail() {
  if (openId && !eventById(openId)) {
    openId = null;
    writeEventUrl(null);
  }

  const event = openId ? eventById(openId) : null;
  const desktop = usesDesktopDetail(window.innerWidth);

  if (!event) {
    closeDetailDialog();
    clearExpanded();
    return;
  }

  if (desktop) {
    clearExpanded();
    detailTitle.textContent = event.name;
    detailBody.innerHTML = detailMarkup(event);
    if (!detailDialog.open) detailDialog.showModal();
    return;
  }

  closeDetailDialog();
  clearExpanded();
  const row = [...board.querySelectorAll("[data-event-id]")].find((el) => el.dataset.eventId === event.id);
  if (!row) return;
  row.classList.add("is-expanded");
  row.setAttribute("aria-expanded", "true");
  const panel = document.createElement("div");
  panel.className = "event-detail";
  panel.innerHTML = detailMarkup(event, { compact: true });
  row.appendChild(panel);
}

function openDetail(id) {
  if (openId === id) {
    dismissDetail();
    return;
  }
  openId = id;
  applyDetail();
  writeEventUrl(id);
}

function dismissDetail() {
  openId = null;
  closeDetailDialog();
  clearExpanded();
  writeEventUrl(null);
}

async function refreshBoard() {
  try {
    loadedEvents = await loadEvents();
    syncRegionOptions();
    syncCityOptions();
    syncRegionSuggestions();
    renderEvents(visibleEvents());
    applyDetail();
  } catch (err) {
    console.error(err);
    resultCount.textContent = "Could not load events.";
    board.innerHTML = `<div class="error-state">Something went wrong loading the local board.</div>`;
  }
}

let debounceTimer;
function scheduleRefresh() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(refreshBoard, 180);
}

function defaultToDate(now = new Date()) {
  const twoYearsOut = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  return todayISODate(twoYearsOut);
}

function applyDefaultDateRange() {
  filterFrom.value = todayISODate();
  filterTo.value = defaultToDate();
}

function clearFilters() {
  clearTimeout(debounceTimer);
  filterQ.value = "";
  filterCategory.value = "All";
  filterRegion.value = "All";
  filterCity.value = "All";
  applyDefaultDateRange();
  refreshBoard();
}

document.getElementById("clear-filters").addEventListener("click", clearFilters);

function setFormNote(message, kind) {
  if (!message) {
    formNote.hidden = true;
    formNote.textContent = "";
    delete formNote.dataset.kind;
    return;
  }
  formNote.hidden = false;
  formNote.dataset.kind = kind;
  formNote.textContent = message;
}

function openEventForm() {
  form.reset();
  submitBtn.disabled = false;
  setFormNote("");
  dialog.showModal();
}

function closeEventForm() {
  dialog.close();
}

openFormBtn.addEventListener("click", openEventForm);
document.getElementById("close-form").addEventListener("click", closeEventForm);
document.getElementById("cancel-form").addEventListener("click", closeEventForm);

board.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-event-form]")) {
    openEventForm();
    return;
  }
  if (event.target.closest("[data-close-detail]")) {
    dismissDetail();
    return;
  }
  if (event.target.closest("a")) return;
  if (event.target.closest(".event-detail")) return;
  const row = event.target.closest("[data-event-id]");
  if (!row) return;
  openDetail(row.dataset.eventId);
});

document.getElementById("close-detail").addEventListener("click", dismissDetail);
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog || event.target.closest("[data-close-detail]")) dismissDetail();
});
detailDialog.addEventListener("close", () => {
  if (suppressDetailClose) return;
  openId = null;
  clearExpanded();
  writeEventUrl(null);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormNote("");

  if (!SUBMISSION_URL) {
    setFormNote("Submissions aren't connected yet.", "error");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  data.board = "local";
  submitBtn.disabled = true;
  try {
    const res = await fetch(SUBMISSION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormNote(payload.error || "Could not submit the event. Try again.", "error");
      return;
    }
    form.reset();
    setFormNote("Submitted for review. It will show here after it's approved.", "ok");
  } catch (err) {
    console.error(err);
    setFormNote("Could not submit the event. Try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

for (const el of [filterQ, filterCategory, filterFrom, filterTo, filterCity]) {
  el.addEventListener("input", scheduleRefresh);
  el.addEventListener("change", scheduleRefresh);
}

filterRegion.addEventListener("change", () => {
  syncCityOptions();
  scheduleRefresh();
});

window.addEventListener("resize", () => {
  const next = usesDesktopDetail(window.innerWidth);
  if (next === desktopDetail) return;
  desktopDetail = next;
  applyDetail();
});

window.addEventListener("popstate", () => {
  openId = eventIdFromSearch(window.location.search);
  applyDetail();
});

loadCategories();
applyDefaultDateRange();
await refreshBoard();
