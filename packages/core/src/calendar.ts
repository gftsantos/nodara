import { calendarRange, moveCalendarEvent, replaceCalendarEvent, resizeCalendarEvent } from "./calendar-model";
import { createController } from "./controller";
import { expandCalendarEvents } from "./recurrence";
import { isInteractionEnabled } from "./render-mode";
import { applyTheme } from "./theme";
import { DAY } from "./time-scale";
import type { CalendarEvent, CalendarEventChangeEvent, CalendarEventSelectEvent, CalendarOptions, NodaraController } from "./types";
import { createElement, empty, formatDate, resolveElement, toTimestamp } from "./utils";
import { normalizeCalendarEvents } from "./validation";

export function createCalendar(
  target: string | Element,
  options: CalendarOptions,
): NodaraController<CalendarEvent[], CalendarOptions> {
  const container = resolveElement(target);
  return createController(container, options.events, options, ({ container: root, data, options: currentOptions, emit, commit }) => {
    empty(root);
    root.className = `nd-root nd-calendar ${currentOptions.className ?? ""}`.trim();
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", currentOptions.ariaLabel ?? "Calendar");
    applyTheme(root, currentOptions.theme, currentOptions.tokens);
    const locale = currentOptions.locale ?? "en";
    const anchor = currentOptions.date === undefined ? Date.now() : toTimestamp(currentOptions.date);
    const view = currentOptions.view ?? "week";
    const range = calendarRange(anchor, view, currentOptions.weekStartsOn ?? 1);
    const expanded = currentOptions.expandRecurrence === false ? data : expandCalendarEvents(data, range.start, range.end, currentOptions.maxOccurrences ?? 500);
    const visibleResources = currentOptions.visibleResourceIds ? new Set(currentOptions.visibleResourceIds) : undefined;
    const visibleEvents = expanded.filter((event) => !visibleResources || !event.resourceId || visibleResources.has(event.resourceId));
    root.dataset.ndView = view;
    root.dataset.ndOccurrences = String(visibleEvents.length);

    const header = createElement("div", "nd-calendar__header");
    header.append(createElement("strong", "", formatDate(anchor, locale, { month: "long", year: "numeric", ...(currentOptions.timeZone ? { timeZone: currentOptions.timeZone } : {}) })));
    header.append(createElement("span", "", `${view} · ${visibleEvents.length} events`));
    root.append(header);

    const grid = createElement("div", `nd-calendar__grid nd-calendar__grid--${view}`);
    grid.style.setProperty("--nd-calendar-days", String(range.days.length));
    const resourceById = new Map((currentOptions.resources ?? []).map((resource) => [resource.id, resource]));
    const listeners: Array<() => void> = [];

    const selectEvent = (event: CalendarEvent, source: "pointer" | "keyboard") => {
      const payload = { event, source } satisfies CalendarEventSelectEvent;
      currentOptions.onEventSelect?.(payload);
      emit("event:select", payload);
    };
    const changeEvent = (previousEvent: CalendarEvent, event: CalendarEvent, change: "move" | "resize", source: "pointer" | "keyboard") => {
      const singleEvent: CalendarEvent = { ...event };
      delete singleEvent.recurrence;
      const next = { ...singleEvent, id: previousEvent.id.split("::")[0]! } satisfies CalendarEvent;
      const payload = { event: next, previousEvent, change, source } satisfies CalendarEventChangeEvent;
      currentOptions.onEventChange?.(payload);
      commit(replaceCalendarEvent(data, previousEvent.id, next), "event:change", payload);
    };

    range.days.forEach((dayStart) => {
      const dayEnd = dayStart + DAY;
      const day = createElement("div", "nd-calendar__day");
      day.dataset.date = new Date(dayStart).toISOString().slice(0, 10);
      if (new Date(dayStart).getMonth() !== new Date(anchor).getMonth() && view === "month") day.classList.add("nd-calendar__day--outside");
      const heading = createElement("div", "nd-calendar__day-head");
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: "short", ...(currentOptions.timeZone ? { timeZone: currentOptions.timeZone } : {}) };
      heading.append(createElement("span", "", formatDate(dayStart, locale, dateOptions)));
      heading.append(createElement("strong", "", formatDate(dayStart, locale, { day: "2-digit", ...(currentOptions.timeZone ? { timeZone: currentOptions.timeZone } : {}) })));
      day.append(heading);
      visibleEvents.filter((event) => {
        const start = toTimestamp(event.start);
        return start >= dayStart && start < dayEnd;
      }).forEach((event) => {
        const start = new Date(toTimestamp(event.start));
        const resource = event.resourceId ? resourceById.get(event.resourceId) : undefined;
        const eventButton = createElement("button", "nd-calendar__event");
        eventButton.type = "button";
        eventButton.dataset.eventId = event.id;
        eventButton.style.setProperty("--nd-event-color", event.color ?? resource?.color ?? "var(--nd-primary)");
        eventButton.disabled = event.disabled === true;
        eventButton.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
        eventButton.append(createElement("strong", "", event.title));
        const timeLabel = event.allDay ? "All day" : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", ...(currentOptions.timeZone ? { timeZone: currentOptions.timeZone } : {}) }).format(start);
        eventButton.append(createElement("small", "", resource ? `${timeLabel} · ${resource.label}` : timeLabel));
        eventButton.setAttribute("aria-label", `${event.title}, ${formatDate(start.getTime(), locale)}, ${timeLabel}${resource ? `, ${resource.label}` : ""}`);
        const onClick = () => { if (isInteractionEnabled(currentOptions.interactive, "pointer")) selectEvent(event, "pointer"); };
        const onKeyDown = (keyboardEvent: KeyboardEvent) => {
          if (!isInteractionEnabled(currentOptions.interactive, "keyboard") || event.disabled) return;
          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
            keyboardEvent.preventDefault();
            selectEvent(event, "keyboard");
          } else if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
            keyboardEvent.preventDefault();
            const delta = (keyboardEvent.key === "ArrowRight" ? 1 : -1) * DAY;
            changeEvent(event, keyboardEvent.shiftKey ? resizeCalendarEvent(event, delta) : moveCalendarEvent(event, delta), keyboardEvent.shiftKey ? "resize" : "move", "keyboard");
          }
        };
        const onPointerDown = (pointerEvent: PointerEvent) => {
          if (!isInteractionEnabled(currentOptions.interactive, "pointer") || event.disabled || pointerEvent.button !== 0) return;
          const origin = pointerEvent.clientX;
          const onPointerUp = (upEvent: PointerEvent) => {
            const width = Math.max(1, grid.getBoundingClientRect().width / Math.max(1, range.days.length));
            const dayDelta = Math.round((upEvent.clientX - origin) / width);
            if (dayDelta !== 0) changeEvent(event, moveCalendarEvent(event, dayDelta * DAY), "move", "pointer");
            document.removeEventListener("pointerup", onPointerUp);
          };
          document.addEventListener("pointerup", onPointerUp, { once: true });
          listeners.push(() => document.removeEventListener("pointerup", onPointerUp));
        };
        eventButton.addEventListener("click", onClick);
        eventButton.addEventListener("keydown", onKeyDown);
        eventButton.addEventListener("pointerdown", onPointerDown);
        listeners.push(() => {
          eventButton.removeEventListener("click", onClick);
          eventButton.removeEventListener("keydown", onKeyDown);
          eventButton.removeEventListener("pointerdown", onPointerDown);
        });
        day.append(eventButton);
      });
      grid.append(day);
    });
    root.append(grid);
    return () => listeners.forEach((listener) => listener());
  }, { normalize: normalizeCalendarEvents });
}
