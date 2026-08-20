import { createController } from "./controller";
import { applyTheme } from "./theme";
import type { CalendarEvent, CalendarEventSelectEvent, CalendarOptions, NodaraController } from "./types";
import { createElement, empty, formatDate, resolveElement, toTimestamp } from "./utils";
import { normalizeCalendarEvents } from "./validation";

const DAY = 86_400_000;

function startOfWeek(input: number, weekStartsOn: 0 | 1): number {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return date.getTime() - offset * DAY;
}

export function createCalendar(
  target: string | Element,
  options: CalendarOptions,
): NodaraController<CalendarEvent[]> {
  const container = resolveElement(target);
  const controller = createController(container, normalizeCalendarEvents(options.events), ({ container: root, data, emit }) => {
    empty(root);
    root.className = `nd-root nd-calendar ${options.className ?? ""}`.trim();
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", options.ariaLabel ?? "Calendar");
    applyTheme(root, options.theme, options.tokens);

    const locale = options.locale ?? "en";
    const anchor = options.date === undefined ? Date.now() : toTimestamp(options.date);
    const weekStart = startOfWeek(anchor, options.weekStartsOn ?? 1);
    const days = options.view === "day" ? 1 : options.view === "month" ? 35 : 7;
    const header = createElement("div", "nd-calendar__header");
    header.append(createElement("strong", "", formatDate(anchor, locale, { month: "long", year: "numeric" })));
    header.append(createElement("span", "", options.view ?? "week"));
    root.append(header);

    const grid = createElement("div", `nd-calendar__grid nd-calendar__grid--${options.view ?? "week"}`);
    grid.style.setProperty("--nd-calendar-days", String(days));
    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const dayStart = weekStart + dayIndex * DAY;
      const dayEnd = dayStart + DAY;
      const day = createElement("div", "nd-calendar__day");
      const heading = createElement("div", "nd-calendar__day-head");
      heading.append(createElement("span", "", formatDate(dayStart, locale, { weekday: "short" })));
      heading.append(createElement("strong", "", formatDate(dayStart, locale, { day: "2-digit" })));
      day.append(heading);
      data.filter((event) => {
        const start = toTimestamp(event.start);
        return start >= dayStart && start < dayEnd;
      }).forEach((event) => {
        const start = new Date(toTimestamp(event.start));
        const eventButton = createElement("button", "nd-calendar__event");
        eventButton.type = "button";
        eventButton.style.setProperty("--nd-event-color", event.color ?? "var(--nd-primary)");
        eventButton.append(createElement("strong", "", event.title));
        eventButton.append(createElement("small", "", event.allDay ? "All day" : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(start)));
        eventButton.setAttribute("aria-label", `${event.title}, ${formatDate(start.getTime(), locale)}, ${event.allDay ? "all day" : start.toLocaleTimeString(locale)}`);
        eventButton.addEventListener("click", () => emit("event:select", { event, source: "pointer" } satisfies CalendarEventSelectEvent));
        day.append(eventButton);
      });
      grid.append(day);
    }
    root.append(grid);
  });

  if (options.onEventSelect) controller.on<CalendarEventSelectEvent>("event:select", options.onEventSelect);
  return controller;
}
