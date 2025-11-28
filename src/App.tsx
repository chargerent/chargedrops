import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Import your new pages
import HomePage from "./HomePage";
import PublicMapPage from "./PublicMapPage";
import AdminLoginPage from "./AdminLoginPage";
import AdminDashboardPage from "./AdminDashboardPage";

const ProtectedRoute: React.FC = () => {
  // NOTE: Authentication is temporarily bypassed for development.
  // To re-enable login, uncomment the lines below and remove `return <Outlet />;`
  return <Outlet />;

  // const auth = getAuth();
  // const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  // React.useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (user) => setIsAuthenticated(!!user));
  //   return () => unsubscribe();
  // }, [auth]);
  // if (isAuthenticated === null) return <div>Loading...</div>;
  // return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" />;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public map routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/:citySlug" element={<PublicMapPage />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route index element={<AdminDashboardPage />} />
      </Route>
    </Routes>
  );
};
export default App;
