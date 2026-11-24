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
const formError = document.getElementById("form-error");

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

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

async function loadCategories() {
  const res = await fetch("/api/categories");
  const categories = await res.json();

  for (const category of categories) {
    filterCategory.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    );
    formCategory.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    );
  }
}

function buildQuery() {
  const params = new URLSearchParams();
  if (filterQ.value.trim()) params.set("q", filterQ.value.trim());
  if (filterCategory.value && filterCategory.value !== "All") {
    params.set("category", filterCategory.value);
  }
  if (filterFrom.value) params.set("from", filterFrom.value);
  if (filterTo.value) params.set("to", filterTo.value);
  const qs = params.toString();
  return qs ? `/api/events?${qs}` : "/api/events";
}

function renderEvents(events) {
  if (!events.length) {
    resultCount.textContent = "No events match these filters.";
    board.innerHTML = `<div class="empty">Try clearing filters or post a new event.</div>`;
    return;
  }

  resultCount.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;

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

      return `
        <article class="event-row">
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
        </article>
      `;
    })
    .join("");
}

async function refreshBoard() {
  try {
    const res = await fetch(buildQuery());
    if (!res.ok) throw new Error("Failed to load events");
    const events = await res.json();
    renderEvents(events);
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

function clearFilters() {
  clearTimeout(debounceTimer);
  filterQ.value = "";
  filterCategory.value = "All";
  filterFrom.value = "";
  filterTo.value = "";
  refreshBoard();
}

document.getElementById("clear-filters").addEventListener("click", clearFilters);

function closeEventForm() {
  formError.hidden = true;
  form.reset();
  dialog.close();
}

openFormBtn.addEventListener("click", () => {
  formError.hidden = true;
  form.reset();
  dialog.showModal();
});

document.getElementById("close-form").addEventListener("click", closeEventForm);
document.getElementById("cancel-form").addEventListener("click", closeEventForm);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok) {
      formError.textContent = payload.error || "Could not save event.";
      formError.hidden = false;
      return;
    }

    closeEventForm();
    await refreshBoard();
  } catch (err) {
    console.error(err);
    formError.textContent = "Network error — try again.";
    formError.hidden = false;
  }
});

for (const el of [filterQ, filterCategory, filterFrom, filterTo]) {
  el.addEventListener("input", scheduleRefresh);
  el.addEventListener("change", scheduleRefresh);
}

await loadCategories();
await refreshBoard();
