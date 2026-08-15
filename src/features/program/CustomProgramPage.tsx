import { CalendarRange, Dumbbell, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "../../app/ToastProvider";
import { Button, Card, PageHeader, Skeleton } from "../../components/ui";
import { apiMutation } from "../../lib/api";
import { useApi } from "../../lib/use-api";

interface ExerciseDraft { name: string; sets: number; repsMin: number; repsMax: number; rirMin: number; rirMax: number; restSeconds: number; notes: string }
interface DayDraft { weekday: number; name: string; exercises: ExerciseDraft[] }
interface CustomProgramsDto { programs: Array<{ id: string; programId: string; name: string; durationWeeks: number; startDate: string; endDate: string; active: boolean; version: number; dayCount: number }> }

const weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const blankExercise = (): ExerciseDraft => ({ name: "", sets: 3, repsMin: 8, repsMax: 12, rirMin: 1, rirMax: 2, restSeconds: 120, notes: "" });

export function CustomProgramPage() {
  const { show } = useToast();
  const { data, loading, refresh } = useApi<CustomProgramsDto>("/api/program/custom");
  const [name, setName] = useState("Meu ciclo de treino");
  const [durationWeeks, setDurationWeeks] = useState<4 | 12>(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<DayDraft[]>([{ weekday: 1, name: "Treino A", exercises: [blankExercise()] }]);
  const [saving, setSaving] = useState(false);

  const updateDay = (index: number, patch: Partial<DayDraft>) => setDays((current) => current.map((day, itemIndex) => itemIndex === index ? { ...day, ...patch } : day));
  const updateExercise = (dayIndex: number, exerciseIndex: number, patch: Partial<ExerciseDraft>) => setDays((current) => current.map((day, itemIndex) => itemIndex !== dayIndex ? day : { ...day, exercises: day.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, ...patch } : exercise) }));
  const valid = name.trim().length >= 3 && days.length > 0 && new Set(days.map((day) => day.weekday)).size === days.length && days.every((day) => day.name.trim().length >= 2 && day.exercises.length > 0 && day.exercises.every((exercise) => exercise.name.trim().length >= 2 && exercise.repsMax >= exercise.repsMin && exercise.rirMax >= exercise.rirMin));

  const create = async () => {
    setSaving(true);
    try {
      await apiMutation("/api/program/custom", "POST", { name: name.trim(), durationWeeks, startDate, days, idempotencyKey: crypto.randomUUID() });
      show("Ciclo pessoal criado e adicionado ao calendário.", "success");
      await refresh();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível criar o ciclo.", "error"); }
    finally { setSaving(false); }
  };

  const archive = async (id: string, version: number) => {
    try {
      await apiMutation(`/api/program/custom/${encodeURIComponent(id)}?version=${version}`, "DELETE");
      show("Ciclo removido das próximas datas. O histórico foi preservado.", "success");
      await refresh();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível encerrar o ciclo.", "error"); }
  };

  return <div className="page-stack custom-program-page">
    <PageHeader eyebrow="PLANEJAMENTO PESSOAL" title="Criar meu treino" />
    <Card className="custom-program-intro"><CalendarRange /><div><h2>Mensal ou trimestral</h2><p>O ciclo aparece junto do programa atual, sem substituí-lo. Exercícios com o mesmo nome reutilizam a entidade existente quando possível, preservando o histórico de cargas.</p></div></Card>
    <Card className="custom-program-form">
      <div className="custom-program-basics"><label>Nome do ciclo<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label><label>Início<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Duração<select value={durationWeeks} onChange={(event) => setDurationWeeks(Number(event.target.value) as 4 | 12)}><option value={4}>Mensal · 4 semanas</option><option value={12}>Trimestral · 12 semanas</option></select></label></div>
      <div className="custom-days">{days.map((day, dayIndex) => <Card className="custom-day" key={`${dayIndex}-${day.weekday}`}>
        <div className="custom-day-head"><div><Dumbbell /><strong>Dia {dayIndex + 1}</strong></div><button type="button" aria-label="Remover dia" onClick={() => setDays((current) => current.filter((_, index) => index !== dayIndex))}><X /></button></div>
        <div className="custom-day-basics"><label>Dia da semana<select value={day.weekday} onChange={(event) => updateDay(dayIndex, { weekday: Number(event.target.value) })}>{weekdays.map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></label><label>Nome do treino<input value={day.name} maxLength={120} onChange={(event) => updateDay(dayIndex, { name: event.target.value })} /></label></div>
        <div className="custom-exercises">{day.exercises.map((exercise, exerciseIndex) => <div className="custom-exercise" key={exerciseIndex}>
          <div className="custom-exercise-title"><strong>Exercício {exerciseIndex + 1}</strong><button type="button" aria-label="Remover exercício" onClick={() => updateDay(dayIndex, { exercises: day.exercises.filter((_, index) => index !== exerciseIndex) })}><Trash2 /></button></div>
          <label className="exercise-name">Nome<input placeholder="Ex.: Hip Thrust" value={exercise.name} maxLength={120} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { name: event.target.value })} /></label>
          <div className="custom-exercise-grid"><label>Séries<input type="number" min="1" max="20" value={exercise.sets} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: Number(event.target.value) })} /></label><label>Reps mín.<input type="number" min="1" max="200" value={exercise.repsMin} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMin: Number(event.target.value) })} /></label><label>Reps máx.<input type="number" min="1" max="200" value={exercise.repsMax} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMax: Number(event.target.value) })} /></label><label>RIR mín.<input type="number" min="0" max="10" value={exercise.rirMin} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { rirMin: Number(event.target.value) })} /></label><label>RIR máx.<input type="number" min="0" max="10" value={exercise.rirMax} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { rirMax: Number(event.target.value) })} /></label><label>Descanso (s)<input type="number" min="15" max="600" value={exercise.restSeconds} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { restSeconds: Number(event.target.value) })} /></label></div>
          <label>Observação<input value={exercise.notes} maxLength={1000} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { notes: event.target.value })} /></label>
        </div>)}</div>
        <Button type="button" variant="secondary" disabled={day.exercises.length >= 12} onClick={() => updateDay(dayIndex, { exercises: [...day.exercises, blankExercise()] })}><Plus /> EXERCÍCIO</Button>
      </Card>)}</div>
      <Button type="button" variant="secondary" disabled={days.length >= 7} onClick={() => { const available = [1, 2, 3, 4, 5, 6, 7].find((weekday) => !days.some((day) => day.weekday === weekday)) ?? 1; setDays((current) => [...current, { weekday: available, name: `Treino ${String.fromCharCode(65 + current.length)}`, exercises: [blankExercise()] }]); }}><Plus /> ADICIONAR DIA</Button>
      <Button loading={saving} disabled={!valid} onClick={() => void create()}><Save /> CRIAR CICLO</Button>
    </Card>
    <section><div className="section-heading"><div><span className="eyebrow">SEUS CICLOS</span><h2>Planejamentos criados</h2></div></div>{loading ? <Skeleton className="block-skeleton" /> : <div className="custom-program-list">{data?.programs.length ? data.programs.map((program) => <Card key={program.id}><div><strong>{program.name}</strong><span>{program.durationWeeks} semanas · {program.dayCount} dias por semana</span><small>{new Date(`${program.startDate}T12:00:00`).toLocaleDateString("pt-BR")} até {new Date(`${program.endDate}T12:00:00`).toLocaleDateString("pt-BR")}</small></div>{program.active ? <button type="button" onClick={() => void archive(program.id, program.version)}>Encerrar</button> : <em>Encerrado</em>}</Card>) : <Card className="empty-state"><p>Nenhum ciclo pessoal criado.</p></Card>}</div>}</section>
  </div>;
}
