import { addDays, differenceInCalendarDays, eachDayOfInterval, format, getISODay, parseISO, startOfWeek } from "date-fns";
import { calculateCurrentBlock, dateInTimezone } from "../domain/program";
import { ActivityRepository, type ExtraActivityRow } from "../repositories/activity-repository";
import { CalendarRepository, type CalendarCardioStatusRow, type CalendarOverrideRow, type CalendarWorkoutStatusRow } from "../repositories/calendar-repository";
import { ProgramRepository } from "../repositories/program-repository";

interface GeneratedCalendarItem {
  date: string;
  kind: "strength" | "cardio" | "rest" | "extra";
  templateId?: string;
  name: string;
  subtitle?: string | null;
  durationMin?: number | null;
  durationMax?: number | null;
  rpeMin?: number | null;
  rpeMax?: number | null;
  status: string;
  block?: number;
  week?: number;
  override?: CalendarOverrideRow;
  session?: CalendarWorkoutStatusRow | CalendarCardioStatusRow | null;
  activity?: ExtraActivityRow;
  source?: "scientific" | "custom" | "personal";
  planVersion?: number;
}

export class CalendarService {
  constructor(private readonly database: D1Database) {}

  async list(profileId: string, from: string, to: string) {
    const program = await new ProgramRepository(this.database).getContext(profileId);
    if (!program) return null;
    const repository = new CalendarRepository(this.database);
    const [templates, statuses, activities, personalCardioPlans] = await Promise.all([
      repository.getTemplates(profileId),
      repository.getStatuses(profileId, from, to),
      new ActivityRepository(this.database).list(profileId, from, to),
      repository.getPersonalCardioPlans(profileId, from, to),
    ]);
    const actualToday = parseISO(dateInTimezone(new Date(), program.timezone));
    const manualWeekStart = startOfWeek(actualToday, { weekStartsOn: 1 });
    const weekFor = (date: Date, programId: string, effectiveFrom: string) => {
      if (programId === program.program_id && program.manual_override === 1) {
        return Math.min(52, Math.max(1, program.current_week + Math.floor(differenceInCalendarDays(date, manualWeekStart) / 7)));
      }
      return Math.min(52, Math.max(1, Math.floor(differenceInCalendarDays(date, parseISO(effectiveFrom)) / 7) + 1));
    };

    const items = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).flatMap<GeneratedCalendarItem>((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const activeTemplates = templates.filter((item) => dateString >= item.effective_from && (item.effective_to == null || dateString <= item.effective_to));
      const scientificTemplates = activeTemplates.filter((item) => item.source === "scientific");
      // Uma atualização feita no mesmo dia pode deixar a versão anterior e a nova
      // válidas nessa data (as vigências usam precisão de dia). Nesse único caso,
      // a ficha atual vence; sessões já criadas continuam presas ao template antigo.
      const weekday = getISODay(date);
      const assignment = scientificTemplates.find((item) => item.program_id === program.program_id) ?? scientificTemplates[0];
      const calculatedWeek = assignment ? weekFor(date, assignment.program_id, assignment.effective_from) : 1;
      const block = assignment ? calculateCurrentBlock(calculatedWeek) : 1;
      const dayTemplates = assignment ? scientificTemplates.filter((item) => item.program_id === assignment.program_id && item.block_number === block && item.weekday === weekday) : [];
      const customTemplates = activeTemplates.filter((item) => item.source === "custom" && item.weekday === weekday);
      // Em um dia definido pelo ciclo pessoal, ele substitui apenas a exibição
      // científica daquele dia. O programa ativo e todo o histórico permanecem intactos.
      const scheduledTemplates = customTemplates.length > 0 ? customTemplates : dayTemplates;
      const generated: GeneratedCalendarItem[] = scheduledTemplates.map((template) => {
        const status = template.kind === "strength"
          ? statuses.workouts.find((item) => item.trainingDayId === template.id && item.scheduledDate === dateString)
          : template.kind === "cardio" ? statuses.cardio.find((item) => item.cardioPrescriptionId === template.id && item.scheduledDate === dateString) : undefined;
        const override = template.kind === "strength"
          ? statuses.overrides.find((item) => item.originalDate === dateString && (item.trainingDayId == null || item.trainingDayId === template.id))
          : undefined;
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
          source: template.source,
        };
      });
      for (const plan of personalCardioPlans) {
        if (dateString < plan.startDate || dateString > plan.endDate || !plan.weekdays.split(",").map(Number).includes(weekday)) continue;
        const session = statuses.cardio.find((item) => item.personalCardioPlanId === plan.id && item.scheduledDate === dateString);
        generated.push({
          date: dateString,
          kind: "cardio",
          templateId: plan.id,
          name: plan.modality,
          subtitle: plan.notes || "Cardio pessoal",
          durationMin: plan.durationMin,
          durationMax: plan.durationMax,
          rpeMin: plan.rpeMin,
          rpeMax: plan.rpeMax,
          status: session?.status ?? "scheduled",
          session: session ?? null,
          source: "personal",
          planVersion: plan.version,
        });
      }
      if (generated.length > 0) return generated;
      return [{ date: dateString, kind: "rest" as const, name: "Descanso", status: "scheduled", block, week: calculatedWeek, source: "scientific" as const }];
    });
    const rescheduledArrivals: GeneratedCalendarItem[] = statuses.overrides
      .filter((item) => item.action === "rescheduled" && item.newDate && item.newDate >= from && item.newDate <= to)
      .map((item) => {
        const template = templates.find((candidate) => candidate.id === item.trainingDayId);
        const session = statuses.workouts.find((candidate) => candidate.trainingDayId === item.trainingDayId && candidate.scheduledDate === item.newDate);
        return {
          date: item.newDate!,
          kind: "strength",
          templateId: item.trainingDayId!,
          name: template?.name ?? "Treino reagendado",
          subtitle: template?.subtitle,
          durationMin: template?.duration_min,
          durationMax: template?.duration_max,
          status: session?.status ?? "rescheduled",
          override: item,
          session: session ?? null,
        };
      });
    const extraItems: GeneratedCalendarItem[] = activities.map((item) => ({
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
