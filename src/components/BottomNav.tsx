import { cn } from "../lib/utils";
import { NAV_TABS, type Tab } from "../lib/navTabs";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Mobile only — TopNav takes over on desktop, since a bottom tab bar is a
// phone convention that looks out of place stretched across a wide screen.
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="md:hidden w-full bg-white border-t border-gray-100 pb-safe z-50 flex-shrink-0">
      <div className="flex justify-around items-center h-16">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
