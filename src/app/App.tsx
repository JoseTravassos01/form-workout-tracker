import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Skeleton } from "../components/ui";
import { AppShell } from "./AppShell";
import { ProtectedRoute } from "./ProtectedRoute";

const LoginPage = lazy(() => import("../features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const CalendarPage = lazy(() => import("../features/calendar/CalendarPage").then((module) => ({ default: module.CalendarPage })));
const ProgramPage = lazy(() => import("../features/program/ProgramPage").then((module) => ({ default: module.ProgramPage })));
const BlockPage = lazy(() => import("../features/program/BlockPage").then((module) => ({ default: module.BlockPage })));
const WorkoutPage = lazy(() => import("../features/workouts/WorkoutPage").then((module) => ({ default: module.WorkoutPage })));
const ExerciseHistoryPage = lazy(() => import("../features/exercises/ExerciseHistoryPage").then((module) => ({ default: module.ExerciseHistoryPage })));
const ProgressPage = lazy(() => import("../features/progress/ProgressPage").then((module) => ({ default: module.ProgressPage })));
const BodyProgressPage = lazy(() => import("../features/progress/BodyProgressPage").then((module) => ({ default: module.BodyProgressPage })));
const StrengthProgressPage = lazy(() => import("../features/progress/StrengthProgressPage").then((module) => ({ default: module.StrengthProgressPage })));
const CheckInPage = lazy(() => import("../features/recovery/CheckInPage").then((module) => ({ default: module.CheckInPage })));
const SciencePage = lazy(() => import("../features/science/SciencePage").then((module) => ({ default: module.SciencePage })));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const HydrationPage = lazy(() => import("../features/hydration/HydrationPage").then((module) => ({ default: module.HydrationPage })));
const CustomProgramPage = lazy(() => import("../features/program/CustomProgramPage").then((module) => ({ default: module.CustomProgramPage })));

function PageLoader() {
  return <div className="page-stack" aria-label="Carregando página"><Skeleton className="workout-head-skeleton" /><Skeleton className="chart-skeleton" /></div>;
}

export function App() {
  return <Suspense fallback={<PageLoader />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="today" element={<DashboardPage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="program" element={<ProgramPage />} />
      <Route path="program/:blockId" element={<BlockPage />} />
      <Route path="program/custom/create" element={<CustomProgramPage />} />
      <Route path="workout/:sessionId" element={<WorkoutPage />} />
      <Route path="exercises/:exerciseId" element={<ExerciseHistoryPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="progress/body" element={<BodyProgressPage />} />
      <Route path="progress/strength" element={<StrengthProgressPage />} />
      <Route path="check-in" element={<CheckInPage />} />
      <Route path="science" element={<SciencePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="hydration" element={<HydrationPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/app" replace />} />
  </Routes></Suspense>;
}
