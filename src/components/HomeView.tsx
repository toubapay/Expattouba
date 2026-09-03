import { useEffect, useState, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Bell, MapPin, Loader2, ChevronDown, SlidersHorizontal, Heart, X, Star, Phone, MessageCircle, Clock } from "lucide-react";
import { ProductDetailView } from "./ProductDetailView";
import { useAuth } from "./AuthContext";
import { SENEGAL_CITIES, summarizeAttributes } from "../lib/categoryFields";
import { formatRelativeTime } from "../lib/formatDate";

interface Category {
  id: string;
  name: string;
  icon: string;
}

/** A small heart button, stopping the click from also opening the
 * listing's own onClick (the card behind it) — used on both the grid and
 * featured cards. */
function FavoriteButton({ listingId, className }: { listingId: string; className?: string }) {
  const { user, favoriteIds, toggleFavorite } = useAuth();
  if (!user) return null;
  const active = favoriteIds.has(listingId);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(listingId);
      }}
      className={`p-2 bg-white/90 backdrop-blur rounded-full shadow-sm ${className || ""}`}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart className={`w-4 h-4 ${active ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
    </button>
  );
}

/** Top-left badge on any card whose vendor plan currently makes it
 * featured — not just inside the separate featured rail, so the same
 * signal is visible wherever the listing happens to show up. */
function VedetteBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${className || ""}`}>
      <Star className="w-2.5 h-2.5 fill-white" />
      VEDETTE
    </span>
  );
}

/** Appeler/WhatsApp, reachable straight from the card — the same
 * tel:/wa.me links ProductDetailView already uses, just relocated so a
 * buyer doesn't have to open the listing first to reach the seller.
 * Discuter stays detail-page-only: it needs a signed-in chat thread,
 * which isn't a one-tap action a card can support on its own. */
function QuickContactButtons({ whatsapp, title, size = "sm" }: { whatsapp: string | null | undefined; title?: string; size?: "sm" | "md" }) {
  if (!whatsapp) return null;
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const stop = (e: MouseEvent) => e.stopPropagation();
  const prefill = title
    ? `Bonjour, je suis intéressé(e) par votre annonce "${title}".`
    : "Bonjour, je suis intéressé(e) par votre produit.";
  return (
    <div className="flex items-center gap-1.5" onClick={stop}>
      <a
        href={`tel:${whatsapp}`}
        onClick={stop}
        className={`${dim} flex items-center justify-center bg-gray-100 text-gray-700 rounded-full`}
        title="Appeler"
      >
        <Phone className={icon} />
      </a>
      <a
        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(prefill)}`}
        target="_blank"
        rel="noreferrer"
        onClick={stop}
        className={`${dim} flex items-center justify-center bg-[#25D366] text-white rounded-full`}
        title="WhatsApp"
      >
        <MessageCircle className={icon} />
      </a>
    </div>
  );
}

interface HomeFeed {
  featured: any[];
  listings: any[];
  home: { featuredTitle: string; newArrivalsTitle: string; featuredEnabled: boolean };
  walletPurchaseEnabled: boolean;
}

export function HomeView() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedPriceRange, setAppliedPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });

  // Debounced: a search-on-every-keystroke would hit the API constantly
  // while someone is still typing.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchHome = async (params: {
    category: string | null;
    city: string | null;
    q: string;
    minPrice: string;
    maxPrice: string;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params.category) qs.set("category", params.category);
      if (params.city) qs.set("city", params.city);
      if (params.q) qs.set("q", params.q);
      if (params.minPrice) qs.set("minPrice", params.minPrice);
      if (params.maxPrice) qs.set("maxPrice", params.maxPrice);
      const url = qs.toString() ? `/api/v1/home?${qs.toString()}` : "/api/v1/home";
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
    fetchHome({ category: activeCategory, city, q: search, minPrice: appliedPriceRange.min, maxPrice: appliedPriceRange.max });
  }, [activeCategory, city, search, appliedPriceRange]);

  const selectCategory = (id: string) => {
    setActiveCategory((current) => (current === id ? null : id));
  };

  const applyFilters = () => {
    setAppliedPriceRange({ min: minPrice, max: maxPrice });
    setShowFilters(false);
  };

  const resetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setAppliedPriceRange({ min: "", max: "" });
    setShowFilters(false);
  };

  const filtersActive = !!(appliedPriceRange.min || appliedPriceRange.max);

  return (
    <>
      <div className="min-h-full">
        {/* Header */}
        <div className="bg-white px-4 md:px-8 pt-12 md:pt-6 pb-4 sticky top-0 z-40 border-b border-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="relative">
                <button
                  onClick={() => setShowCityMenu((v) => !v)}
                  className="flex items-center space-x-1 text-orange-600"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-bold text-lg">{city || "Sénégal"}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showCityMenu && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-48 max-h-72 overflow-y-auto">
                    <button
                      onClick={() => { setCity(null); setShowCityMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 ${!city ? "text-orange-600 font-bold" : "text-gray-700"}`}
                    >
                      Toutes les villes
                    </button>
                    {SENEGAL_CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setShowCityMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 ${city === c ? "text-orange-600 font-bold" : "text-gray-700"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="p-2 relative bg-gray-50 rounded-full">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            {/* Search + filters */}
            <div className="flex items-center space-x-2 md:max-w-md">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher sur SeneMarket..."
                  className="w-full bg-gray-100 rounded-full py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 transition-shadow"
                />
              </div>
              <button
                onClick={() => { setMinPrice(appliedPriceRange.min); setMaxPrice(appliedPriceRange.max); setShowFilters(true); }}
                className={`relative p-3 rounded-full flex-shrink-0 ${filtersActive ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {filtersActive && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-600 rounded-full border-2 border-white" />}
              </button>
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
                    <div
                      key={listing.id}
                      onClick={() => setSelectedListing(listing)}
                      className="w-40 flex-shrink-0 bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden text-left cursor-pointer"
                    >
                      <div className="aspect-square bg-gray-100 relative">
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                        <VedetteBadge className="absolute top-2 left-2" />
                        <FavoriteButton listingId={listing.id} className="absolute top-2 right-2 !p-1.5" />
                      </div>
                      <div className="p-2">
                        <p className="font-bold text-xs line-clamp-1">{listing.title}</p>
                        <p className="text-orange-600 font-black text-xs">
                          {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}
                        </p>
                        {listing.city && (
                          <p className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {listing.city}
                          </p>
                        )}
                      </div>
                    </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {feed.listings.map((listing) => {
                    const chip = summarizeAttributes(listing.attributes, 2);
                    return (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-row sm:flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setSelectedListing(listing)}
                      >
                        {/* Vendor header — grid layout only; the compact mobile
                            row drops it to prioritize price/location/contact,
                            same trade a real classifieds list makes. */}
                        <div className="hidden sm:flex px-4 py-3 items-center justify-between">
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
                        <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[4/5] flex-shrink-0 bg-gray-100">
                          <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                          {listing.featured && <VedetteBadge className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 !text-[9px] sm:!text-[10px]" />}
                          <FavoriteButton listingId={listing.id} className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 !p-1.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-sm sm:text-lg leading-tight line-clamp-2 sm:line-clamp-1">{listing.title}</h3>
                          </div>

                          {chip && (
                            <span className="inline-block w-fit mt-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {chip}
                            </span>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium mt-1.5">
                            {listing.city && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {listing.city}
                              </span>
                            )}
                            {listing.createdAt && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(listing.createdAt)}
                              </span>
                            )}
                          </div>

                          <p className="hidden sm:block text-gray-600 text-sm line-clamp-2 mt-2">{listing.description}</p>

                          <div className="flex-1" />
                          <div className="flex items-center justify-between mt-2 sm:mt-3">
                            <span className="font-black text-orange-600 text-base sm:text-lg whitespace-nowrap">
                              {Number(listing.price).toLocaleString("fr-FR")} {listing.currency}
                            </span>
                            <QuickContactButtons whatsapp={listing.whatsapp} title={listing.title} size="sm" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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
            onPurchased={() => fetchHome({ category: activeCategory, city, q: search, minPrice: appliedPriceRange.min, maxPrice: appliedPriceRange.max })}
            walletPurchaseEnabled={feed?.walletPurchaseEnabled ?? true}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Filtrer par prix</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Prix min</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Prix max</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Aucun maximum"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button onClick={resetFilters} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">
                  Réinitialiser
                </button>
                <button onClick={applyFilters} className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl">
                  Appliquer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
