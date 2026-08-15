import { useEffect } from "react";
import { apiGet } from "../../lib/api";

interface ReminderDto { settings: { dailyGoalMl: number; reminderEnabled: boolean; reminderTime: string }; todayMl: number }

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function HydrationReminder() {
  useEffect(() => {
    const check = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const date = localDate();
      if (localStorage.getItem("hydration-reminder-date") === date) return;
      const data = await apiGet<ReminderDto>(`/api/hydration?date=${date}`);
      const time = new Date().toTimeString().slice(0, 5);
      if (!data.settings.reminderEnabled || time < data.settings.reminderTime || data.todayMl >= data.settings.dailyGoalMl) return;
      const options: NotificationOptions = { body: `Você registrou ${data.todayMl} de ${data.settings.dailyGoalMl} ml hoje.`, icon: "/icon.svg", tag: `hydration-${date}` };
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) await registration.showNotification("Hora de atualizar sua água", options);
      else new Notification("Hora de atualizar sua água", options);
      localStorage.setItem("hydration-reminder-date", date);
    };
    const safeCheck = () => { void check().catch(() => undefined); };
    safeCheck();
    window.addEventListener("focus", safeCheck);
    const interval = window.setInterval(safeCheck, 5 * 60 * 1000);
    return () => { window.removeEventListener("focus", safeCheck); window.clearInterval(interval); };
  }, []);
  return null;
}
