import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export function VendorOnboarding() {
  const { refreshUser, getToken } = useAuth();
  const [boutiqueName, setBoutiqueName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/vendors/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boutiqueName, whatsappNumber, address }),
      });
      if (res.ok) {
        await refreshUser();
      } else {
        alert("Erreur lors de l'inscription");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 bg-white overflow-y-auto">
      <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-8">Créer votre boutique</h2>
      <p className="text-gray-500 mb-8 font-medium">Rejoignez SeneMarket et commencez à vendre.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Nom de la boutique</label>
          <input 
            required
            type="text" 
            value={boutiqueName}
            onChange={e => setBoutiqueName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Dakar Sneakz"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Numéro WhatsApp</label>
          <input 
            required
            type="tel" 
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="+221 77 000 00 00"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Adresse</label>
          <input 
            required
            type="text" 
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Médina, Rue 33"
          />
        </div>
        
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 mt-8 disabled:opacity-50"
        >
          {loading ? "Création..." : "Commencer à vendre"}
        </button>
      </form>
      </div>
    </div>
  );
}
