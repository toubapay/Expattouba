import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, MapPin, Loader2, ChevronRight } from "lucide-react";
import { ProductDetailView } from "./ProductDetailView";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface HomeFeed {
  featured: any[];
  listings: any[];
  home: { featuredTitle: string; newArrivalsTitle: string; featuredEnabled: boolean };
}

export function HomeView() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  const fetchHome = async (category: string | null) => {
    setLoading(true);
    try {
      const url = category ? `/api/v1/home?category=${encodeURIComponent(category)}` : "/api/v1/home";
      const res = await fetch(url);
      if (res.ok) setFeed(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHome(activeCategory);
  }, [activeCategory]);

  const selectCategory = (id: string) => {
    setActiveCategory((current) => (current === id ? null : id));
  };

  return (
    <>
      <div className="min-h-full">
        {/* Header */}
        <div className="bg-white px-4 md:px-8 pt-12 md:pt-6 pb-4 sticky top-0 z-40 border-b border-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2 text-orange-600">
                <MapPin className="w-5 h-5" />
                <span className="font-bold text-lg">Dakar, SN</span>
              </div>
              <button className="p-2 relative bg-gray-50 rounded-full">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            {/* Search */}
            <div className="relative md:max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher sur SeneMarket..."
                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 transition-shadow"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 md:px-8 py-6">
          <div className="max-w-6xl mx-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-900">Catégories</h2>
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.name)}
                className="flex flex-col items-center space-y-2 min-w-[72px]"
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border transition-colors ${
                    activeCategory === cat.name
                      ? "bg-orange-600 border-orange-600"
                      : "bg-orange-50 border-orange-100"
                  }`}
                >
                  {cat.icon}
                </div>
                <span className="text-xs font-medium text-gray-700">{cat.name}</span>
              </button>
            ))}
          </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {feed?.home.featuredEnabled && (feed?.featured.length ?? 0) > 0 && (
              <div className="px-4 md:px-8 pb-2">
                <div className="max-w-6xl mx-auto">
                <h2 className="text-lg font-bold mb-4 text-gray-900">{feed!.home.featuredTitle}</h2>
                <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                  {feed!.featured.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => setSelectedListing(listing)}
                      className="w-40 flex-shrink-0 bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden text-left"
                    >
                      <div className="aspect-square bg-gray-100 relative">
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          VEDETTE
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="font-bold text-xs line-clamp-1">{listing.title}</p>
                        <p className="text-orange-600 font-black text-xs">
                          {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                </div>
              </div>
            )}

            {/* Feed */}
            <div className="px-4 md:px-8 pb-6">
              <div className="max-w-6xl mx-auto">
              <h2 className="text-lg font-bold mb-4 text-gray-900">{feed?.home.newArrivalsTitle || "Nouveautés"}</h2>
              {!feed || feed.listings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-medium">Aucune annonce pour le moment.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {feed.listings.map((listing) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setSelectedListing(listing)}
                    >
                      {/* Vendor Header */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full p-[2px]">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center border border-gray-100">
                              <span className="text-xs font-bold">{listing.vendorName?.charAt(0) || "V"}</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{listing.vendorName}</h3>
                            <span className="text-[10px] text-gray-500 font-medium">Vendeur vérifié</span>
                          </div>
                        </div>
                        {listing.vendorBadge === "GOLD" && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-md">GOLD</span>
                        )}
                      </div>

                      {/* Image */}
                      <div className="aspect-[4/5] bg-gray-100 relative">
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight">{listing.title}</h3>
                          <span className="font-black text-orange-600 text-lg whitespace-nowrap ml-2">
                            {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{listing.description}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedListing(listing);
                          }}
                          className="mt-3 flex items-center space-x-1 text-orange-600 font-bold text-sm"
                        >
                          <span>Voir plus</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedListing && (
          <ProductDetailView
            listing={selectedListing}
            onBack={() => setSelectedListing(null)}
            onPurchased={() => fetchHome(activeCategory)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
