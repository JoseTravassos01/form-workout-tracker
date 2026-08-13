import { ArrowLeft, Dumbbell, Trophy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StrengthProgressDto } from "../../../shared/api";
import { Card, EmptyState, PageHeader, Skeleton } from "../../components/ui";
import { useApi } from "../../lib/use-api";

export function StrengthProgressPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = params.get("exerciseId");
  const { data, loading } = useApi<StrengthProgressDto>(`/api/progress/strength${selected ? `?exerciseId=${encodeURIComponent(selected)}` : ""}`);
  if (loading || !data) return <div className="page-stack"><Skeleton className="chart-skeleton" /></div>;
  const byDate = data.sessions.slice().reverse();
  return <div className="page-stack strength-progress">
    <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft /> Progresso</button>
    <PageHeader eyebrow="PERFORMANCE" title="Força e volume" />
    <label className="exercise-select">EXERCÍCIO<select value={data.selectedExerciseId} onChange={(event) => setParams({ exerciseId: event.target.value })}>{data.exercises.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="metric-grid strength-metrics"><Card><span>MAIOR CARGA</span><strong>{data.bestLoad || "—"}<small> kg</small></strong></Card><Card><span>MELHOR REPETIÇÃO</span><strong>{data.bestReps || "—"}</strong></Card><Card><span>VOLUME TOTAL</span><strong>{data.volume ? data.volume.toLocaleString("pt-BR") : "—"}<small> kg</small></strong></Card><Card><span>SESSÕES</span><strong>{data.sessionCount}</strong></Card></div>
    <Card className="chart-card"><div className="section-heading"><div><span className="eyebrow">CARGA × TEMPO</span><h2>Evolução registrada</h2></div></div>{byDate.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={byDate}><CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,.08)" /><XAxis dataKey="scheduledDate" tickFormatter={(value: string) => value.slice(5)} stroke="#69736d" /><YAxis stroke="#69736d" /><Tooltip contentStyle={{ background: "#171c19", border: "1px solid #29322d", borderRadius: 12 }} /><Bar name="Maior carga (kg)" dataKey="maxLoadKg" fill="var(--accent)" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState icon={<Dumbbell />} title="Nenhuma série registrada" text="O gráfico será formado com cargas realmente confirmadas pelo servidor." />}</Card>
    {data.sessions.length > 0 && <Card className="performance-list"><div className="section-heading"><div><span className="eyebrow">ÚLTIMAS SESSÕES</span><h2>Histórico</h2></div><Trophy /></div>{data.sessions.slice(0, 12).map((session) => <div className="history-session" key={session.sessionId}><span>{new Date(`${session.scheduledDate}T12:00:00`).toLocaleDateString("pt-BR")} · volume {Math.round(session.volumeKg).toLocaleString("pt-BR")} kg</span><div>{session.sets.map((set) => <strong key={`${session.sessionId}:${set.setNumber}`}>Série {set.setNumber}: {set.loadKg}kg × {set.reps} <small>@{set.actualRir} RIR</small>{set.notes && <em>{set.notes}</em>}</strong>)}</div></div>)}</Card>}
  </div>;
}
