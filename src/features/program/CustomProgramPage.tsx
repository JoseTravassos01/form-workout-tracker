import { Bot, CalendarRange, Dumbbell, FileText, Plus, Save, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import type { AiWorkoutDraftDto, AiWorkoutStatusDto, CustomExerciseDraftDto, CustomTrainingDayDraftDto } from "../../../shared/api";
import { useToast } from "../../app/ToastProvider";
import { Button, Card, PageHeader, Skeleton } from "../../components/ui";
import { apiFormMutation, apiMutation } from "../../lib/api";
import { useApi } from "../../lib/use-api";

type ExerciseDraft = CustomExerciseDraftDto;
type DayDraft = CustomTrainingDayDraftDto;
interface CustomProgramsDto { programs: Array<{ id: string; programId: string; name: string; durationWeeks: number; startDate: string; endDate: string; active: boolean; version: number; dayCount: number }> }

const weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const maxPdfFiles = 3;
const maxPdfFileBytes = 5 * 1024 * 1024;
const blankExercise = (): ExerciseDraft => ({ name: "", sets: 3, repsMin: 8, repsMax: 12, rirMin: 1, rirMax: 2, restSeconds: 120, notes: "" });

export function CustomProgramPage() {
  const { show } = useToast();
  const { data, loading, refresh } = useApi<CustomProgramsDto>("/api/program/custom");
  const { data: aiStatus, loading: aiStatusLoading, error: aiStatusError, refresh: refreshAiStatus } = useApi<AiWorkoutStatusDto>("/api/program/ai/status");
  const [name, setName] = useState("Meu ciclo de treino");
  const [durationWeeks, setDurationWeeks] = useState<4 | 12>(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<DayDraft[]>([{ weekday: 1, name: "Treino A", exercises: [blankExercise()] }]);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState<AiWorkoutDraftDto | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [generatingMode, setGeneratingMode] = useState<"text" | "pdf" | null>(null);

  const updateDay = (index: number, patch: Partial<DayDraft>) => setDays((current) => current.map((day, itemIndex) => itemIndex === index ? { ...day, ...patch } : day));
  const updateExercise = (dayIndex: number, exerciseIndex: number, patch: Partial<ExerciseDraft>) => setDays((current) => current.map((day, itemIndex) => itemIndex !== dayIndex ? day : { ...day, exercises: day.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, ...patch } : exercise) }));
  const valid = name.trim().length >= 3 && days.length > 0 && new Set(days.map((day) => day.weekday)).size === days.length && days.every((day) => day.name.trim().length >= 2 && day.exercises.length > 0 && day.exercises.every((exercise) => exercise.name.trim().length >= 2 && exercise.repsMax >= exercise.repsMin && exercise.rirMax >= exercise.rirMin));

  const applyAiDraft = (draft: AiWorkoutDraftDto) => {
    setName(draft.name);
    setDays(draft.days);
    setAiDraft(draft);
  };

  const generateWithAi = async () => {
    setGeneratingMode("text");
    try {
      const draft = await apiMutation<AiWorkoutDraftDto>("/api/program/ai/generate", "POST", { prompt: aiPrompt.trim(), durationWeeks, startDate });
      applyAiDraft(draft);
      show("Rascunho criado. Revise e edite antes de salvar no calendário.", "success");
      await refreshAiStatus();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível gerar o treino.", "error"); }
    finally { setGeneratingMode(null); }
  };

  const addPdfFiles = (selected: FileList | null) => {
    if (!selected) return;
    const candidates = Array.from(selected);
    const invalid = candidates.find((file) => !file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf") || file.size < 1 || file.size > maxPdfFileBytes);
    if (invalid) {
      show("Use somente PDFs de até 5 MB cada.", "error");
      return;
    }
    const combined = [...pdfFiles, ...candidates].filter((file, index, files) => files.findIndex((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified) === index);
    if (combined.length > maxPdfFiles) show("Você pode adicionar no máximo 3 PDFs.", "error");
    setPdfFiles(combined.slice(0, maxPdfFiles));
  };

  const generateWithPdf = async () => {
    setGeneratingMode("pdf");
    try {
      const form = new FormData();
      form.set("prompt", aiPrompt.trim());
      form.set("durationWeeks", String(durationWeeks));
      form.set("startDate", startDate);
      for (const file of pdfFiles) form.append("pdfs", file, file.name);
      const draft = await apiFormMutation<AiWorkoutDraftDto>("/api/program/ai/generate-from-pdf", form);
      applyAiDraft(draft);
      show(draft.pdfContent?.truncated ? "Rascunho criado. Parte do conteúdo foi limitada para processamento seguro." : "Rascunho criado usando o conteúdo adicionado.", "success");
      await refreshAiStatus();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível usar os PDFs.", "error"); }
    finally { setGeneratingMode(null); }
  };

  const create = async () => {
    setSaving(true);
    try {
      await apiMutation("/api/program/custom", "POST", { name: name.trim(), durationWeeks, startDate, days, idempotencyKey: crypto.randomUUID() });
      show("Ciclo pessoal criado e adicionado ao calendário.", "success");
      setAiDraft(null);
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
    <Card className="ai-workout-card">
      <div className="ai-workout-heading"><span><Bot /></span><div><span className="eyebrow">ASSISTENTE DE TREINO</span><h2>Montar com inteligência artificial</h2><p>Descreva objetivo, dias disponíveis, preferências e limitações. A IA prepara um rascunho editável; nada é salvo automaticamente.</p></div></div>
      <label>Como você quer treinar?<textarea value={aiPrompt} maxLength={3000} rows={5} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Ex.: Quero hipertrofia 4 vezes por semana, com prioridade em costas e pernas. Tenho 60 minutos por treino e prefiro máquinas..." /></label>
      <div className="ai-pdf-upload">
        <div><FileText /><span><strong>Conteúdo em PDF</strong><small>Até 3 arquivos · 5 MB cada · PDFs com texto selecionável</small></span><label className="ai-pdf-picker"><Upload /> ADICIONAR PDF<input type="file" accept=".pdf,application/pdf" multiple onChange={(event) => { addPdfFiles(event.target.files); event.target.value = ""; }} /></label></div>
        {pdfFiles.length > 0 && <ul>{pdfFiles.map((file) => <li key={`${file.name}-${file.size}-${file.lastModified}`}><span><FileText />{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" aria-label={`Remover ${file.name}`} onClick={() => setPdfFiles((current) => current.filter((item) => item !== file))}><X /></button></li>)}</ul>}
      </div>
      <div className="ai-workout-privacy"><ShieldCheck /><span>O texto dos PDFs só é enviado à DeepSeek quando você usa o botão de conteúdo adicionado. Os arquivos não são armazenados; nome, medidas e anotações pessoais continuam fora do envio.</span></div>
      <div className="ai-workout-actions">
        <small>{aiStatusLoading ? "Verificando disponibilidade…" : aiStatusError ? "Não foi possível verificar a IA. Confirme a migration e a configuração." : aiStatus?.available ? `DeepSeek · ${aiStatus.model} · ${aiStatus.remainingToday} de ${aiStatus.dailyLimit} chances · PDF ${aiStatus.pdfUsesToday}/${aiStatus.pdfDailyLimit} (custa ${aiStatus.pdfGenerationCost})` : "Adicione DEEPSEEK_API_KEY aos secrets para habilitar."}</small>
        <div className="ai-workout-buttons"><Button type="button" variant="secondary" loading={generatingMode === "pdf"} disabled={generatingMode !== null || aiStatusLoading || !aiStatus?.available || aiStatus.remainingToday < (aiStatus.pdfGenerationCost ?? 5) || aiStatus.pdfRemainingToday < 1 || pdfFiles.length < 1} onClick={() => void generateWithPdf()}><FileText /> USAR CONTEÚDO ADICIONADO</Button><Button type="button" loading={generatingMode === "text"} disabled={generatingMode !== null || aiStatusLoading || !aiStatus?.available || aiStatus.remainingToday < 1 || aiPrompt.trim().length < 20} onClick={() => void generateWithAi()}><Sparkles /> GERAR RASCUNHO</Button></div>
      </div>
    </Card>
    {aiDraft && <Card className="ai-draft-summary">
      <div><Sparkles /><div><span className="eyebrow">PRÉVIA GERADA</span><h2>{aiDraft.name}</h2></div></div>
      <p>{aiDraft.summary}</p>
      {aiDraft.warnings.length > 0 && <div className="ai-draft-warnings"><strong>Cuidados antes de salvar</strong><ul>{aiDraft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
      <small>Confira todos os exercícios abaixo. Você pode trocar nomes, séries, repetições, RIR e descanso antes de adicionar ao calendário.</small>
    </Card>}
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
      <Button loading={saving} disabled={!valid} onClick={() => void create()}><Save /> {aiDraft ? "SALVAR NO CALENDÁRIO" : "CRIAR CICLO"}</Button>
    </Card>
    <section><div className="section-heading"><div><span className="eyebrow">SEUS CICLOS</span><h2>Planejamentos criados</h2></div></div>{loading ? <Skeleton className="block-skeleton" /> : <div className="custom-program-list">{data?.programs.length ? data.programs.map((program) => <Card key={program.id}><div><strong>{program.name}</strong><span>{program.durationWeeks} semanas · {program.dayCount} dias por semana</span><small>{new Date(`${program.startDate}T12:00:00`).toLocaleDateString("pt-BR")} até {new Date(`${program.endDate}T12:00:00`).toLocaleDateString("pt-BR")}</small></div>{program.active ? <button type="button" onClick={() => void archive(program.id, program.version)}>Encerrar</button> : <em>Encerrado</em>}</Card>) : <Card className="empty-state"><p>Nenhum ciclo pessoal criado.</p></Card>}</div>}</section>
  </div>;
}
