import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { NAV_TABS, type Tab } from "../lib/navTabs";
import { useAuth } from "./AuthContext";
import type { Category } from "../types";

interface TopNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  // "Catégories" dropdown — mirrors expat-dakar.com's top-bar menu so a
  // category is reachable from any tab, not just the icon rail on Home.
  activeCategory: string | null;
  onSelectCategory: (name: string) => void;
  // Clears the category filter — used when one of the four tab buttons
  // (Accueil included) is clicked, since those mean "go to the top level
  // of that section," not "keep this filter."
  onClearCategory: () => void;
  // Desktop had no visible way to sign in until a gated tab was clicked —
  // this "Connexion" button (shown only when logged out) surfaces it
  // directly in the bar, same as expat-dakar.com's header.
  onRequestAuth: () => void;
}

// Desktop only (hidden below md, where BottomNav takes over) — a full-width
// bar makes better use of the space than a tab strip meant for a thumb.
export function TopNav({ activeTab, onTabChange, activeCategory, onSelectCategory, onClearCategory, onRequestAuth }: TopNavProps) {
  const { user, dbUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

  return (
    <header className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-gray-100 flex-shrink-0">
      <span className="text-xl font-black text-orange-600">SeneMarket</span>

      <nav className="flex items-center space-x-1">
        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu((v) => !v)}
            className={cn(
              "flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-colors",
              activeCategory ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <span>Catégories</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showCategoryMenu && "rotate-180")} />
          </button>
          {showCategoryMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCategoryMenu(false)} />
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-64 max-h-96 overflow-y-auto grid grid-cols-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onTabChange("home");
                      onSelectCategory(cat.name);
                      setShowCategoryMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center space-x-3 text-left px-4 py-2 text-sm font-medium hover:bg-gray-50",
                      activeCategory === cat.name ? "text-orange-600 font-bold" : "text-gray-700"
                    )}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !activeCategory;
          return (
            <button
              key={tab.id}
              onClick={() => { onClearCategory(); onTabChange(tab.id); }}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors",
                isActive ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="w-40 flex justify-end">
        {user ? (
          <span className="text-sm font-bold text-gray-700">
            {Number(dbUser?.walletBalance || 0).toLocaleString("fr-FR")} FCFA
          </span>
        ) : (
          <button
            onClick={onRequestAuth}
            className="px-4 py-2 rounded-xl font-bold text-sm text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors"
          >
            Connexion
          </button>
        )}
      </div>
    </header>
  );
}
