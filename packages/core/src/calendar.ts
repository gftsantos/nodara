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

    if (view === "year") {
      const year = createElement("div", "nd-calendar__year");
      for (let month = 0; month < 12; month += 1) {
        const monthStart = new Date(new Date(anchor).getFullYear(), month, 1).getTime();
        const monthEnd = new Date(new Date(anchor).getFullYear(), month + 1, 1).getTime();
        const monthEvents = visibleEvents.filter((event) => {
          const start = toTimestamp(event.start);
          return start >= monthStart && start < monthEnd;
        });
        const card = createElement("section", "nd-calendar__month-card");
        card.append(createElement("strong", "", formatDate(monthStart, locale, { month: "long" })));
        card.append(createElement("span", "", `${monthEvents.length} events`));
        const density = createElement("div", "nd-calendar__month-density");
        Array.from({ length: 31 }, (_, day) => {
          const dayStart = new Date(new Date(anchor).getFullYear(), month, day + 1).getTime();
          const marker = createElement("i");
          const count = monthEvents.filter((event) => {
            const start = toTimestamp(event.start);
            return start >= dayStart && start < dayStart + DAY;
          }).length;
          marker.dataset.count = String(count);
          marker.style.opacity = String(count === 0 ? 0.14 : Math.min(1, 0.35 + count * 0.2));
          density.append(marker);
          return marker;
        });
        card.append(density);
        year.append(card);
      }
      root.append(year);
      return () => listeners.forEach((listener) => listener());
    }

    if (view === "agenda") {
      const agenda = createElement("div", "nd-calendar__agenda");
      [...visibleEvents].sort((left, right) => toTimestamp(left.start) - toTimestamp(right.start)).forEach((event) => {
        const button = createElement("button", "nd-calendar__agenda-event");
        button.type = "button";
        button.disabled = event.disabled === true;
        button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
        button.append(createElement("time", "", formatDate(toTimestamp(event.start), locale, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })));
        button.append(createElement("strong", "", event.title));
        const resource = event.resourceId ? resourceById.get(event.resourceId) : undefined;
        if (resource) button.append(createElement("small", "", resource.label));
        const onClick = (clickEvent: MouseEvent) => selectEvent(event, clickEvent.detail === 0 ? "keyboard" : "pointer");
        button.addEventListener("click", onClick);
        listeners.push(() => button.removeEventListener("click", onClick));
        agenda.append(button);
      });
      if (visibleEvents.length === 0) agenda.append(createElement("p", "nd-calendar__empty", "No events in this range."));
      root.append(agenda);
      return () => listeners.forEach((listener) => listener());
    }

    if (view.startsWith("timeline") || view.startsWith("resource")) {
      const timeline = createElement("div", "nd-calendar__timeline");
      timeline.style.setProperty("--nd-calendar-days", String(range.days.length));
      const timelineHeader = createElement("div", "nd-calendar__timeline-head");
      timelineHeader.append(createElement("strong", "", view.startsWith("resource") ? "Resource" : "Schedule"));
      range.days.forEach((day) => timelineHeader.append(createElement("span", "", formatDate(day, locale, { weekday: "short", day: "2-digit" }))));
      timeline.append(timelineHeader);
      const resources = view.startsWith("resource")
        ? (currentOptions.resources?.length ? currentOptions.resources : [{ id: "unassigned", label: "Unassigned" }])
        : [{ id: "all", label: "All events" }];
      resources.forEach((resource) => {
        const row = createElement("div", "nd-calendar__timeline-row");
        row.append(createElement("strong", "", resource.label));
        const track = createElement("div", "nd-calendar__timeline-track");
        const rowEvents = view.startsWith("resource")
          ? visibleEvents.filter((event) => event.resourceId === resource.id || (!event.resourceId && resource.id === "unassigned"))
          : visibleEvents;
        rowEvents.forEach((event, index) => {
          const start = toTimestamp(event.start);
          const end = toTimestamp(event.end ?? start + (event.durationMinutes ?? 60) * 60_000);
          const left = Math.max(0, Math.min(100, (start - range.start) / (range.end - range.start) * 100));
          const duration = Math.max(1.5, Math.min(100 - left, (end - start) / (range.end - range.start) * 100));
          const button = createElement("button", "nd-calendar__timeline-event", event.title);
          button.type = "button";
          button.style.left = `${left}%`;
          button.style.width = `${duration}%`;
          button.style.top = `${6 + index % 3 * 28}px`;
          button.style.setProperty("--nd-event-color", event.color ?? "var(--nd-primary)");
          button.disabled = event.disabled === true;
          button.tabIndex = isInteractionEnabled(currentOptions.interactive, "keyboard") ? 0 : -1;
          const onClick = (clickEvent: MouseEvent) => selectEvent(event, clickEvent.detail === 0 ? "keyboard" : "pointer");
          button.addEventListener("click", onClick);
          listeners.push(() => button.removeEventListener("click", onClick));
          track.append(button);
        });
        row.append(track);
        timeline.append(row);
      });
      root.append(timeline);
      return () => listeners.forEach((listener) => listener());
    }

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
