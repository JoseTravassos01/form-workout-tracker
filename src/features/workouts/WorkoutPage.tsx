import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, CloudOff, Copy, Dumbbell, History, Info, Minus, MoreHorizontal, Plus, Save, Timer, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ExercisePrescriptionDto, WorkoutDto } from "../../../shared/api";
import { useToast } from "../../app/ToastProvider";
import { Button, Card, EmptyState, Skeleton, StatusPill } from "../../components/ui";
import { apiMutation } from "../../lib/api";
import { pendingMutationBodies } from "../../lib/offline-queue";
import { useApi } from "../../lib/use-api";
import { RestTimer } from "./RestTimer";

interface SetDraft {
  setNumber: number;
  loadKg: number | null;
  reps: number | null;
  actualRir: number | null;
  notes: string;
  completed: boolean;
  version: number | null;
  syncStatus: "draft" | "pending" | "synced";
}

function Stepper({ label, value, step, disabled, onChange }: { label: string; value: number | null; step: number; disabled: boolean; onChange(value: number | null): void }) {
  const current = value ?? 0;
  return <div className="set-stepper"><span>{label}</span><div><button type="button" disabled={disabled} aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(0, current - step))}><Minus /></button><input aria-label={label} disabled={disabled} inputMode="decimal" value={value ?? ""} onChange={(event) => { const normalized = event.target.value.replace(",", "."); onChange(normalized === "" ? null : Number(normalized)); }} /><button type="button" disabled={disabled} aria-label={`Aumentar ${label}`} onClick={() => onChange(current + step)}><Plus /></button></div></div>;
}

function ExerciseCard({ workoutId, exercise, disabled, onRefresh, onRest }: { workoutId: string; exercise: ExercisePrescriptionDto; disabled: boolean; onRefresh(): Promise<void>; onRest(seconds: number, name: string): void }) {
  const { show } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [notes, setNotes] = useState(exercise.log?.notes ?? "");
  const [technique, setTechnique] = useState(exercise.log?.techniqueConfirmed ?? false);
  const previous = exercise.previousSession?.sets ?? [];
  const setEndpoint = `/api/workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(exercise.prescriptionId)}/sets`;
  const drafts = useMemo<SetDraft[]>(() => Array.from({ length: exercise.sets }, (_, index) => {
    const existing = exercise.log?.sets.find((item) => item.setNumber === index + 1);
    return {
      setNumber: index + 1,
      loadKg: existing?.loadKg ?? null,
      reps: existing?.reps ?? null,
      actualRir: existing?.actualRir ?? null,
      notes: existing?.notes ?? "",
      completed: existing?.completed ?? false,
      version: existing?.version ?? null,
      syncStatus: existing ? "synced" : "draft",
    };
  }), [exercise]);
  const [sets, setSets] = useState(drafts);

  useEffect(() => {
    let cancelled = false;
    void pendingMutationBodies(setEndpoint).then((bodies) => {
      if (cancelled || bodies.length === 0) return;
      const pending = new Map<number, Partial<SetDraft>>();
      for (const body of bodies) {
        try {
          const value = JSON.parse(body) as Record<string, unknown>;
          if (typeof value.setNumber !== "number") continue;
          pending.set(value.setNumber, {
            setNumber: value.setNumber,
            loadKg: typeof value.loadKg === "number" ? value.loadKg : null,
            reps: typeof value.reps === "number" ? value.reps : null,
            actualRir: typeof value.actualRir === "number" ? value.actualRir : null,
            notes: typeof value.notes === "string" ? value.notes : "",
            completed: value.completed === true,
            version: typeof value.version === "number" ? value.version : null,
            syncStatus: "pending",
          });
        } catch { /* a fila preserva o body mesmo se uma versão antiga não puder ser exibida */ }
      }
      setSets((current) => current.map((item) => ({ ...item, ...(pending.get(item.setNumber) ?? {}) })));
    });
    return () => { cancelled = true; };
  }, [setEndpoint]);

  const update = (index: number, values: Partial<SetDraft>) => setSets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
  const usePreviousLoads = () => {
    setSets((current) => current.map((item) => ({ ...item, loadKg: previous.find((set) => set.setNumber === item.setNumber)?.loadKg ?? item.loadKg, completed: false, syncStatus: "draft" })));
    show("Cargas anteriores preenchidas como referência. Confirme cada série antes de salvar.", "info");
  };
  const saveSet = async (index: number) => {
    const set = sets[index];
    if (!set) return;
    setSaving(index);
    try {
      const result = await apiMutation<{ ok: boolean; version: number }>(setEndpoint, "POST", { ...set, completed: true, syncStatus: undefined, idempotencyKey: crypto.randomUUID() }, true);
      if (result.queued) {
        update(index, { completed: true, syncStatus: "pending" });
        show("Série guardada neste aparelho. Não sincronizado.", "info");
      } else {
        update(index, { completed: true, version: result.version, syncStatus: "synced" });
        show("Série registrada.", "success");
      }
      onRest(exercise.restSecondsMin, exercise.name);
      if (!result.queued) await onRefresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Não foi possível registrar a série.", "error");
    } finally {
      setSaving(null);
    }
  };
  const complete = async () => {
    if (!exercise.log) { show("Registre ao menos uma série antes de concluir o exercício.", "error"); return; }
    try {
      const result = await apiMutation<{ ok: boolean }>(`/api/workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(exercise.prescriptionId)}`, "PATCH", { completed: true, techniqueConfirmed: technique, notes, version: exercise.log.version }, true);
      if (result.queued) {
        show("Conclusão guardada neste aparelho. Não sincronizado.", "info");
        return;
      }
      await onRefresh();
      show("Exercício concluído.", "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "Não foi possível concluir.", "error");
    }
  };

  return <Card className={`exercise-card ${exercise.log?.completed ? "exercise-completed" : ""}`}>
    <button className="exercise-heading" onClick={() => setExpanded(!expanded)}><div><span className="exercise-order">{exercise.orderIndex.toString().padStart(2, "0")}</span><div><h2>{exercise.name}</h2><p>{exercise.sets} séries · {exercise.repsLabel ?? `${exercise.repsMin}–${exercise.repsMax} reps`} · {exercise.rirMin === exercise.rirMax ? exercise.rirMin : `${exercise.rirMin}–${exercise.rirMax}`} RIR</p><small>{exercise.primaryMuscle}{exercise.equipment ? ` · ${exercise.equipment}` : ""}</small></div></div>{exercise.log?.completed ? <CheckCircle2 className="completed-mark" /> : expanded ? <ChevronUp /> : <ChevronDown />}</button>
    {expanded && <div className="exercise-body">
      <div className="prescription-strip"><span><Timer /> Descanso {exercise.restSecondsMin === exercise.restSecondsMax ? `${exercise.restSecondsMin}s` : `${exercise.restSecondsMin}–${exercise.restSecondsMax}s`}</span><Link to={`/app/exercises/${encodeURIComponent(exercise.exerciseId)}`}><History /> Histórico</Link></div>
      {exercise.previousSession ? <div className="last-time"><div><span>ÚLTIMA VEZ</span><small>{new Date(`${exercise.previousSession.scheduledDate}T12:00:00`).toLocaleDateString("pt-BR")}</small></div>{previous.map((set) => <strong key={set.setNumber}>{set.loadKg ?? "—"}kg × {set.reps ?? "—"} <small>@{set.actualRir ?? "—"}</small></strong>)}<button type="button" disabled={disabled} onClick={usePreviousLoads}><Copy /> Usar cargas anteriores</button></div> : <div className="last-time last-time-empty"><div><span>ÚLTIMA VEZ</span><strong>Ainda não há histórico para este exercício.</strong><small>Registre a primeira sessão para acompanhar sua evolução.</small></div></div>}
      <div className="set-list">{sets.map((set, index) => <div className={`set-row ${set.completed ? "set-complete" : ""} ${set.syncStatus === "pending" ? "set-pending" : ""}`} key={set.setNumber}>
        <div className="set-number"><span>SÉRIE</span><strong>{set.setNumber}</strong>{set.syncStatus === "pending" && <small><CloudOff /> Não sincronizado</small>}</div>
        <Stepper label="kg" value={set.loadKg} step={2.5} disabled={disabled || saving === index || set.syncStatus === "pending"} onChange={(value) => update(index, { loadKg: value, completed: false, syncStatus: "draft" })} />
        <Stepper label="reps" value={set.reps} step={1} disabled={disabled || saving === index || set.syncStatus === "pending"} onChange={(value) => update(index, { reps: value == null ? null : Math.round(value), completed: false, syncStatus: "draft" })} />
        <div className="rir-picker"><span>RIR REAL</span><div>{[0, 1, 2, 3, 4].map((rir) => <button type="button" disabled={disabled || saving === index || set.syncStatus === "pending"} className={set.actualRir === rir ? "active" : ""} key={rir} onClick={() => update(index, { actualRir: rir, completed: false, syncStatus: "draft" })}>{rir === 4 ? "4+" : rir}</button>)}</div></div>
        <button className="complete-set" aria-label={`Concluir série ${set.setNumber}`} disabled={disabled || saving === index || set.syncStatus === "pending" || set.reps == null || set.loadKg == null || set.actualRir == null} onClick={() => void saveSet(index)}>{saving === index ? <MoreHorizontal /> : <Check />}</button>
        <label className="set-note">Observação da série {set.setNumber} (opcional)<input disabled={disabled || saving === index || set.syncStatus === "pending"} value={set.notes} maxLength={500} onChange={(event) => update(index, { notes: event.target.value, completed: false, syncStatus: "draft" })} placeholder="Ex.: execução mais lenta na última repetição" /></label>
      </div>)}</div>
      <details className="technique-note" open><summary><Info /> Instruções e observações da pesquisa</summary><p>{exercise.techniqueNotes || exercise.instructions}</p>{exercise.progressionNotes && <p><strong>Progressão:</strong> {exercise.progressionNotes}</p>}{exercise.requiresSelection && <p className="ambiguity"><CircleAlert /> Esta variante depende de seleção humana conforme o histórico/equipamento; não foi escolhida automaticamente.</p>}</details>
      <label className="notes-field">Nota do exercício<textarea disabled={disabled} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: hoje senti o joelho (apenas registro, sem interpretação clínica)." /></label>
      <label className="technique-check"><input disabled={disabled} type="checkbox" checked={technique} onChange={(event) => setTechnique(event.target.checked)} /> Técnica e amplitude foram consistentes</label>
      {exercise.progressionSuggestion && <div className="progression-suggestion"><Trophy /><div><strong>Sugestão pelas regras da pesquisa</strong><p>{exercise.progressionSuggestion.message}</p><small>Use como referência: a carga só muda após sua confirmação.</small></div></div>}
      <Button variant="secondary" className="complete-exercise" disabled={disabled} onClick={() => void complete()}><CheckCircle2 /> CONCLUIR EXERCÍCIO</Button>
    </div>}
  </Card>;
}

export function WorkoutPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const path = `/api/workouts/${encodeURIComponent(sessionId ?? "")}`;
  const { data: workout, loading, error, refresh } = useApi<WorkoutDto>(path);
  const [timer, setTimer] = useState<{ seconds: number; name: string } | null>(null);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string; synced?: number }>).detail;
      if (detail?.reason === "flushed" && Number(detail.synced) > 0) void refresh();
    };
    window.addEventListener("sync-state-change", handleSync);
    return () => window.removeEventListener("sync-state-change", handleSync);
  }, [refresh]);

  if (loading) return <div className="page-stack"><Skeleton className="workout-head-skeleton" />{[1, 2, 3].map((item) => <Skeleton key={item} className="exercise-skeleton" />)}</div>;
  if (error || !workout) return <EmptyState icon={<CircleAlert />} title="Treino não encontrado" text="Ele pode ter sido reagendado ou não pertencer a este perfil."><Button onClick={() => navigate("/app")}>Voltar</Button></EmptyState>;
  const start = async () => { setMutating(true); try { await apiMutation(`/api/workouts/${encodeURIComponent(workout.id)}/start`, "POST", { version: workout.version }); await refresh(); show("Treino iniciado. Bom treino!", "success"); } catch (caught) { show(caught instanceof Error ? caught.message : "Não foi possível iniciar.", "error"); } finally { setMutating(false); } };
  const finish = async () => { setMutating(true); try { const result = await apiMutation<{ status: "completed" | "partial" }>(`/api/workouts/${encodeURIComponent(workout.id)}/complete`, "POST", { version: workout.version }); await refresh(); show(result.status === "completed" ? "Treino concluído e sincronizado." : "Treino finalizado como parcial e sincronizado.", "success"); } catch (caught) { show(caught instanceof Error ? caught.message : "Não foi possível concluir.", "error"); } finally { setMutating(false); } };
  const active = workout.status === "in_progress";
  return <div className="page-stack workout-page">
    <header className="workout-header"><button aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft /></button><div><span className="eyebrow">{new Date(`${workout.scheduledDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}</span><h1>{workout.name}</h1><p>{workout.description}</p></div><StatusPill status={workout.status} /></header>
    <div className="workout-progress"><div><span>{workout.completionPercent}% concluído</span><small>{workout.exercises.filter((item) => item.log?.completed).length} de {workout.exercises.length} exercícios</small></div><div><span style={{ width: `${workout.completionPercent}%` }} /></div></div>
    {workout.guidance && <Card className="program-guidance"><Info /><div><strong>Regra da semana atual</strong><p>{workout.guidance}</p></div></Card>}
    {(workout.status === "scheduled" || workout.status === "rescheduled") && <Card className="start-workout-card"><Dumbbell /><div><h2>Pronto para começar?</h2><p>A ficha completa está abaixo. O cronômetro inicia quando você conclui a primeira série.</p></div><Button loading={mutating} onClick={() => void start()}>INICIAR TREINO</Button></Card>}
    {workout.exercises.map((exercise) => <ExerciseCard key={`${exercise.prescriptionId}:${exercise.log?.version ?? 0}`} workoutId={workout.id} exercise={exercise} disabled={!active} onRefresh={refresh} onRest={(seconds, name) => setTimer({ seconds, name })} />)}
    {active && <Button className="finish-workout" loading={mutating} onClick={() => void finish()}><Save /> CONCLUIR TREINO</Button>}
    {timer && <RestTimer initialSeconds={timer.seconds} exerciseName={timer.name} onClose={() => setTimer(null)} />}
  </div>;
}
