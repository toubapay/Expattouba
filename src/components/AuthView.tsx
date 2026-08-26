import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { X, Smartphone } from "lucide-react";

export function AuthView({ onClose }: { onClose?: () => void }) {
  const { signInWithGoogle, signInWithPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 4) {
      setError("Le code PIN doit contenir 4 chiffres.");
      return;
    }
    setLoading(true);
    try {
      await signInWithPhone(phone, pin);
      if (onClose) onClose();
    } catch (err: any) {
      setError("Numéro ou code PIN incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-white overflow-y-auto relative h-full">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full">
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex flex-col items-center justify-center flex-1 py-8">
        <h1 className="text-3xl font-black text-orange-600 mb-2">SeneMarket</h1>
        <p className="text-gray-500 mb-8 font-medium text-center">
          Connectez-vous pour vendre ou contacter les vendeurs.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium w-full text-center">{error}</div>}

        <form onSubmit={handlePhoneSubmit} className="w-full space-y-4 mb-8">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Numéro de téléphone</label>
            <input 
              required
              type="tel" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="+221 77 000 00 00"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Code PIN (4 chiffres)</label>
            <input 
              required
              type="password"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="••••"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-5 h-5" />
            <span>Continuer avec Téléphone</span>
          </button>
        </form>

        <div className="flex items-center w-full mb-8">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="px-4 text-xs font-bold text-gray-400 uppercase">Ou</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <button 
          onClick={async () => {
            await signInWithGoogle();
            if (onClose) onClose();
          }}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continuer avec Google</span>
        </button>
      </div>
    </div>
  );
}
