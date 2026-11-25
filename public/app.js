import { filterEvents, todayISODate } from "./lib/filter-events.js";
import { listCategories } from "./lib/categories.js";
import { selectYears } from "./lib/select-years.js";
import { eventIdFromSearch, searchWithEventId, usesDesktopDetail } from "./lib/event-detail.js";

const board = document.getElementById("board");
const resultCount = document.getElementById("result-count");
const filterQ = document.getElementById("filter-q");
const filterCategory = document.getElementById("filter-category");
const filterFrom = document.getElementById("filter-from");
const filterTo = document.getElementById("filter-to");
const openFormBtn = document.getElementById("open-form");
const dialog = document.getElementById("event-dialog");
const form = document.getElementById("event-form");
const formCategory = document.getElementById("form-category");
const formNote = document.getElementById("form-note");
const submitBtn = form.querySelector("[type=submit]");
const detailDialog = document.getElementById("detail-dialog");
const detailClose = document.getElementById("detail-close");
const detailCategory = document.getElementById("detail-category");
const detailTitle = document.getElementById("detail-title");
const detailLocation = document.getElementById("detail-location");
const detailEventDate = document.getElementById("detail-event-date");
const detailDeadlineWrap = document.getElementById("detail-deadline-wrap");
const detailDeadline = document.getElementById("detail-deadline");
const detailCost = document.getElementById("detail-cost");
const detailDescription = document.getElementById("detail-description");
const detailMore = document.getElementById("detail-more");
const detailRegister = document.getElementById("detail-register");

const SUBMISSION_URL = "https://boardpost-submissions.brennankreiman.workers.dev";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

let fetchedEvents = [];
let visibleEvents = [];
let openEventId = eventIdFromSearch(window.location.search);
let detailDesktop = usesDesktopDetail(window.innerWidth);
let ignoreDetailClose = false;

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

function httpUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function loadCategories() {
  for (const category of listCategories()) {
    const option = `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
    filterCategory.insertAdjacentHTML("beforeend", option);
    formCategory.insertAdjacentHTML("beforeend", option);
  }
}

async function loadEvents() {
  const indexRes = await fetch("data/events/index.json");
  if (!indexRes.ok) throw new Error("Failed to load event index");
  const index = await indexRes.json();
  const years = selectYears(index.years, {
    from: filterFrom.value,
    to: filterTo.value,
    today: todayISODate(),
  });

  const groups = await Promise.all(
    years.map(async (year) => {
      const res = await fetch(`data/events/${year}.json`);
      if (!res.ok) throw new Error(`Failed to load ${year} events`);
      return res.json();
    })
  );

  return groups.flat();
}

function findFetchedEvent(id) {
  return fetchedEvents.find((event) => event.id === id) ?? null;
}

function deadlineClass(iso) {
  const days = daysUntil(iso);
  return days >= 0 && days <= 14 ? "deadline warn" : "deadline";
}

function linkHtml(url, className, label) {
  const href = httpUrl(url);
  if (!href) return "";
  return `<a class="${className}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function detailBlock(event) {
  const location = event.location
    ? `<p class="detail-location">${escapeHtml(event.location)}</p>`
    : "";
  const description = event.description
    ? `<p class="detail-copy">${escapeHtml(event.description)}</p>`
    : "";
  const more = linkHtml(event.moreInfoUrl, "btn btn-ghost", "More info");
  const register = linkHtml(event.registrationUrl, "btn btn-register", "Register");

  return `
    <div class="event-detail">
      ${location}
      <div class="detail-facts">
        <div>
          <span class="meta-label">Event date</span>
          <div class="meta-value">${formatDate(event.eventDate)}</div>
        </div>
        <div class="${deadlineClass(event.registrationDeadline)}">
          <span class="meta-label">Register by</span>
          <div class="meta-value">${formatDate(event.registrationDeadline)}</div>
        </div>
        <div>
          <span class="meta-label">Cost</span>
          <div class="meta-value">${escapeHtml(event.cost)}</div>
        </div>
      </div>
      ${description}
      <div class="detail-actions">
        ${more}
        ${register}
        <button type="button" class="btn btn-ghost detail-dismiss">Close</button>
      </div>
    </div>
  `;
}

function renderEvents(events) {
  visibleEvents = events;
  if (!events.length) {
    resultCount.textContent = "No events match these filters.";
    board.innerHTML = `<div class="empty">Try clearing filters, or <button type="button" data-open-event-form>add an event</button>.</div>`;
    return;
  }

  resultCount.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;
  const desktop = usesDesktopDetail(window.innerWidth);

  board.innerHTML = events
    .map((event) => {
      const deadlineDays = daysUntil(event.registrationDeadline);
      const deadlineWarn = deadlineDays >= 0 && deadlineDays <= 14;
      const location = event.location
        ? `<p class="event-location">${escapeHtml(event.location)}</p>`
        : "";
      const registerBtn = event.registrationUrl
        ? `<a class="btn btn-register" href="${escapeHtml(event.registrationUrl)}" target="_blank" rel="noopener noreferrer">Register</a>`
        : "";
      const expanded = !desktop && event.id === openEventId;
      const expandedAttr = desktop ? "" : ` aria-expanded="${expanded ? "true" : "false"}"`;

      return `
        <article class="event-row${expanded ? " is-expanded" : ""}" data-event-id="${escapeHtml(event.id)}"${expandedAttr}>
          <div class="event-main">
            <p class="event-name">${escapeHtml(event.name)}</p>
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
          ${expanded ? detailBlock(event) : ""}
        </article>
      `;
    })
    .join("");
}

function setExternalLink(anchor, url) {
  const href = httpUrl(url);
  if (!href) {
    anchor.hidden = true;
    anchor.removeAttribute("href");
    return;
  }
  anchor.hidden = false;
  anchor.href = href;
}

function populateDetail(event) {
  detailDialog.dataset.eventId = event.id;
  detailCategory.textContent = event.category;
  detailTitle.textContent = event.name;
  detailLocation.hidden = !event.location;
  detailLocation.textContent = event.location || "";
  detailEventDate.textContent = formatDate(event.eventDate);
  detailDeadline.textContent = formatDate(event.registrationDeadline);
  detailDeadlineWrap.className = deadlineClass(event.registrationDeadline);
  detailCost.textContent = event.cost;
  detailDescription.hidden = !event.description;
  detailDescription.textContent = event.description || "";
  setExternalLink(detailMore, event.moreInfoUrl);
  setExternalLink(detailRegister, event.registrationUrl);
  detailMore.parentElement.hidden = detailMore.hidden && detailRegister.hidden;
}

function syncEventQuery() {
  const next = searchWithEventId(window.location.search, openEventId);
  if (next === window.location.search) return;
  history.replaceState(null, "", `${window.location.pathname}${next}${window.location.hash}`);
}

function revealExpandedRow() {
  if (usesDesktopDetail(window.innerWidth)) return;
  board.querySelector(".event-row.is-expanded")?.scrollIntoView({ block: "nearest" });
}

function syncDetailTreatment() {
  const event = openEventId ? findFetchedEvent(openEventId) : null;
  if (event && usesDesktopDetail(window.innerWidth)) {
    populateDetail(event);
    if (!detailDialog.open) {
      detailDialog.showModal();
    }
    return;
  }

  if (detailDialog.open) {
    ignoreDetailClose = true;
    detailDialog.close();
    ignoreDetailClose = false;
  }
}

function openDetail(id) {
  if (!id || id === openEventId) return;
  if (!findFetchedEvent(id)) return;
  openEventId = id;
  syncEventQuery();
  renderEvents(visibleEvents);
  syncDetailTreatment();
  revealExpandedRow();
}

function dismissDetail() {
  if (!openEventId && !detailDialog.open) return;
  openEventId = null;
  syncEventQuery();
  delete detailDialog.dataset.eventId;
  renderEvents(visibleEvents);
  if (detailDialog.open) {
    ignoreDetailClose = true;
    detailDialog.close();
    ignoreDetailClose = false;
  }
}

async function refreshBoard() {
  try {
    fetchedEvents = await loadEvents();
    const events = filterEvents(fetchedEvents, {
      category: filterCategory.value,
      q: filterQ.value.trim(),
      from: filterFrom.value,
      to: filterTo.value,
      today: todayISODate(),
    });
    renderEvents(events);
    syncDetailTreatment();
  } catch (err) {
    console.error(err);
    resultCount.textContent = "Could not load events.";
    board.innerHTML = `<div class="error-state">Something went wrong loading the board.</div>`;
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
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  if (!target) return;
  if (target.closest("[data-open-event-form]")) {
    openEventForm();
    return;
  }
  if (target.closest(".detail-dismiss")) {
    dismissDetail();
    return;
  }
  if (target.closest("a")) return;
  const row = target.closest(".event-row");
  if (!row) return;
  openDetail(row.dataset.eventId);
});

detailClose.addEventListener("click", () => {
  detailDialog.close();
});

detailDialog.addEventListener("close", () => {
  if (ignoreDetailClose) return;
  openEventId = null;
  syncEventQuery();
  delete detailDialog.dataset.eventId;
  renderEvents(visibleEvents);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !openEventId) return;
  if (detailDialog.open || dialog.open) return;
  if (event.target.closest("input, textarea, select")) return;
  event.preventDefault();
  dismissDetail();
});

let viewportTicket = 0;
function onViewportChange() {
  const ticket = ++viewportTicket;
  requestAnimationFrame(() => {
    if (ticket !== viewportTicket) return;
    const desktop = usesDesktopDetail(window.innerWidth);
    if (desktop === detailDesktop) return;
    detailDesktop = desktop;
    if (!openEventId) return;
    renderEvents(visibleEvents);
    syncDetailTreatment();
    if (!desktop) revealExpandedRow();
  });
}

window.matchMedia("(min-width: 768px)").addEventListener("change", onViewportChange);
window.addEventListener("resize", onViewportChange);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormNote("");

  if (!SUBMISSION_URL) {
    setFormNote("Submissions aren't connected yet.", "error");
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
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
    setFormNote("Submitted for review. It will show on the board after it's approved.", "ok");
  } catch (err) {
    console.error(err);
    setFormNote("Could not submit the event. Try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

for (const el of [filterQ, filterCategory, filterFrom, filterTo]) {
  el.addEventListener("input", scheduleRefresh);
  el.addEventListener("change", scheduleRefresh);
}

loadCategories();
applyDefaultDateRange();
await refreshBoard();
revealExpandedRow();
