export interface ScheduledItem {
  trainingDayId: string;
  originalDate: string;
  scheduledDate: string;
  status: "scheduled" | "missed" | "rescheduled" | "rest";
}

export interface CalendarOverrideInput {
  trainingDayId: string | null;
  originalDate: string;
  newDate: string | null;
  action: "rescheduled" | "missed" | "rest";
}

export function resolveScheduledWorkout(base: ScheduledItem, overrides: CalendarOverrideInput[]): ScheduledItem {
  const override = overrides.find((item) => item.originalDate === base.originalDate && (item.trainingDayId === null || item.trainingDayId === base.trainingDayId));
  if (!override) return base;
  if (override.action === "rescheduled" && override.newDate) return { ...base, scheduledDate: override.newDate, status: "rescheduled" };
  return { ...base, status: override.action };
}
