import { ArrowLeft, CalendarRange, Dumbbell, Gauge, Repeat2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, EmptyState, Skeleton } from "../../components/ui";
import { useApi } from "../../lib/use-api";

interface BlockDto { block: { id: string; blockNumber: number; name: string; startWeek: number; endWeek: number; objective: string; description: string; differences: string; volumeSummary: string }; days: Array<{ id: string; weekday: number; name: string; description: string; durationMin: number | null; durationMax: number | null; exerciseCount: number }> }
const weekdays = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export function BlockPage() {
  const { blockId } = useParams(); const navigate = useNavigate(); const { data, loading, error } = useApi<BlockDto>(`/api/program/blocks/${encodeURIComponent(blockId ?? "")}`);
  if (loading) return <div className="page-stack"><Skeleton className="program-hero-skeleton" /><Skeleton className="exercise-skeleton" /></div>;
  if (error || !data) return <EmptyState icon={<Dumbbell />} title="Bloco não encontrado" text="Este bloco não pertence ao programa atual." />;
  return <div className="page-stack block-page"><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft /> Voltar ao programa</button><header className="block-hero"><span>BLOCO {data.block.blockNumber} · SEMANAS {data.block.startWeek}–{data.block.endWeek}</span><h1>{data.block.name}</h1><p>{data.block.objective}</p></header><div className="detail-grid"><Card><Gauge /><span>OBJETIVO</span><p>{data.block.description}</p></Card><Card><Repeat2 /><span>DIFERENÇAS</span><p>{data.block.differences}</p></Card><Card><CalendarRange /><span>VOLUME</span><p>{data.block.volumeSummary}</p></Card></div><section><div className="section-heading"><div><span className="eyebrow">MICROCICLO</span><h2>Divisão semanal</h2></div></div><div className="training-day-list">{data.days.map((day) => <Card key={day.id}><span className="day-abbr">{weekdays[day.weekday]?.slice(0, 3).toUpperCase()}</span><div><small>{weekdays[day.weekday]}</small><h3>{day.name}</h3><p>{day.description}</p></div><div className="day-count"><strong>{day.exerciseCount}</strong><small>exercícios</small></div></Card>)}</div></section></div>;
}
