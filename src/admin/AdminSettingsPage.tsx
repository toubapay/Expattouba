import React, { useEffect, useState } from "react";
import { useAdminApi } from "./adminApi";

interface AppSettings {
  defaultCommissionPercent: number;
  defaultFeeFcfa: number;
  home: {
    featuredTitle: string;
    newArrivalsTitle: string;
    featuredEnabled: boolean;
  };
}

export function AdminSettingsPage() {
  const api = useAdminApi();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings").then(setSettings).catch((e) => setError(e.message));
  }, []);

  if (!settings) return <div className="text-gray-400 font-medium">Chargement...</div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      await api.patch("/settings", settings);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Paramètres</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}
      {saved && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm font-medium">Paramètres enregistrés.</div>}

      <form onSubmit={save} className="space-y-6">
        <section className="bg-white p-5 rounded-2xl border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Commissions & frais par défaut</h2>
          <p className="text-xs text-gray-500 mb-4">
            S'appliquent à toute offre vendeur qui ne définit pas sa propre commission/frais.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Commission par défaut (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.defaultCommissionPercent}
                onChange={(e) => setSettings({ ...settings, defaultCommissionPercent: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Frais fixe par défaut (FCFA)</span>
              <input
                type="number"
                min={0}
                value={settings.defaultFeeFcfa}
                onChange={(e) => setSettings({ ...settings, defaultFeeFcfa: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </label>
          </div>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Page d'accueil</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.home.featuredEnabled}
                onChange={(e) => setSettings({ ...settings, home: { ...settings.home, featuredEnabled: e.target.checked } })}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold text-gray-700">Afficher le rail "en vedette"</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Titre du rail "en vedette"</span>
              <input
                value={settings.home.featuredTitle}
                onChange={(e) => setSettings({ ...settings, home: { ...settings.home, featuredTitle: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Titre du rail "nouveautés"</span>
              <input
                value={settings.home.newArrivalsTitle}
                onChange={(e) => setSettings({ ...settings, home: { ...settings.home, newArrivalsTitle: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </label>
          </div>
        </section>

        <button type="submit" className="bg-orange-600 text-white font-bold px-6 py-3 rounded-xl">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
