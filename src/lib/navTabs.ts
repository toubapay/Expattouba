import { Home, PlusSquare, Wallet, User as UserIcon, type LucideIcon } from "lucide-react";

export type Tab = "home" | "post" | "wallet" | "profile";

// Single source for both BottomNav (mobile) and TopNav (desktop) so the
// two can't drift into showing different destinations.
export const NAV_TABS = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "post", label: "Vendre", icon: PlusSquare },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "profile", label: "Profil", icon: UserIcon },
] as const satisfies readonly { id: Tab; label: string; icon: LucideIcon }[];
