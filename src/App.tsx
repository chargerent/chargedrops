import React from "react";
import { Routes, Route, Outlet, Navigate, useParams } from "react-router-dom";

// Import your new pages
import HomePage from "./HomePage";
import PublicMapPage from "./PublicMapPage";
import AdminLoginPage from "./AdminLoginPage";
import AdminDashboardPage from "./AdminDashboardPage";

const ProtectedRoute: React.FC = () => {
  // NOTE: Authentication is temporarily bypassed for development.
  // To re-enable login, uncomment the lines below and remove `return <Outlet />;`
  return <Outlet />;

  // import { getAuth, onAuthStateChanged } from "firebase/auth";
  // import { Navigate } from "react-router-dom";
  // const auth = getAuth(); // ...
  // const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null); // ...
  // const unsubscribe = onAuthStateChanged(auth, (user) => setIsAuthenticated(!!user)); // ...

  // if (isAuthenticated === null) return <div>Loading...</div>;
  // return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" />;
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
  );
};
export default App;
