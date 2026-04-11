export function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function differenceInCalendarDaysInclusive(
  start: Date,
  end: Date
) {
  const startDay = startOfLocalDay(start).getTime();
  const endDay = startOfLocalDay(end).getTime();

  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endDay - startDay) / msPerDay) + 1;
}

export function buildFunctionHallRange(
  start: Date,
  end?: Date | null
) {
  const safeStart = startOfLocalDay(start);

  const safeRawEnd = end
    ? startOfLocalDay(end)
    : safeStart;

  const safeEnd =
    safeRawEnd.getTime() < safeStart.getTime()
      ? safeStart
      : safeRawEnd;

  return {
    startDate: safeStart,
    endDate: endOfLocalDay(safeEnd),
    duration: differenceInCalendarDaysInclusive(
      safeStart,
      safeEnd
    ),
    durationType: "days" as const,
  };
}

export function isSameLocalDay(
  a?: Date | null,
  b?: Date | null
) {
  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function validateFunctionHall(
  form: {
    startDate?: Date;
    endDate?: Date;
    duration: number;
    eventPurpose: string;
    attendees: string;
  }
) {
  const errors: Record<string, string> = {};

  if (!form.startDate) {
    errors.startDate = "Start date is required.";
  }

  if (!form.endDate) {
    errors.endDate = "End date is required.";
  }

  if (!form.duration) {
    errors.duration = "Duration required.";
  }

  if (!form.eventPurpose.trim()) {
    errors.eventPurpose = "Event purpose required.";
  }

  if (!form.attendees.trim()) {
    errors.attendees = "Attendees required.";
  }

  return errors;
}