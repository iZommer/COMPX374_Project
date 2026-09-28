import QRCode from "qrcode";
import { layoutWeekEvents } from "../shared/calendar-layout.js";
import { createVCard, hasContactDetails } from "../shared/vcard.js";
import type { DiaryPayload } from "../shared/payload.js";
import type { DisplayState, PublicSettings } from "../shared/state.js";
import "./styles.css";

const $ = <T extends HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const screens = {
  loading: $("#loading-screen"),
  setup: $("#setup-screen"),
  waiting: $("#waiting-screen"),
  display: $("#display-shell"),
};
const views = ["status", "calendar", "contact"] as const;
type ViewName = (typeof views)[number];
let currentView: ViewName = "status";
let state: DisplayState | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let lastPayloadSignature = "";
let touchStartX = 0;
let allowViewSwipe = true;
const calendarMinZoom = 0.75;
const calendarMaxZoom = 2.5;
let calendarZoom = 1;
const calendarPointers = new Map<number, { x: number; y: number }>();

function applyCalendarZoom(
  requestedScale = calendarZoom,
  anchorBefore?: { x: number; y: number },
  anchorAfter = anchorBefore,
): void {
  const grid = $("#calendar-grid");
  const previousScale = calendarZoom;
  const scale = Math.max(calendarMinZoom, Math.min(calendarMaxZoom, requestedScale));
  const fallbackAnchor = { x: grid.clientWidth / 2, y: grid.clientHeight / 2 };
  const before = anchorBefore ?? fallbackAnchor;
  const after = anchorAfter ?? fallbackAnchor;
  const logicalX = (grid.scrollLeft + before.x) / previousScale;
  const logicalY = (grid.scrollTop + before.y) / previousScale;
  calendarZoom = scale;
  grid.style.setProperty("--calendar-day-width", `${Math.round(120 * scale)}px`);
  grid.style.setProperty("--calendar-hour-height", `${Math.round(32 * scale)}px`);
  $("#calendar-zoom-value").textContent = `${Math.round(scale * 100)}%`;
  ($("#calendar-zoom-out") as HTMLButtonElement).disabled = scale <= calendarMinZoom;
  ($("#calendar-zoom-in") as HTMLButtonElement).disabled = scale >= calendarMaxZoom;
  // Force the resized grid to be measured before restoring the point under the fingers.
  void grid.scrollWidth;
  grid.scrollLeft = logicalX * scale - after.x;
  grid.scrollTop = logicalY * scale - after.y;
}

function wireCalendarGestures(): void {
  const grid = $("#calendar-grid");
  grid.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    grid.setPointerCapture(event.pointerId);
    calendarPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    resetIdleTimer();
  });
  grid.addEventListener("pointermove", (event) => {
    const previous = calendarPointers.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    if (calendarPointers.size === 1) {
      grid.scrollLeft -= event.clientX - previous.x;
      grid.scrollTop -= event.clientY - previous.y;
      calendarPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      return;
    }

    const beforePoints = [...calendarPointers.values()].slice(0, 2);
    calendarPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const afterPoints = [...calendarPointers.values()].slice(0, 2);
    const distance = (points: { x: number; y: number }[]) =>
      Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    const midpoint = (points: { x: number; y: number }[]) => ({
      x: (points[0].x + points[1].x) / 2 - grid.getBoundingClientRect().left,
      y: (points[0].y + points[1].y) / 2 - grid.getBoundingClientRect().top,
    });
    const beforeDistance = distance(beforePoints);
    if (beforeDistance > 0) {
      applyCalendarZoom(
        calendarZoom * (distance(afterPoints) / beforeDistance),
        midpoint(beforePoints),
        midpoint(afterPoints),
      );
    }
  });
  const endGesture = (event: PointerEvent) => {
    calendarPointers.delete(event.pointerId);
    if (grid.hasPointerCapture(event.pointerId)) grid.releasePointerCapture(event.pointerId);
  };
  grid.addEventListener("pointerup", endGesture);
  grid.addEventListener("pointercancel", endGesture);
}

function showScreen(name: keyof typeof screens): void {
  for (const [key, element] of Object.entries(screens)) element.hidden = key !== name;
}

function formatTime(value: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function applySettings(settings: PublicSettings): void {
  document.documentElement.dataset.textScale = settings.textScale;
  document.documentElement.classList.toggle("high-contrast", settings.highContrast);
  $("#text-scale").setAttribute("value", settings.textScale);
  ($("#text-scale") as HTMLSelectElement).value = settings.textScale;
  ($("#high-contrast") as HTMLInputElement).checked = settings.highContrast;
  ($("#pixel-shift") as HTMLInputElement).checked = settings.pixelShiftEnabled;
  ($("#idle-seconds") as HTMLInputElement).value = String(settings.idleReturnSeconds);
  updateDimming(settings);
}

function updateDimming(settings: PublicSettings): void {
  if (settings.dimStartHour === null || settings.dimEndHour === null) {
    document.documentElement.classList.remove("dimmed");
    return;
  }
  const hour = Number(
    new Intl.DateTimeFormat("en-NZ", {
      timeZone: settings.timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const overnight = settings.dimStartHour > settings.dimEndHour;
  const dim = overnight
    ? hour >= settings.dimStartHour || hour < settings.dimEndHour
    : hour >= settings.dimStartHour && hour < settings.dimEndHour;
  document.documentElement.classList.toggle("dimmed", dim);
}

function showView(name: ViewName): void {
  currentView = name;
  for (const view of views) {
    const selected = view === name;
    $(`#${view}-view`).hidden = !selected;
    $(`#${view}-view`).classList.toggle("active", selected);
    const tab = $(`#${view}-tab`);
    tab.classList.toggle("active", selected);
    if (selected) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  resetIdleTimer();
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (!state || currentView === "status") return;
  idleTimer = setTimeout(() => showView("status"), state.settings.idleReturnSeconds * 1000);
}

const statusPresentation = {
  AVAILABLE: { label: "Available", icon: "✓", className: "available" },
  IN_A_MEETING: { label: "In a meeting", icon: "◆", className: "meeting" },
  TEACHING: { label: "Teaching", icon: "▲", className: "teaching" },
  OUT_OF_OFFICE: { label: "Out of office", icon: "—", className: "away" },
} as const;

function renderStatus(payload: DiaryPayload, settings: PublicSettings): void {
  const availability = payload.availability;
  const presentation = availability
    ? statusPresentation[availability.status]
    : { label: "Status unavailable", icon: "?", className: "unknown" };
  const card = $("#status-card");
  card.className = `status-card status-${presentation.className}`;
  $("#status-icon").textContent = presentation.icon;
  $("#status-label").textContent = presentation.label;
  $("#return-time").textContent = availability?.expectedReturnTime
    ? `Expected back ${formatDate(availability.expectedReturnTime, settings.timezone)} at ${formatTime(availability.expectedReturnTime, settings.timezone)}`
    : "";
  $("#custom-message").textContent = availability?.customMessage || "";
}

function renderCalendar(payload: DiaryPayload, settings: PublicSettings): void {
  const grid = $("#calendar-grid");
  grid.replaceChildren();
  const empty = $("#empty-calendar");
  empty.hidden = payload.calendar.length > 0;
  grid.hidden = payload.calendar.length === 0;
  if (!payload.week || payload.calendar.length === 0) return;

  const days = 7;
  const segments = layoutWeekEvents(payload.calendar, payload.week.start, settings.timezone, days);
  const startHour = Math.max(0, Math.min(8, ...segments.map((item) => Math.floor(item.startMinute / 60))));
  const endHour = Math.min(24, Math.max(18, ...segments.map((item) => Math.ceil(item.endMinute / 60))));
  const startMinute = startHour * 60;
  const visibleMinutes = (endHour - startHour) * 60;
  grid.dataset.startMinute = String(startMinute);
  grid.dataset.endMinute = String(endHour * 60);
  grid.style.setProperty("--calendar-hours", String(endHour - startHour));
  grid.style.setProperty("--calendar-days", String(days));

  const corner = document.createElement("div");
  corner.className = "calendar-corner";
  grid.append(corner);
  const dayColumns: HTMLElement[] = [];
  for (let day = 0; day < days; day += 1) {
    const date = new Date(Date.parse(payload.week.start) + day * 86_400_000);
    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = formatDate(date, settings.timezone);
    if (formatDate(date, settings.timezone) === formatDate(new Date(), settings.timezone))
      header.classList.add("today");
    grid.append(header);
  }
  for (let hour = startHour; hour <= endHour; hour += 1) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.gridRow = `${hour - startHour + 2}`;
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    grid.append(label);
  }
  for (let day = 0; day < days; day += 1) {
    const column = document.createElement("div");
    column.className = "day-column";
    column.style.gridColumn = `${day + 2}`;
    grid.append(column);
    dayColumns.push(column);
  }

  for (const segment of segments) {
    const clippedStart = Math.max(startMinute, segment.startMinute);
    const clippedEnd = Math.min(endHour * 60, segment.endMinute);
    if (clippedEnd <= clippedStart) continue;
    const event = document.createElement("article");
    event.className = "calendar-event";
    event.style.setProperty("--top", `${((clippedStart - startMinute) / visibleMinutes) * 100}%`);
    event.style.setProperty("--height", `${Math.max(3, ((clippedEnd - clippedStart) / visibleMinutes) * 100)}%`);
    event.style.setProperty("--column", String(segment.column));
    event.style.setProperty("--columns", String(segment.columnCount));
    const title = document.createElement("strong");
    title.textContent = eventTitle(segment.event.title, segment.continuesBefore, segment.continuesAfter);
    const time = document.createElement("span");
    time.textContent = `${formatTime(segment.event.startTime, settings.timezone)}–${formatTime(segment.event.endTime, settings.timezone)}`;
    event.append(title, time);
    dayColumns[segment.dayIndex].append(event);
  }
  updateCalendarNowLine(settings);
  $("#calendar-range").textContent = `${formatDate(payload.week.start, settings.timezone)} – ${formatDate(new Date(Date.parse(payload.week.end) - 1), settings.timezone)}`;
}

function updateCalendarNowLine(settings: PublicSettings): void {
  const grid = $("#calendar-grid");
  grid.querySelectorAll(".now-line").forEach((line) => line.remove());
  if (state?.clockWarning || grid.hidden) return;
  const startMinute = Number(grid.dataset.startMinute);
  const endMinute = Number(grid.dataset.endMinute);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) return;
  const now = new Date();
  const todayLabel = formatDate(now, settings.timezone);
  const todayIndex = Array.from(grid.querySelectorAll<HTMLElement>(".day-header"))
    .findIndex((header) => header.textContent === todayLabel);
  const localTime = new Intl.DateTimeFormat("en-NZ", {
    timeZone: settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(localTime.map((part) => [part.type, part.value]));
  const nowMinute = Number(values.hour) * 60 + Number(values.minute);
  if (todayIndex < 0 || nowMinute < startMinute || nowMinute > endMinute) return;
  const line = document.createElement("div");
  line.className = "now-line";
  line.setAttribute("aria-label", "Current time");
  line.style.top = `${((nowMinute - startMinute) / (endMinute - startMinute)) * 100}%`;
  grid.querySelectorAll<HTMLElement>(".day-column")[todayIndex]?.append(line);
}

function eventTitle(title: string, before: boolean, after: boolean): string {
  return `${before ? "← " : ""}${title}${after ? " →" : ""}`;
}

async function renderContact(payload: DiaryPayload): Promise<void> {
  const contact = payload.contact;
  const fields = [
    ["email", contact?.email],
    ["phone", contact?.phone],
    ["office", contact?.officeLocation],
  ] as const;
  for (const [name, value] of fields) {
    $(`#${name}-row`).hidden = !value?.trim();
    $(`#contact-${name}`).textContent = value?.trim() || "";
  }
  const present = hasContactDetails(contact);
  $("#qr-panel").hidden = !present;
  $("#no-contact").hidden = present;
  if (present && contact) {
    await QRCode.toCanvas(
      $("#contact-qr") as HTMLCanvasElement,
      createVCard(payload.academic.name, contact),
      { width: 320, margin: 4, errorCorrectionLevel: "M", color: { dark: "#07131f", light: "#ffffff" } },
    );
  }
}

async function render(next: DisplayState): Promise<void> {
  state = next;
  applySettings(next.settings);
  if (next.phase === "setup") {
    showScreen("setup");
    ($("#server-url") as HTMLInputElement).value ||= next.setupDefaultUrl || "";
    if (next.connection === "invalid-key")
      $("#setup-error").textContent = "The saved display key is invalid or has been revoked. Pair again.";
    return;
  }
  if (next.phase === "waiting" || !next.payload) {
    showScreen("waiting");
    return;
  }
  showScreen("display");
  $("#academic-name").textContent = next.payload.academic.name;
  $("#clock-banner").hidden = !next.clockWarning;
  const warning = $("#warning-banner");
  if (next.staleness === "fresh") warning.hidden = true;
  else {
    warning.hidden = false;
    warning.classList.toggle("warning-strong", next.staleness === "stale");
    warning.textContent = next.staleness === "stale"
      ? `This information may be significantly out of date — last updated ${next.lastSuccessAt ? formatDate(next.lastSuccessAt, next.settings.timezone) + " at " + formatTime(next.lastSuccessAt, next.settings.timezone) : "unknown"}.`
      : `Information may be out of date — last updated ${next.lastSuccessAt ? formatTime(next.lastSuccessAt, next.settings.timezone) : "unknown"}.`;
  }
  const { generatedAt: _transportTimestamp, ...displayData } = next.payload;
  const signature = JSON.stringify(displayData);
  if (signature !== lastPayloadSignature) {
    lastPayloadSignature = signature;
    renderStatus(next.payload, next.settings);
    renderCalendar(next.payload, next.settings);
    await renderContact(next.payload);
  }
}

async function loadState(): Promise<void> {
  const response = await fetch("/local/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Local server unavailable");
  await render((await response.json()) as DisplayState);
}

function connectEvents(): void {
  const events = new EventSource("/local/events");
  events.addEventListener("state", (event) => {
    void render(JSON.parse((event as MessageEvent<string>).data) as DisplayState);
  });
}

function wireInteractions(): void {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((button) =>
    button.addEventListener("click", () => showView(button.dataset.view as ViewName)),
  );
  $("#views").addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
    allowViewSwipe = !event.composedPath().some(
      (target) => target instanceof Element && target.classList.contains("calendar-grid"),
    );
    resetIdleTimer();
  }, { passive: true });
  $("#views").addEventListener("touchend", (event) => {
    if (!allowViewSwipe) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 60) return;
    const index = views.indexOf(currentView);
    showView(views[Math.max(0, Math.min(views.length - 1, index + (distance < 0 ? 1 : -1)))]);
  }, { passive: true });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dragstart", (event) => event.preventDefault());
  $("#calendar-zoom-out").addEventListener("click", () => {
    applyCalendarZoom(calendarZoom - .25);
    resetIdleTimer();
  });
  $("#calendar-zoom-in").addEventListener("click", () => {
    applyCalendarZoom(calendarZoom + .25);
    resetIdleTimer();
  });
  wireCalendarGestures();

  $("#setup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#pair-button") as HTMLButtonElement;
    const error = $("#setup-error");
    button.disabled = true;
    button.textContent = "Checking…";
    error.textContent = "";
    const apiInput = $("#api-key") as HTMLInputElement;
    try {
      const response = await fetch("/local/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serverUrl: ($("#server-url") as HTMLInputElement).value,
          apiKey: apiInput.value,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Pairing failed.");
      apiInput.value = "";
      await loadState();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "Pairing failed.";
    } finally {
      button.disabled = false;
      button.textContent = "Validate and pair";
    }
  });

  const dialog = $("#settings-dialog") as HTMLDialogElement;
  let hold: ReturnType<typeof setTimeout> | null = null;
  const cancelHold = () => { if (hold) clearTimeout(hold); hold = null; };
  $("#admin-hotspot").addEventListener("pointerdown", () => {
    hold = setTimeout(() => dialog.showModal(), 5000);
  });
  $("#admin-hotspot").addEventListener("pointerup", cancelHold);
  $("#admin-hotspot").addEventListener("pointerleave", cancelHold);
  $("#admin-hotspot").addEventListener("pointercancel", cancelHold);

  $("#save-settings").addEventListener("click", async () => {
    const response = await fetch("/local/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        textScale: ($("#text-scale") as HTMLSelectElement).value,
        highContrast: ($("#high-contrast") as HTMLInputElement).checked,
        pixelShiftEnabled: ($("#pixel-shift") as HTMLInputElement).checked,
        idleReturnSeconds: Number(($("#idle-seconds") as HTMLInputElement).value),
      }),
    });
    if (response.ok) dialog.close();
  });
  $("#reset-pairing").addEventListener("click", async () => {
    if (!confirm("Clear the display pairing and return to setup?")) return;
    await fetch("/local/reset", { method: "POST" });
    dialog.close();
    await loadState();
  });
}

function updateClock(): void {
  if (!state) return;
  $("#header-time").textContent = new Intl.DateTimeFormat("en-NZ", {
    timeZone: state.settings.timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
  updateCalendarNowLine(state.settings);
  updateDimming(state.settings);
}

function startPixelShift(): void {
  let step = 0;
  setInterval(() => {
    if (!state?.settings.pixelShiftEnabled) {
      document.documentElement.style.setProperty("--shift-x", "0px");
      document.documentElement.style.setProperty("--shift-y", "0px");
      return;
    }
    const positions = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
    const [x, y] = positions[step++ % positions.length];
    document.documentElement.style.setProperty("--shift-x", `${x}px`);
    document.documentElement.style.setProperty("--shift-y", `${y}px`);
  }, 60_000);
}

wireInteractions();
applyCalendarZoom();
void loadState().then(connectEvents).catch(() => showScreen("waiting"));
updateClock();
setInterval(updateClock, 30_000);
startPixelShift();
