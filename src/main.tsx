import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AuthProvider } from "./app/AuthProvider";
import { ToastProvider } from "./app/ToastProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<StrictMode><BrowserRouter><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></BrowserRouter></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js"); });
