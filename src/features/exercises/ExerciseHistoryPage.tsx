import { ArrowLeft, Dumbbell, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExerciseHistoryDto } from "../../../shared/api";
import { Card, EmptyState, PageHeader, Skeleton } from "../../components/ui";
import { useApi } from "../../lib/use-api";

export function ExerciseHistoryPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useApi<ExerciseHistoryDto>(`/api/exercises/${encodeURIComponent(exerciseId ?? "")}/history`);
  if (loading) return <Skeleton className="chart-skeleton" />;
  if (error || !data) return <EmptyState icon={<Dumbbell />} title="Histórico indisponível" text="O exercício não pertence a este programa ou não pôde ser carregado." />;
  const chart = data.sessions.slice().reverse();
  return <div className="page-stack exercise-history">
    <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft /> Voltar ao treino</button>
    <PageHeader eyebrow={`${data.exercise.muscleGroup}${data.exercise.equipment ? ` · ${data.exercise.equipment}` : ""}`} title={data.exercise.name} />
    <div className="metric-grid strength-metrics">
      <Card><span>MAIOR CARGA</span><strong>{data.bestLoad || "—"}<small> kg</small></strong></Card>
      <Card><span>MAIS REPETIÇÕES</span><strong>{data.bestReps || "—"}</strong></Card>
      <Card><span>VOLUME TOTAL</span><strong>{data.volume ? Math.round(data.volume).toLocaleString("pt-BR") : "—"}<small> kg</small></strong></Card>
      <Card><span>SESSÕES</span><strong>{data.sessionCount}</strong></Card>
    </div>
    <Card className="chart-card">{chart.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={chart}><CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,.08)" /><XAxis dataKey="scheduledDate" tickFormatter={(value: string) => value.slice(5)} stroke="#69736d" /><YAxis stroke="#69736d" /><Tooltip contentStyle={{ background: "#171c19", border: "1px solid #29322d" }} /><Line name="Maior carga (kg)" dataKey="maxLoadKg" stroke="var(--accent)" strokeWidth={3} /></LineChart></ResponsiveContainer> : <EmptyState icon={<Dumbbell />} title="Sem histórico" text="As séries confirmadas pelo servidor aparecerão aqui." />}</Card>
    {data.sessions.length > 0 && <Card className="performance-list"><div className="section-heading"><div><span className="eyebrow">ÚLTIMAS SESSÕES</span><h2>Carga, repetições e RIR</h2></div><Trophy /></div>{data.sessions.slice(0, 12).map((session) => <div className="history-session" key={session.sessionId}><span>{new Date(`${session.scheduledDate}T12:00:00`).toLocaleDateString("pt-BR")} · volume {Math.round(session.volumeKg).toLocaleString("pt-BR")} kg</span><div>{session.sets.map((set) => <strong key={`${session.sessionId}:${set.setNumber}`}>Série {set.setNumber}: {set.loadKg}kg × {set.reps} <small>@{set.actualRir} RIR</small>{set.notes && <em>{set.notes}</em>}</strong>)}</div></div>)}</Card>}
  </div>;
}
