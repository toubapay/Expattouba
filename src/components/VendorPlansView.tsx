import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Star, Loader2, CreditCard } from "lucide-react";
import { useAuth } from "./AuthContext";

interface Plan {
  id: string;
  name: string;
  priceFcfa: number;
  durationDays: number;
  maxListings: number | null;
  featuredHome: boolean;
  active: boolean;
}

interface VendorPlansViewProps {
  onBack: () => void;
}

export function VendorPlansView({ onBack }: VendorPlansViewProps) {
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paydunyaEnabled, setPaydunyaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/payments/vendor-plans").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/payments/paydunya-status").then((r) => (r.ok ? r.json() : { enabled: false })),
    ])
      .then(([plansData, status]) => {
        setPlans(plansData);
        setPaydunyaEnabled(status.enabled);
      })
      .finally(() => setLoading(false));
  }, []);

  const payWithPaydunya = async (plan: Plan) => {
    setBuyingId(plan.id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/vendors/plans/${plan.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du paiement");
      // Hosted checkout — a full-page redirect, not an in-app navigation.
      // The vendor comes back to this same app via Paydunya's return_url.
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
      setBuyingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center md:bg-black/50 md:p-6">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-gray-50 flex flex-col w-full h-full md:h-[85vh] md:max-w-lg md:rounded-3xl overflow-hidden md:shadow-2xl"
      >
      <div className="px-4 pt-12 md:pt-6 pb-4 border-b border-gray-100 bg-white flex items-center space-x-3">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Offres vendeur</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            {!paydunyaEnabled && (
              <div className="bg-yellow-50 text-yellow-800 text-sm font-medium p-3 rounded-xl">
                Le paiement en ligne n'est pas encore activé. Contactez un administrateur pour activer une offre.
              </div>
            )}
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center space-x-2 mb-1">
                  <h2 className="font-black text-lg text-gray-900">{plan.name}</h2>
                  {plan.featuredHome && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-orange-600 font-black mb-3">
                  {plan.priceFcfa > 0
                    ? `${plan.priceFcfa.toLocaleString("fr-FR")} FCFA`
                    : "Gratuit"}
                  <span className="text-gray-400 font-medium text-sm"> / {plan.durationDays}j</span>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>Annonces actives : {plan.maxListings ?? "Illimité"}</li>
                  {plan.featuredHome && <li>Mise en avant sur la page d'accueil</li>}
                </ul>
                {plan.priceFcfa > 0 ? (
                  <button
                    onClick={() => payWithPaydunya(plan)}
                    disabled={!paydunyaEnabled || buyingId === plan.id}
                    className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{buyingId === plan.id ? "Redirection..." : "Payer avec Paydunya"}</span>
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 font-medium text-center">Attribuée par un administrateur</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </motion.div>
    </div>
  );
}
