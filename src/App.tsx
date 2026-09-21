import React, { Suspense, lazy, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Routes, Route, Outlet, Navigate, useParams } from "react-router-dom";

import HomePage from "./HomePage";
import AdminLoginPage from "./AdminLoginPage";

const PublicMapPage = lazy(() => import("./PublicMapPage"));
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage"));

const ProtectedRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setIsAuthenticated(Boolean(user));
    });

    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
        Checking your session...
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

/**
 * A component that redirects from the old city URL format (/:citySlug)
 * to the new format (/map/:citySlug).
 */
const LegacyCityRedirect: React.FC = () => {
  const { citySlug } = useParams();
  return <Navigate to={`/map/${citySlug}`} replace />;
};

const App: React.FC = () => {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-600">Loading...</div>}>
      <Routes>
        {/* Public map routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/map/:citySlug" element={<PublicMapPage />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<AdminDashboardPage />} />
        </Route>

        {/* Redirect for old city URLs to the new /map/ structure */}
        <Route path="/:citySlug" element={<LegacyCityRedirect />} />
      </Routes>
    </Suspense>
  );
};
export default App;
