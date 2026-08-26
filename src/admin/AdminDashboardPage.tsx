import { useEffect, useState } from "react";
import { Users, Store, ShoppingBag, Award, Wallet } from "lucide-react";
import { useAdminApi } from "./adminApi";

interface Stats {
  users: number;
  vendors: number;
  listings: number;
  activeListings: number;
  activeSubscriptions: number;
  totalRevenueFcfa: number;
}

export function AdminDashboardPage() {
  const api = useAdminApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  // Tailwind's scanner needs full class names to appear literally in source
  // (interpolating `bg-${color}-50` at runtime produces a string it never
  // saw at build time, so nothing gets generated) — a static map instead.
  const COLORS = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    pink: "bg-pink-50 text-pink-600",
  } as const;

  const cards = stats
    ? [
        { label: "Utilisateurs", value: stats.users, icon: Users, color: COLORS.blue },
        { label: "Vendeurs", value: stats.vendors, icon: Store, color: COLORS.purple },
        { label: "Annonces actives", value: `${stats.activeListings} / ${stats.listings}`, icon: ShoppingBag, color: COLORS.green },
        { label: "Abonnements actifs", value: stats.activeSubscriptions, icon: Award, color: COLORS.orange },
        {
          label: "Revenu abonnements",
          value: `${stats.totalRevenueFcfa.toLocaleString("fr-FR")} FCFA`,
          icon: Wallet,
          color: COLORS.pink,
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Tableau de bord</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
