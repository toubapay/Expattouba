import { Home, PlusSquare, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface BottomNavProps {
  activeTab: "home" | "post" | "wallet" | "profile";
  onTabChange: (tab: "home" | "post" | "wallet" | "profile") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "post", label: "Vendre", icon: PlusSquare },
    { id: "wallet", label: "Portefeuille", icon: Wallet },
    { id: "profile", label: "Profil", icon: UserIcon },
  ] as const;

  return (
    <div className="w-full bg-white border-t border-gray-100 pb-safe z-50 flex-shrink-0">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
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
