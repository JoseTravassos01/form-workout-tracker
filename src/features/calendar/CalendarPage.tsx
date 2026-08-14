import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight, CircleAlert, Dumbbell, Moon, Play, Plus, Repeat2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../app/ToastProvider";
import { Button, Card, PageHeader, Skeleton, StatusPill } from "../../components/ui";
import { apiMutation } from "../../lib/api";
import { useApi } from "../../lib/use-api";

interface CalendarItem {
  date: string;
  kind: "strength" | "cardio" | "rest" | "extra";
  templateId?: string;
  name: string;
  subtitle?: string;
  durationMin?: number | null;
  durationMax?: number | null;
  rpeMin?: number | null;
  rpeMax?: number | null;
  status: string;
  block?: number;
  week?: number;
  override?: { version?: number; reason?: string; originalDate?: string; newDate?: string | null };
  session?: { id: string; version: number; status: string } | null;
}
interface CalendarDto { from: string; to: string; items: CalendarItem[] }

function EventIcon({ kind }: { kind: CalendarItem["kind"] }) {
  return kind === "strength" ? <Dumbbell /> : kind === "cardio" || kind === "extra" ? <Activity /> : <Moon />;
}

export function CalendarPage() {
  const { show } = useToast();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [activeDate, setActiveDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mode, setMode] = useState<"month" | "week">("month");
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [cardioSession, setCardioSession] = useState<{ id: string; version: number } | null>(null);
  const [duration, setDuration] = useState(30);
  const [rpe, setRpe] = useState(3);
  const [cardioNotes, setCardioNotes] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityDuration, setActivityDuration] = useState(30);
  const [activityRpe, setActivityRpe] = useState(3);
  const [activityNotes, setActivityNotes] = useState("");
  const [openingWorkout, setOpeningWorkout] = useState(false);
  const range = useMemo(() => mode === "month"
    ? { from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }
    : { from: startOfWeek(cursor, { weekStartsOn: 1 }), to: endOfWeek(cursor, { weekStartsOn: 1 }) }, [cursor, mode]);
  const path = `/api/calendar?from=${format(range.from, "yyyy-MM-dd")}&to=${format(range.to, "yyyy-MM-dd")}`;
  const { data, loading, refresh } = useApi<CalendarDto>(path);
  const days = useMemo(() => {
    const result = [];
    for (let day = range.from; day <= range.to; day = addDays(day, 1)) result.push(day);
    return result;
  }, [range]);
  const itemsFor = (date: Date) => data?.items.filter((item) => item.date === format(date, "yyyy-MM-dd")) ?? [];
  const activeItems = data?.items.filter((item) => item.date === activeDate) ?? [];
  const activeDateLabel = new Date(`${activeDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const moveCursor = (direction: -1 | 1) => {
    const next = mode === "month" ? (direction === -1 ? subMonths(cursor, 1) : addMonths(cursor, 1)) : addDays(cursor, direction * 7);
    setCursor(next);
    setActiveDate(format(next, "yyyy-MM-dd"));
  };

  const change = async (action: "rescheduled" | "missed" | "rest") => {
    if (!selected) return;
    try {
      const result = await apiMutation<{ queued?: boolean }>("/api/calendar/overrides", "POST", {
        originalDate: selected.override?.originalDate ?? selected.date,
        newDate: action === "rescheduled" ? newDate : null,
        trainingDayId: selected.templateId ?? null,
        action,
        reason,
        version: selected.override?.version ?? null,
      }, true);
      show(result.queued ? "Alteração guardada neste aparelho. Não sincronizado." : action === "rescheduled" ? "Treino reagendado sem alterar o programa original." : action === "missed" ? "Treino marcado como perdido." : "Dia marcado como descanso.", result.queued ? "info" : "success");
      if (!result.queued) await refresh();
      setSelected(null); setNewDate(""); setReason("");
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível alterar o calendário.", "error"); }
  };

  const startCardio = async () => {
    if (!selected?.templateId) return;
    try {
      const result = await apiMutation<{ id: string; version: number }>(`/api/cardio/${encodeURIComponent(selected.templateId)}/start`, "POST", { scheduledDate: selected.date, version: selected.session?.version ?? null });
      setCardioSession({ id: result.id, version: result.version });
      setDuration(selected.durationMin ?? 30); setRpe(selected.rpeMin ?? 3);
      show("Cardio iniciado.", "success");
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível iniciar.", "error"); }
  };

  const completeCardio = async () => {
    const session = cardioSession ?? (selected?.session ? { id: selected.session.id, version: selected.session.version } : null);
    if (!session || !selected) return;
    try {
      const result = await apiMutation<{ queued?: boolean }>(`/api/cardio/sessions/${encodeURIComponent(session.id)}/complete`, "POST", { actualDurationMinutes: duration, modality: selected.name, actualRpe: rpe, notes: cardioNotes, version: session.version }, true);
      show(result.queued ? "Cardio guardado neste aparelho. Não sincronizado." : "Cardio concluído.", result.queued ? "info" : "success");
      setSelected(null); setCardioSession(null); setCardioNotes("");
      if (!result.queued) await refresh();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível concluir.", "error"); }
  };

  const addActivity = async () => {
    if (!selected || activityName.trim().length < 2) return;
    try {
      const result = await apiMutation<{ created: boolean }>("/api/calendar/activities", "POST", {
        activityDate: selected.date,
        name: activityName.trim(),
        durationMinutes: activityDuration || null,
        rpe: activityRpe,
        notes: activityNotes,
        idempotencyKey: crypto.randomUUID(),
      }, true);
      show(result.queued ? "Atividade guardada neste aparelho. Não sincronizado." : "Atividade extra registrada.", result.queued ? "info" : "success");
      setAddingActivity(false); setActivityName(""); setActivityNotes("");
      if (!result.queued) { setSelected(null); await refresh(); }
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível registrar a atividade.", "error"); }
  };

  const openWorkout = async () => {
    if (!selected?.templateId || selected.kind !== "strength") return;
    setOpeningWorkout(true);
    try {
      const sessionId = selected.session?.id ?? (await apiMutation<{ id: string }>("/api/workouts/prepare", "POST", {
        trainingDayId: selected.templateId,
        scheduledDate: selected.date,
        originalDate: selected.override?.originalDate ?? selected.date,
      })).id;
      navigate(`/app/workout/${encodeURIComponent(sessionId)}`);
    } catch (error) {
      show(error instanceof Error ? error.message : "Não foi possível abrir os exercícios deste dia.", "error");
      setOpeningWorkout(false);
    }
  };

  const selectedWorkoutWasMoved = selected?.status === "rescheduled" && selected.override?.newDate != null && selected.override.newDate !== selected.date;
  const canOpenSelectedWorkout = selected?.kind === "strength" && !selectedWorkoutWasMoved && !["missed", "rest", "skipped"].includes(selected.status);

  return <div className="page-stack calendar-page">
    <PageHeader eyebrow="PLANEJAMENTO" title="Calendário" />
    <div className="calendar-toolbar">
      <div className="view-toggle"><button className={mode === "month" ? "active" : ""} onClick={() => { setMode("month"); setActiveDate(format(cursor, "yyyy-MM-dd")); }}>Mês</button><button className={mode === "week" ? "active" : ""} onClick={() => { setMode("week"); setActiveDate(format(cursor, "yyyy-MM-dd")); }}>Semana</button></div>
      <div className="month-switch"><button aria-label="Anterior" onClick={() => moveCursor(-1)}><ChevronLeft /></button><strong>{format(cursor, mode === "month" ? "MMMM yyyy" : "'Semana de' d MMM", { locale: ptBR })}</strong><button aria-label="Próximo" onClick={() => moveCursor(1)}><ChevronRight /></button></div>
    </div>
    {loading ? <Skeleton className="calendar-skeleton" /> : <Card className={`calendar-grid ${mode}`}>
      {mode === "month" && ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((name) => <div className="weekday-name" key={name}>{name}</div>)}
      {days.map((date) => {
        const dateItems = itemsFor(date);
        const outside = !isSameMonth(date, cursor) && mode === "month";
        const dateKey = format(date, "yyyy-MM-dd");
        const selectDay = () => setActiveDate(dateKey);
        return <div key={date.toISOString()} onClick={selectDay} className={`calendar-day ${outside ? "outside" : ""} ${dateKey === format(new Date(), "yyyy-MM-dd") ? "today" : ""} ${dateKey === activeDate ? "selected" : ""}`}>
          <button type="button" className="calendar-date" aria-label={`Ver ${format(date, "d 'de' MMMM", { locale: ptBR })}`} onClick={(event) => { event.stopPropagation(); selectDay(); }}>{format(date, mode === "week" ? "EEE d" : "d", { locale: ptBR })}</button>
          <div className="day-events">{dateItems.map((item, index) => <button type="button" aria-label={`${item.name} — ${format(date, "d 'de' MMMM", { locale: ptBR })}`} key={`${item.kind}-${item.templateId ?? index}`} className={`day-event event-${item.kind} event-${item.status}`} onClick={(event) => { event.stopPropagation(); setActiveDate(dateKey); setSelected(item); }}><EventIcon kind={item.kind} /><strong>{item.name}</strong>{mode === "week" && <small>{item.subtitle}</small>}</button>)}</div>
        </div>;
      })}
    </Card>}
    {!loading && <section className="mobile-calendar-agenda" aria-live="polite">
      <div className="mobile-agenda-heading"><span>AGENDA DO DIA</span><h2>{activeDateLabel}</h2></div>
      {activeItems.length === 0 ? <Card className="mobile-agenda-empty"><Moon /><p>Nenhum treino ou atividade planejada.</p></Card> : <div className="mobile-agenda-list">{activeItems.map((item, index) => <button type="button" key={`${item.kind}-${item.templateId ?? index}`} className={`mobile-agenda-event event-${item.kind} event-${item.status}`} onClick={() => setSelected(item)}><span className="mobile-agenda-icon"><EventIcon kind={item.kind} /></span><span><strong>{item.name}</strong><small>{item.subtitle ?? (item.kind === "rest" ? "Recuperação" : "Toque para ver os detalhes")}</small></span><ChevronRight /></button>)}</div>}
    </section>}
    <div className="calendar-legend"><span><i className="legend-strength" /> Treino</span><span><i className="legend-cardio" /> Cardio</span><span><i className="legend-extra" /> Extra</span><span><i className="legend-rest" /> Descanso</span><span><i className="legend-completed" /> Realizado</span></div>
    {selected && <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Detalhes do dia">
      <button className="modal-backdrop" onClick={() => setSelected(null)} />
      <Card className="day-modal"><button className="modal-close" aria-label="Fechar" onClick={() => setSelected(null)}><X /></button>
        <span className="eyebrow">{new Date(`${selected.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
        <div className="modal-title"><div className={`event-icon event-${selected.kind}`}><EventIcon kind={selected.kind} /></div><div><h2>{selected.name}</h2><p>{selected.subtitle}</p></div><StatusPill status={selected.status} /></div>
        {selected.durationMin && <div className="detail-chips"><span>{selected.durationMin}{selected.durationMax && selected.durationMax !== selected.durationMin ? `–${selected.durationMax}` : ""} min</span>{selected.rpeMin != null && <span>RPE {selected.rpeMin}{selected.rpeMax !== selected.rpeMin ? `–${selected.rpeMax}` : ""}</span>}{selected.week && <span>Semana {selected.week}</span>}</div>}
        {selected.kind === "strength" && <div className="reschedule-box">
          {canOpenSelectedWorkout ? <><Button variant="secondary" loading={openingWorkout} onClick={() => void openWorkout()}><Dumbbell /> VER EXERCÍCIOS</Button><p>Abra a ficha para consultar ou personalizar o treino deste dia.</p></> : <p>Este treino foi retirado deste dia. Abra a nova data no calendário para ver a ficha.</p>}
          <h3><Repeat2 /> Reagendar treino</h3><p>O programa original será preservado; a exceção fica registrada.</p>
          <label>Nova data<input type="date" min={selected.date} value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label>
          <label>Motivo (opcional)<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label>
          <Button disabled={!newDate} onClick={() => void change("rescheduled")}>REAGENDAR</Button>
          <div className="modal-secondary-actions"><button onClick={() => void change("missed")}><CircleAlert /> Marcar perdido</button><button onClick={() => void change("rest")}><Moon /> Marcar descanso</button></div>
        </div>}
        {selected.kind === "cardio" && <div className="cardio-actions">{!cardioSession && selected.status !== "in_progress" ? <Button onClick={() => void startCardio()}><Play /> INICIAR CARDIO</Button> : <>
          <div className="cardio-inputs"><label>Duração real (min)<input type="number" min="1" max="600" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label><label>RPE real<input type="number" min="0" max="10" value={rpe} onChange={(event) => setRpe(Number(event.target.value))} /></label></div>
          <label className="calendar-notes">Observação<textarea value={cardioNotes} onChange={(event) => setCardioNotes(event.target.value)} maxLength={2000} /></label>
          <Button onClick={() => void completeCardio()}>CONCLUIR CARDIO</Button>
        </>}</div>}
        {selected.kind !== "extra" && <div className="extra-activity-box">{!addingActivity ? <button onClick={() => setAddingActivity(true)}><Plus /> Registrar atividade extra</button> : <>
          <h3><Activity /> Atividade extra</h3><label>Atividade<input value={activityName} onChange={(event) => setActivityName(event.target.value)} placeholder="Ex.: caminhada" maxLength={120} /></label>
          <div className="cardio-inputs"><label>Duração (min)<input type="number" min="1" max="600" value={activityDuration} onChange={(event) => setActivityDuration(Number(event.target.value))} /></label><label>RPE<input type="number" min="0" max="10" value={activityRpe} onChange={(event) => setActivityRpe(Number(event.target.value))} /></label></div>
          <label>Observação<textarea value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} maxLength={2000} /></label>
          <div className="modal-secondary-actions"><button onClick={() => setAddingActivity(false)}>Cancelar</button><Button disabled={activityName.trim().length < 2} onClick={() => void addActivity()}>SALVAR ATIVIDADE</Button></div>
        </>}</div>}
      </Card>
    </div>}
  </div>;
}
