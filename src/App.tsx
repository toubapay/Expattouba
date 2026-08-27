/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
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
  const { user, dbUser, loading, getToken, refreshUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Paydunya's hosted checkout redirects back here (return_url/cancel_url
  // set in the vendor plans checkout call) rather than into a specific
  // in-app route, since it's a full-page redirect to a different origin
  // and back. This is the primary confirmation path — an IPN needs a
  // publicly reachable callback_url, which isn't guaranteed in every
  // deployment, but landing back on this URL always happens.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("vendorPlanOrder");
    if (!orderId) return;
    const cancelled = params.get("cancelled") === "1";

    // Strip the query string immediately so a later refresh of this page
    // doesn't re-trigger a sync call for an order already resolved.
    window.history.replaceState(null, "", window.location.pathname);

    if (cancelled) {
      alert("Paiement annulé.");
      setActiveTab("profile");
      return;
    }
    if (!user) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/v1/vendors/plans/orders/${orderId}/sync`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (data.status === "COMPLETED") {
          await refreshUser();
          alert("Paiement confirmé ! Votre offre est maintenant active.");
        } else if (data.status === "CANCELLED") {
          alert("Paiement annulé.");
        } else {
          alert("Paiement en cours de vérification. Si le débit a eu lieu, l'offre s'activera sous peu.");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setActiveTab("profile");
      }
    })();
  }, [loading, user]);

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
