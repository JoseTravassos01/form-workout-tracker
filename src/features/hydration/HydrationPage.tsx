import { Bell, BellRing, Droplets, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "../../app/ToastProvider";
import { Button, Card, PageHeader, Skeleton } from "../../components/ui";
import { apiMutation } from "../../lib/api";
import { useApi } from "../../lib/use-api";

interface HydrationDto {
  settings: { dailyGoalMl: number; reminderEnabled: boolean; reminderTime: string; version: number };
  todayMl: number;
  history: Array<{ localDate: string; totalMl: number }>;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function HydrationPage() {
  const { show } = useToast();
  const date = localDate();
  const { data, loading, refresh } = useApi<HydrationDto>(`/api/hydration?date=${date}`);
  const [customAmount, setCustomAmount] = useState(300);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const progress = useMemo(() => data ? Math.min(100, Math.round(data.todayMl / data.settings.dailyGoalMl * 100)) : 0, [data]);

  const add = async (amountMl: number) => {
    try {
      await apiMutation("/api/hydration/logs", "POST", { localDate: date, loggedAt: new Date().toISOString(), amountMl, idempotencyKey: crypto.randomUUID() }, true);
      show(`${amountMl} ml adicionados.`, "success");
      await refresh();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível registrar a água.", "error"); }
  };

  const saveSettings = async (reminderEnabled: boolean) => {
    if (!data) return;
    setSaving(true);
    try {
      if (reminderEnabled && !("Notification" in window)) {
        show("Este navegador não oferece notificações para o app. O acompanhamento de água continua funcionando.", "info");
        reminderEnabled = false;
      } else if (reminderEnabled && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          show("A permissão de notificação não foi concedida. O acompanhamento de água continua funcionando.", "info");
          reminderEnabled = false;
        }
      }
      await apiMutation("/api/hydration/settings", "PATCH", {
        dailyGoalMl: goal ?? data.settings.dailyGoalMl,
        reminderEnabled,
        reminderTime: time ?? data.settings.reminderTime,
        version: data.settings.version,
      });
      setGoal(null); setTime(null);
      show("Configurações de hidratação salvas.", "success");
      await refresh();
    } catch (error) { show(error instanceof Error ? error.message : "Não foi possível salvar.", "error"); }
    finally { setSaving(false); }
  };

  if (loading || !data) return <div className="page-stack"><Skeleton className="hero-skeleton" /><Skeleton className="chart-skeleton" /></div>;
  return <div className="page-stack hydration-page">
    <PageHeader eyebrow="HÁBITO DIÁRIO" title="Hidratação" />
    <Card className="hydration-hero">
      <div className="hydration-ring" style={{ "--hydration-progress": `${progress * 3.6}deg` } as React.CSSProperties}><Droplets /><strong>{progress}%</strong></div>
      <div><span>HOJE</span><h2>{data.todayMl.toLocaleString("pt-BR")} <small>/ {data.settings.dailyGoalMl.toLocaleString("pt-BR")} ml</small></h2><p>Registre o que bebeu ao longo do dia. A meta é pessoal e pode ser alterada abaixo.</p></div>
    </Card>
    <Card className="hydration-quick"><h2>Adicionar água</h2><div className="hydration-buttons">{[250, 500, 750].map((amount) => <Button variant="secondary" key={amount} onClick={() => void add(amount)}><Plus /> {amount} ml</Button>)}</div><div className="hydration-custom"><label>Outra quantidade (ml)<input type="number" min="1" max="5000" value={customAmount} onChange={(event) => setCustomAmount(Number(event.target.value))} /></label><Button disabled={customAmount < 1 || customAmount > 5000} onClick={() => void add(customAmount)}>ADICIONAR</Button></div></Card>
    <Card className="hydration-settings"><div><BellRing /><div><h2>Lembrete diário</h2><p>Mostra um lembrete no horário escolhido quando a meta ainda não foi atingida e o app estiver em uso.</p></div></div><div className="hydration-settings-grid"><label>Meta diária (ml)<input type="number" min="250" max="10000" value={goal ?? data.settings.dailyGoalMl} onChange={(event) => setGoal(Number(event.target.value))} /></label><label>Horário<input type="time" value={time ?? data.settings.reminderTime} onChange={(event) => setTime(event.target.value)} /></label></div><Button loading={saving} onClick={() => void saveSettings(!data.settings.reminderEnabled)}>{data.settings.reminderEnabled ? <Bell /> : <BellRing />}{data.settings.reminderEnabled ? "DESATIVAR LEMBRETE" : "ATIVAR E SALVAR"}</Button>{(goal != null || time != null) && <Button variant="secondary" loading={saving} onClick={() => void saveSettings(data.settings.reminderEnabled)}>SALVAR META E HORÁRIO</Button>}<small>No iPhone, instale o site na Tela de Início para habilitar notificações do PWA. Este lembrete local não envia alertas com o app totalmente fechado.</small></Card>
    <section><div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Últimos 14 dias</h2></div></div><Card className="hydration-history">{data.history.length === 0 ? <p>Ainda não há registros.</p> : data.history.map((item) => <div key={item.localDate}><span>{new Date(`${item.localDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</span><strong>{Number(item.totalMl).toLocaleString("pt-BR")} ml</strong></div>)}</Card></section>
  </div>;
}
