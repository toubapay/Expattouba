import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export function VendorOnboarding() {
  const { dbUser, refreshUser, getToken } = useAuth();
  const [boutiqueName, setBoutiqueName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google accounts have no phone number at all — vendor selling requires
  // one (see server.ts's /api/v1/vendors/onboard), so this form doubles as
  // the registration step the first time a vendor without one shows up.
  const needsPhone = !dbUser?.phoneNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (needsPhone && !/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit contenir exactement 4 chiffres");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const body: Record<string, string> = { boutiqueName, whatsappNumber, address };
      if (needsPhone) {
        body.phone = phone;
        body.pin = pin;
      }
      const res = await fetch("/api/v1/vendors/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refreshUser();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'inscription");
      }
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'inscription");
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
        {needsPhone && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold text-orange-800">
              Un numéro de téléphone et un code PIN sont requis avant de pouvoir vendre.
            </p>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Numéro de téléphone</label>
              <input
                required
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="77 000 00 00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Code PIN (4 chiffres)</label>
              <input
                required
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••"
              />
            </div>
          </div>
        )}
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

        {error && <p className="text-sm font-semibold text-red-600 ml-1">{error}</p>}

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
