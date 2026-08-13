import { Navigate } from "react-router-dom";
import { Skeleton } from "../components/ui";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="boot-loader"><Skeleton className="boot-logo" /><Skeleton className="boot-line" /></div>;
  if (!me) return <Navigate to="/login" replace />;
  return children;
}
