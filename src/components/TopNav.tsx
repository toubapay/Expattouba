import { cn } from "../lib/utils";
import { NAV_TABS, type Tab } from "../lib/navTabs";
import { useAuth } from "./AuthContext";

interface TopNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Desktop only (hidden below md, where BottomNav takes over) — a full-width
// bar makes better use of the space than a tab strip meant for a thumb.
export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const { user, dbUser } = useAuth();

  return (
    <header className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-gray-100 flex-shrink-0">
      <span className="text-xl font-black text-orange-600">SeneMarket</span>

      <nav className="flex items-center space-x-1">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
        {user && (
          <span className="text-sm font-bold text-gray-700">
            {Number(dbUser?.walletBalance || 0).toLocaleString("fr-FR")} FCFA
          </span>
        )}
      </div>
    </header>
  );
}
