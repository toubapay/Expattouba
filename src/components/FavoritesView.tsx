import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { ProductDetailView } from "./ProductDetailView";
import { summarizeAttributes } from "../lib/categoryFields";

interface FavoritesViewProps {
  onBack: () => void;
}

/** Mirrors ChatInboxView.tsx's shape — a full-screen list opened from
 * Profil, this time of saved listings rather than conversations. */
export function FavoritesView({ onBack }: FavoritesViewProps) {
  const { getToken } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/favorites", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) setListings(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center md:bg-black/50 md:p-6">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white flex flex-col w-full h-full md:h-[80vh] md:max-w-lg md:rounded-3xl overflow-hidden md:shadow-2xl"
      >
      <div className="px-4 pt-12 md:pt-4 pb-4 border-b border-gray-100 flex items-center space-x-3">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Mes favoris</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center text-gray-400 font-medium py-12 px-6">
            Aucune annonce enregistrée. Appuyez sur le cœur d'une annonce pour la retrouver ici.
          </div>
        ) : (
          listings.map((listing) => (
            <button
              key={listing.id}
              onClick={() => setSelectedListing(listing)}
              className="w-full flex items-center space-x-3 p-4 border-b border-gray-50 text-left active:bg-gray-50"
            >
              <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {listing.image ? (
                  <img src={listing.image} className="w-full h-full object-cover" />
                ) : (
                  <Heart className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{listing.title}</h3>
                <p className="text-orange-600 font-black text-sm">
                  {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}
                </p>
                {(listing.city || listing.attributes) && (
                  <p className="text-xs text-gray-400 font-medium">
                    {[listing.city, summarizeAttributes(listing.attributes, 2)].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedListing && (
          <ProductDetailView
            listing={selectedListing}
            onBack={() => setSelectedListing(null)}
            onPurchased={load}
            walletPurchaseEnabled={true}
          />
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
