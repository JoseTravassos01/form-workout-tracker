import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { loading?: boolean; variant?: "primary" | "secondary" | "ghost" | "danger" }
export function Button({ loading, variant = "primary", className = "", children, disabled, ...props }: ButtonProps) {
  return <button className={`button button-${variant} ${className}`} disabled={disabled || loading} {...props}>{loading && <LoaderCircle className="spin" size={18} />}{children}</button>;
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1></div>{action}</header>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden="true" />; }

export function EmptyState({ icon, title, text, children }: PropsWithChildren<{ icon: ReactNode; title: string; text: string }>) {
  return <Card className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p>{children}</Card>;
}

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = { scheduled: "Planejado", in_progress: "Em andamento", completed: "Concluído", missed: "Perdido", rescheduled: "Reagendado", partial: "Parcial", green: "Verde", yellow: "Amarelo", red: "Vermelho", pain: "Atenção" };
  return <span className={`status-pill status-${status}`}>{labels[status] ?? status}</span>;
}
