/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { TopNav } from "./components/TopNav";
import { HomeView } from "./components/HomeView";
import { PostView } from "./components/PostView";
import { WalletView } from "./components/WalletView";
import { ProfileView } from "./components/ProfileView";
import { useAuth } from "./components/AuthContext";
import { VendorOnboarding } from "./components/VendorOnboarding";
import { AuthView } from "./components/AuthView";
import type { Tab } from "./lib/navTabs";

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
    // No fixed phone-frame box: full width/height at any viewport. Below
    // md this fills a phone screen edge to edge (unchanged from before);
    // at md and up, TopNav takes over from BottomNav and every screen's
    // own max-width container (see each view) keeps content from
    // stretching edge to edge on a wide monitor.
    <div className="min-h-screen bg-white flex flex-col">
      {showAuth && !user ? (
        <div className="flex-1 flex md:items-center md:justify-center md:bg-gray-50 md:p-6">
          <div className="w-full h-full md:h-auto md:max-w-md bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 overflow-hidden flex flex-col">
            <AuthView onClose={() => setShowAuth(false)} />
          </div>
        </div>
      ) : dbUser && !dbUser.vendor && activeTab === 'post' ? (
        <>
          <TopNav activeTab={activeTab} onTabChange={handleTabChange} />
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            <VendorOnboarding />
          </main>
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </>
      ) : (
        <>
          <TopNav activeTab={activeTab} onTabChange={handleTabChange} />
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
  );
}

export default function App() {
  return <AppContent />;
}
