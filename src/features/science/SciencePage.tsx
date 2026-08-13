import { BookOpen, ExternalLink, FlaskConical } from "lucide-react";
import { Card, PageHeader, Skeleton } from "../../components/ui";
import { useApi } from "../../lib/use-api";

interface ScienceDto { topics: Array<{ category: string; title: string; summary: string }>; references: Array<{ topicCategory: string; title: string; doi: string | null; pmid: string | null; url: string }> }
export function SciencePage() {
  const { data, loading } = useApi<ScienceDto>("/api/science");
  if (loading || !data) return <div className="page-stack"><Skeleton className="science-skeleton" /></div>;
  return <div className="page-stack science-page"><PageHeader eyebrow="BASE CIENTÍFICA" title="Por que esse programa é assim?" /><div className="science-hero"><FlaskConical /><div><span>PESQUISA DE 2026</span><h2>Decisões rastreáveis.<br />Nenhum treino inventado.</h2><p>O software organiza e calcula somente o que os documentos-fonte sustentam.</p></div></div><div className="topic-grid">{data.topics.map((topic, index) => <Card key={topic.category}><span>{(index + 1).toString().padStart(2, "0")}</span><h2>{topic.title}</h2><p>{topic.summary}</p>{data.references.filter((reference) => reference.topicCategory === topic.category).map((reference) => <a href={reference.url} target="_blank" rel="noreferrer" key={reference.url}><BookOpen /> {reference.title}<ExternalLink /></a>)}</Card>)}</div><Card className="science-disclaimer"><strong>Limite importante</strong><p>Resumos não substituem os documentos integrais nem orientação clínica. Slots ambíguos permanecem para confirmação humana.</p></Card></div>;
}
