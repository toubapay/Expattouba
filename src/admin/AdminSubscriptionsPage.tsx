import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useAdminApi } from "./adminApi";

interface Vendor {
  id: string;
  boutiqueName: string;
  whatsappNumber: string | null;
  badgeStatus: string | null;
}

interface Plan {
  id: string;
  name: string;
  priceFcfa: number;
  durationDays: number;
  active: boolean;
}

interface SubscriptionRow {
  subscription: {
    id: string;
    vendorId: string;
    status: string;
    startedAt: string;
    expiresAt: string;
    pricePaidFcfa: number;
  };
  plan: Plan;
}

export function AdminSubscriptionsPage() {
  const api = useAdminApi();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.get("/subscriptions").then(setSubscriptions).catch((e) => setError(e.message));
    api.get("/plans").then((p: Plan[]) => setPlans(p.filter((x) => x.active))).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!vendorSearch.trim()) return setVendors([]);
      api.get(`/vendors?search=${encodeURIComponent(vendorSearch)}`).then(setVendors).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [vendorSearch]);

  const assign = async () => {
    if (!selectedVendor || !selectedPlanId) return;
    try {
      await api.post("/subscriptions", { vendorId: selectedVendor.id, planId: selectedPlanId });
      setSelectedVendor(null);
      setSelectedPlanId("");
      setVendorSearch("");
      setVendors([]);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("Annuler cet abonnement ?")) return;
    await api.post(`/subscriptions/${id}/cancel`);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Vendeurs & abonnements</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white p-5 rounded-2xl border border-gray-100 mb-6">
        <h2 className="font-bold text-gray-900 mb-3">Attribuer une offre à un vendeur</h2>
        <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3">
          <div>
            {selectedVendor ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                <span className="font-bold text-orange-700 text-sm">{selectedVendor.boutiqueName}</span>
                <button onClick={() => setSelectedVendor(null)}>
                  <X className="w-4 h-4 text-orange-500" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Rechercher un vendeur (nom boutique)..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm font-medium"
                />
                {vendors.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {vendors.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVendor(v);
                          setVendors([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm font-medium"
                      >
                        {v.boutiqueName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium"
          >
            <option value="">Choisir une offre...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.priceFcfa.toLocaleString("fr-FR")} FCFA / {p.durationDays}j)
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            disabled={!selectedVendor || !selectedPlanId}
            className="bg-gray-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-40"
          >
            Attribuer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="text-left p-3">Offre</th>
              <th className="text-left p-3">Prix payé</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Expire le</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(({ subscription: s, plan }) => (
              <tr key={s.id} className="border-t border-gray-50">
                <td className="p-3 font-bold">{plan?.name ?? "—"}</td>
                <td className="p-3">{s.pricePaidFcfa.toLocaleString("fr-FR")} FCFA</td>
                <td className="p-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-md ${
                      s.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{new Date(s.expiresAt).toLocaleDateString("fr-FR")}</td>
                <td className="p-3">
                  {s.status === "ACTIVE" && (
                    <button onClick={() => cancel(s.id)} className="text-red-500 font-bold text-xs">
                      Annuler
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscriptions.length === 0 && <div className="p-8 text-center text-gray-400 font-medium">Aucun abonnement.</div>}
      </div>
    </div>
  );
}
