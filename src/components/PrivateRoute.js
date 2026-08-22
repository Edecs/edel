import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

/**
 * Protects routes by Firebase auth session (and optional role).
 * @param {"user"|"admin"|"superadmin"} [requireRole]
 */
const PrivateRoute = ({ children, requireRole = "user" }) => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireRole === "superadmin" && !isSuperAdmin) {
    return <Navigate to="/welcome" replace />;
  }

  if (requireRole === "admin" && !(isAdmin || isSuperAdmin)) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

export default PrivateRoute;
