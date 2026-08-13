import { ArrowRight, BatteryCharging, CalendarClock, Check, ChevronRight, Dumbbell, Flame, Play, Scale, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { WorkoutDto } from "../../../shared/api";
import { useAuth } from "../../app/AuthProvider";
import { Card, EmptyState, PageHeader, Skeleton, StatusPill } from "../../components/ui";
import { useApi } from "../../lib/use-api";

interface DashboardDto {
  workout: WorkoutDto | null;
  cardio: null | { id: string; modality: string; durationMin: number; durationMax: number; intensity: string; rpeMin: number; rpeMax: number };
  state: { week: number; block: number; blockName: string; today: string };
  weeklyCompleted: number;
  weeklyScheduled: number;
  completedTotal: number;
  streak: number;
  nextSession: null | { date: string; name: string; kind: string; status: string };
  weights: Array<{ measuredAt: string; weightKg: number }>;
  recovery: null | { status: string; recommendation: string };
}

function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"; }

export function DashboardPage() {
  const { me } = useAuth();
  const { data, loading, error, refresh } = useApi<DashboardDto>("/api/dashboard");
  if (loading) return <div className="page-stack"><Skeleton className="hero-skeleton" /><div className="metric-grid"><Skeleton className="metric-skeleton" /><Skeleton className="metric-skeleton" /></div></div>;
  if (error || !data) return <EmptyState icon={<BatteryCharging />} title="Não foi possível carregar seu dia" text="Verifique sua conexão e tente novamente."><button className="button button-primary" onClick={() => void refresh()}>Tentar novamente</button></EmptyState>;
  const latest = data.weights[0]; const previous = data.weights[1]; const diff = latest && previous ? latest.weightKg - previous.weightKg : null;
  return (
    <div className="page-stack dashboard-page">
      <PageHeader eyebrow={`${greeting()},`} title={me?.athlete.name ?? "Atleta"} action={<div className="week-badge"><span>SEMANA</span><strong>{data.state.week}<small>/52</small></strong></div>} />
      <div className="block-strip"><span>BLOCO {data.state.block}</span><strong>{data.state.blockName}</strong><div><span style={{ width: `${Math.min(100, data.state.week / 52 * 100)}%` }} /></div></div>
      {data.workout ? (
        <Card className="today-hero">
          <div className="today-label"><span>HOJE</span><StatusPill status={data.workout.status} /></div>
          <div className="today-main"><div><span className="workout-index">TREINO DO DIA</span><h2>{data.workout.name}</h2><p>{data.workout.description || "Sessão prevista pelo programa atual."}</p></div><div className="hero-icon"><Dumbbell /></div></div>
          <div className="workout-meta"><span><Timer /> {data.workout.durationMin ? `${data.workout.durationMin}–${data.workout.durationMax} min` : "Tempo pelo seu ritmo"}</span><span><Dumbbell /> {data.workout.exercises.length} exercícios</span><span><Check /> {data.workout.completionPercent}%</span></div>
          <Link className="button button-primary hero-cta" to={`/app/workout/${encodeURIComponent(data.workout.id)}`}><Play fill="currentColor" size={18} /> {data.workout.status === "in_progress" ? "CONTINUAR TREINO" : data.workout.status === "completed" ? "VER TREINO" : "INICIAR TREINO"}<ArrowRight /></Link>
        </Card>
      ) : data.cardio ? (
        <Card className="today-hero cardio-hero"><div className="today-label"><span>HOJE</span><StatusPill status="scheduled" /></div><div className="today-main"><div><span className="workout-index">CARDIO</span><h2>{data.cardio.modality}</h2><p>{data.cardio.durationMin}–{data.cardio.durationMax} min · RPE {data.cardio.rpeMin}–{data.cardio.rpeMax}</p></div><div className="hero-icon"><TrendingUp /></div></div><Link className="button button-primary hero-cta" to="/app/calendar"><Play fill="currentColor" /> INICIAR CARDIO</Link></Card>
      ) : <EmptyState icon={<BatteryCharging />} title="Dia de recuperação" text="Não há sessão de força ou cardio prescrita para hoje. Recuperar também faz parte do programa." />}
      <section><div className="section-heading"><div><span className="eyebrow">VISÃO RÁPIDA</span><h2>Sua semana</h2></div><Link to="/app/calendar">Ver calendário <ChevronRight /></Link></div><div className="metric-grid">
        <Card className="metric-card"><div className="metric-icon"><CalendarClock /></div><div><span>Progresso semanal</span><strong>{data.weeklyCompleted}<small>/{data.weeklyScheduled}</small></strong><div className="mini-progress"><span style={{ width: `${data.weeklyCompleted / data.weeklyScheduled * 100}%` }} /></div></div></Card>
        <Card className="metric-card"><div className="metric-icon"><Flame /></div><div><span>Sequência atual</span><strong>{data.streak}</strong><small>{data.streak === 1 ? "treino seguido" : "treinos seguidos"} · {data.completedTotal} no total</small></div></Card>
        <Card className="metric-card"><div className="metric-icon"><Scale /></div><div><span>Último peso</span><strong>{latest ? `${latest.weightKg.toFixed(1)} kg` : "—"}</strong>{diff != null && <small className={diff <= 0 ? "trend-good" : ""}>{diff <= 0 ? <TrendingDown /> : <TrendingUp />}{diff > 0 ? "+" : ""}{diff.toFixed(1)} kg</small>}</div></Card>
        <Card className="metric-card"><div className="metric-icon"><BatteryCharging /></div><div><span>Recuperação</span><strong className="recovery-value">{data.recovery?.status ? data.recovery.status.toUpperCase() : "Pendente"}</strong><Link to="/app/check-in">Fazer check-in</Link></div></Card>
      </div></section>
      <Card className="next-card"><div><span className="eyebrow">PRÓXIMA SESSÃO</span><h3>{data.nextSession?.name ?? "Acompanhe sem adivinhar"}</h3><p>{data.nextSession ? `${new Date(`${data.nextSession.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })} · ${data.nextSession.kind === "cardio" ? "Cardio" : "Treino"}` : "Registre carga, repetições e RIR para que a sugestão siga as regras da pesquisa."}</p></div><Link to={data.nextSession ? "/app/calendar" : "/app/progress/strength"} aria-label="Ver próximo passo"><ChevronRight /></Link></Card>
    </div>
  );
}
