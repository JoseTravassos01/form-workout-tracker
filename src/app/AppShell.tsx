import { Activity, CalendarDays, Droplets, Dumbbell, FlaskConical, Home, LogOut, Menu, TrendingUp, UserRound, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SyncStatus } from "../components/SyncStatus";
import { useAuth } from "./AuthProvider";
import { HydrationReminder } from "../features/hydration/HydrationReminder";

const nav = [
  { to: "/app", label: "Hoje", icon: Home, end: true },
  { to: "/app/calendar", label: "Calendário", icon: CalendarDays },
  { to: "/app/program", label: "Programa", icon: Dumbbell },
  { to: "/app/progress", label: "Progresso", icon: TrendingUp },
  { to: "/app/profile", label: "Perfil", icon: UserRound },
];

export function AppShell() {
  const { me, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <div className="app-shell" style={{ "--accent": me?.athlete.accentColor } as React.CSSProperties}>
      <HydrationReminder />
      <aside className={`desktop-sidebar ${menu ? "mobile-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Activity /></span><span>FORM<small>TRAINING LOG</small></span></div>
        <button className="close-menu" aria-label="Fechar menu" onClick={() => setMenu(false)}><X /></button>
        <nav>{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-secondary">
          <NavLink to="/app/hydration"><Droplets size={20} /> Hidratação</NavLink>
          <NavLink to="/app/check-in"><Activity size={20} /> Check-in</NavLink>
          <NavLink to="/app/science"><FlaskConical size={20} /> Ciência</NavLink>
          <button onClick={() => void logout()}><LogOut size={20} /> Sair</button>
        </div>
      </aside>
      {menu && <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMenu(false)} />}
      <div className="content-column">
        <div className="topbar"><button className="menu-button" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></button><SyncStatus /><div className="mini-profile"><span>{me?.athlete.name.slice(0, 1).toUpperCase()}</span><div><strong>{me?.athlete.name}</strong><small>Semana em curso</small></div></div></div>
        <main className="main-content"><Outlet /></main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon size={21} /><span>{label}</span></NavLink>)}</nav>
    </div>
  );
}
