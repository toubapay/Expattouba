import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Settings, Shield, Award, ChevronRight, LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "./AuthContext";
import { ChatInboxView } from "./ChatInboxView";

export function ProfileView() {
  const { user, dbUser, logOut } = useAuth();
  const [showMessages, setShowMessages] = useState(false);

  const initials = dbUser?.vendor?.boutiqueName?.substring(0, 2).toUpperCase() || "US";

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white px-4 md:px-0 pt-12 md:pt-10 pb-6 border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-center mb-6">Mon Profil</h1>

        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full p-[3px]">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-white overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-gray-800">{initials}</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{dbUser?.vendor?.boutiqueName || user?.displayName || "Utilisateur"}</h2>
            <p className="text-gray-500 font-medium text-sm">{dbUser?.vendor?.whatsappNumber || user?.email}</p>
            {dbUser?.vendor && (
              <div className="mt-2 inline-flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-bold">
                <Award className="w-3 h-3" />
                <span>Vendeur {dbUser.vendor.badgeStatus}</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="p-4 md:px-0 md:max-w-2xl md:mx-auto space-y-6 mt-2">
        {dbUser?.vendor && (
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2">Boutique</h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-gray-700">Vérification identité (KYC)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-md">
                    {dbUser.vendor.isVerified ? "Vérifié" : "Non Vérifié"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
              <button className="w-full flex items-center justify-between p-4 active:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-gray-700">Abonnement Premium</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {user && (
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2">Messages</h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowMessages(true)}
                className="w-full flex items-center justify-between p-4 active:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-gray-700">Mes messages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase ml-2 mb-2">Paramètres</h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-gray-700">Préférences</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={logOut}
              className="w-full flex items-center justify-between p-4 active:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-red-600">Déconnexion</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMessages && <ChatInboxView onBack={() => setShowMessages(false)} />}
      </AnimatePresence>
    </div>
  );
}
