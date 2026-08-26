/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { PostView } from "./components/PostView";
import { WalletView } from "./components/WalletView";
import { ProfileView } from "./components/ProfileView";
import { useAuth } from "./components/AuthContext";
import { VendorOnboarding } from "./components/VendorOnboarding";
import { AuthView } from "./components/AuthView";

type Tab = "home" | "post" | "wallet" | "profile";

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const { user, dbUser, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">Chargement...</div>;
  }

  const handleTabChange = (tab: Tab) => {
    if (tab !== "home" && !user) {
      setShowAuth(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-full md:h-[844px] md:w-[390px] md:rounded-[40px] md:shadow-2xl overflow-hidden bg-white relative flex flex-col">
        {showAuth && !user ? (
          <AuthView onClose={() => setShowAuth(false)} />
        ) : dbUser && !dbUser.vendor && activeTab === 'post' ? (
          <>
            <VendorOnboarding />
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto scrollbar-hide">
              {activeTab === "home" && <HomeView />}
              {activeTab === "post" && <PostView />}
              {activeTab === "wallet" && <WalletView />}
              {activeTab === "profile" && <ProfileView />}
            </main>
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}

