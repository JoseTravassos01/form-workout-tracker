import { BellRing, Pause, Play, Plus, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RestTimer({ initialSeconds, exerciseName, onClose }: { initialSeconds: number; exerciseName: string; onClose(): void }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);
  const notified = useRef(false);
  useEffect(() => {
    if (paused || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [paused, seconds]);
  useEffect(() => {
    if (seconds === 0 && !notified.current) {
      notified.current = true;
      if ("vibrate" in navigator) navigator.vibrate([180, 80, 180]);
    }
  }, [seconds]);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return (
    <div className={`rest-timer ${seconds === 0 ? "timer-done" : ""}`} role="timer" aria-live="polite">
      <div><span className="timer-icon">{seconds === 0 ? <BellRing /> : <Pause />}</span><div><small>{seconds === 0 ? "DESCANSO CONCLUÍDO" : "DESCANSO"}</small><strong>{minutes}:{remainder}</strong><span>{exerciseName}</span></div></div>
      <div className="timer-actions"><button onClick={() => setSeconds((value) => value + 30)}><Plus />30s</button><button aria-label={paused ? "Retomar" : "Pausar"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</button><button onClick={onClose}><SkipForward /> Pular</button><button aria-label="Fechar temporizador" onClick={onClose}><X /></button></div>
    </div>
  );
}
