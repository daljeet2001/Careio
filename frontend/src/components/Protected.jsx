import { useLocation, Navigate, Outlet } from "react-router";

export function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
