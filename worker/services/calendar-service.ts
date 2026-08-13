import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISODay, parseISO, startOfWeek } from "date-fns";
import { calculateCurrentBlock, dateInTimezone } from "../domain/program";
import { ActivityRepository } from "../repositories/activity-repository";
import { CalendarRepository } from "../repositories/calendar-repository";
import { ProgramRepository } from "../repositories/program-repository";

export class CalendarService {
  constructor(private readonly database: D1Database) {}

  async list(profileId: string, from: string, to: string) {
    const program = await new ProgramRepository(this.database).getContext(profileId);
    if (!program) return null;
    const repository = new CalendarRepository(this.database);
    const [templates, statuses, activities] = await Promise.all([
      repository.getTemplates(profileId),
      repository.getStatuses(profileId, from, to),
      new ActivityRepository(this.database).list(profileId, from, to),
    ]);
    const programStart = parseISO(program.program_start_date);
    const actualToday = parseISO(dateInTimezone(new Date(), program.timezone));
    const manualWeekStart = startOfWeek(actualToday, { weekStartsOn: 1 });
    const weekFor = (date: Date) => {
      if (program.manual_override === 1) {
        return Math.min(52, Math.max(1, program.current_week + Math.floor(differenceInCalendarDays(date, manualWeekStart) / 7)));
      }
      return Math.min(52, Math.max(1, Math.floor(differenceInCalendarDays(date, programStart) / 7) + 1));
    };

    const items = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const calculatedWeek = weekFor(date);
      const block = calculateCurrentBlock(calculatedWeek);
      const weekday = getISODay(date);
      const template = templates.find((item) => item.block_number === block && item.weekday === weekday);
      if (!template) return { date: dateString, kind: "rest", name: "Descanso", status: "scheduled", block, week: calculatedWeek };
      const status = template.kind === "strength"
        ? statuses.workouts.find((item) => item.trainingDayId === template.id && item.scheduledDate === dateString)
        : statuses.cardio.find((item) => item.cardioPrescriptionId === template.id && item.scheduledDate === dateString);
      const override = statuses.overrides.find((item) => item.originalDate === dateString && (item.trainingDayId == null || item.trainingDayId === template.id));
      return {
        date: dateString,
        kind: template.kind,
        templateId: template.id,
        name: template.name,
        subtitle: template.subtitle,
        durationMin: template.duration_min,
        durationMax: template.duration_max,
        rpeMin: template.rpe_min,
        rpeMax: template.rpe_max,
        status: override?.action ?? status?.status ?? "scheduled",
        block,
        week: calculatedWeek,
        override,
        session: status ?? null,
      };
    });
    const rescheduledArrivals = statuses.overrides
      .filter((item) => item.action === "rescheduled" && item.newDate && item.newDate >= from && item.newDate <= to)
      .map((item) => {
        const template = templates.find((candidate) => candidate.id === item.trainingDayId);
        const session = statuses.workouts.find((candidate) => candidate.trainingDayId === item.trainingDayId && candidate.scheduledDate === item.newDate);
        return {
          date: item.newDate,
          kind: "strength",
          templateId: item.trainingDayId,
          name: template?.name ?? "Treino reagendado",
          subtitle: template?.subtitle,
          durationMin: template?.duration_min,
          durationMax: template?.duration_max,
          status: session?.status ?? "rescheduled",
          override: item,
          session: session ?? null,
        };
      });
    const extraItems = activities.map((item) => ({
      date: item.activityDate,
      kind: "extra",
      templateId: item.id,
      name: item.name,
      subtitle: item.notes,
      durationMin: item.durationMinutes,
      rpeMin: item.rpe,
      rpeMax: item.rpe,
      status: "completed",
      activity: item,
    }));
    return { from, to, items: [...items, ...rescheduledArrivals, ...extraItems], generatedUntil: format(addDays(parseISO(to), 0), "yyyy-MM-dd") };
  }
}
