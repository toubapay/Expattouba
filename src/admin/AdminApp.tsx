import { useState } from "react";
import { Routes, Route, NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Users, Tags, Award, Store, Settings, ArrowLeft, Menu, X } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { AuthView } from "../components/AuthView";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminCategoriesPage } from "./AdminCategoriesPage";
import { AdminPlansPage } from "./AdminPlansPage";
import { AdminSubscriptionsPage } from "./AdminSubscriptionsPage";
import { AdminSettingsPage } from "./AdminSettingsPage";

const NAV = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/plans", label: "Offres & tarifs", icon: Award },
  { to: "/admin/subscriptions", label: "Vendeurs & abonnements", icon: Store },
  { to: "/admin/categories", label: "Catégories", icon: Tags },
  { to: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function AdminApp() {
  const { user, dbUser, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <AuthView />
        </div>
      </div>
    );
  }

  if (!dbUser?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4 p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Accès administrateur requis</h1>
        <p className="text-gray-500 max-w-sm">Ce compte n'a pas les droits pour accéder au panneau d'administration.</p>
        <Link to="/" className="text-orange-600 font-bold flex items-center space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'application</span>
        </Link>
      </div>
    );
  }

  const navLinks = (onNavigate?: () => void) => (
    <>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                isActive ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <Link to="/" className="flex items-center space-x-2 px-3 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'application</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile top bar — the sidebar below is desktop-only (hidden below
          md), so without this a phone would have no way at all to move
          between admin pages past the first one it lands on. */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0">
        <h1 className="font-black text-orange-600">SeneMarket Admin</h1>
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -mr-2 text-gray-700">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h1 className="font-black text-lg text-orange-600">SeneMarket Admin</h1>
              <button onClick={() => setMobileNavOpen(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navLinks(() => setMobileNavOpen(false))}
          </div>
        </div>
      )}

      <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="font-black text-lg text-orange-600">SeneMarket Admin</h1>
        </div>
        {navLinks()}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          <Routes>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
