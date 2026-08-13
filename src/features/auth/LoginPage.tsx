import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { Button } from "../../components/ui";
import { ApiError } from "../../lib/api";

export function LoginPage() {
  const { me, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (me) return <Navigate to="/app" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try { await login(username, password); navigate((location.state as { from?: string } | null)?.from ?? "/app", { replace: true }); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Não foi possível entrar. Verifique sua conexão."); }
    finally { setLoading(false); }
  };
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand brand-login"><span className="brand-mark"><Activity /></span><span>FORM<small>TRAINING LOG</small></span></div>
        <div><span className="eyebrow">PROGRESSO COM PROPÓSITO</span><h1>Treine com clareza.<br /><em>Evolua com dados.</em></h1><p>Seu programa anual, seus registros e sua recuperação em um só lugar — sempre fiel à pesquisa.</p></div>
        <div className="science-proof"><ShieldCheck /><span><strong>Baseado em evidências</strong><small>Programas derivados de pesquisa científica de 2026.</small></span></div>
      </section>
      <section className="login-panel">
        <form onSubmit={(event) => void submit(event)}>
          <div className="mobile-login-brand"><Activity /> FORM</div>
          <span className="eyebrow">ÁREA PRIVADA</span><h2>Bem-vindo de volta</h2><p>Use suas credenciais pessoais para continuar.</p>
          <label>Usuário<div className="input-shell"><UserRound size={19} /><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Seu usuário" required /></div></label>
          <label>Senha<div className="input-shell"><LockKeyhole size={19} /><input type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required /><button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <Button type="submit" loading={loading}>ENTRAR <ArrowRight size={19} /></Button>
          <small className="secure-note"><LockKeyhole size={13} /> Sessão protegida e dados privados</small>
        </form>
      </section>
    </div>
  );
}
