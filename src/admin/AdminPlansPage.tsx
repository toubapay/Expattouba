import React, { useEffect, useState } from "react";
import { Plus, Star, Trash2, Pencil, X } from "lucide-react";
import { useAdminApi } from "./adminApi";

interface Plan {
  id: string;
  name: string;
  priceFcfa: number;
  durationDays: number;
  maxListings: number | null;
  featuredHome: boolean;
  priorityRank: number;
  commissionPercent: number | null;
  feeFcfa: number | null;
  active: boolean;
}

const BLANK = {
  name: "",
  priceFcfa: 0,
  durationDays: 30,
  maxListings: "" as number | "",
  featuredHome: false,
  priorityRank: 50,
  commissionPercent: "" as number | "",
  feeFcfa: "" as number | "",
};

export function AdminPlansPage() {
  const api = useAdminApi();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/plans").then(setPlans).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: Plan) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      priceFcfa: p.priceFcfa,
      durationDays: p.durationDays,
      maxListings: p.maxListings ?? "",
      featuredHome: p.featuredHome,
      priorityRank: p.priorityRank,
      commissionPercent: p.commissionPercent ?? "",
      feeFcfa: p.feeFcfa ?? "",
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(BLANK);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxListings: form.maxListings === "" ? null : Number(form.maxListings),
      commissionPercent: form.commissionPercent === "" ? null : Number(form.commissionPercent),
      feeFcfa: form.feeFcfa === "" ? null : Number(form.feeFcfa),
    };
    try {
      if (editingId) {
        await api.patch(`/plans/${editingId}`, payload);
      } else {
        await api.post("/plans", payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const deactivate = async (p: Plan) => {
    if (!confirm(`Désactiver l'offre "${p.name}" ? Les abonnements existants ne sont pas affectés.`)) return;
    await api.del(`/plans/${p.id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Offres & tarifs vendeurs</h1>
        <button onClick={startNew} className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-1 text-sm">
          <Plus className="w-4 h-4" />
          <span>Nouvelle offre</span>
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white p-5 rounded-2xl border border-gray-100 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">{editingId ? "Modifier l'offre" : "Nouvelle offre"}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Nom de l'offre">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium" />
            </Field>
            <Field label="Prix (FCFA)">
              <input
                type="number"
                min={0}
                required
                value={form.priceFcfa}
                onChange={(e) => setForm({ ...form, priceFcfa: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <Field label="Durée (jours)">
              <input
                type="number"
                min={1}
                required
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <Field label="Annonces max (vide = illimité)">
              <input
                type="number"
                min={0}
                value={form.maxListings}
                onChange={(e) => setForm({ ...form, maxListings: e.target.value === "" ? "" : Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <Field label="Priorité (0 = en premier)">
              <input
                type="number"
                value={form.priorityRank}
                onChange={(e) => setForm({ ...form, priorityRank: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <Field label="Commission % (vide = défaut global)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value === "" ? "" : Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <Field label="Frais fixe FCFA (vide = défaut global)">
              <input
                type="number"
                min={0}
                value={form.feeFcfa}
                onChange={(e) => setForm({ ...form, feeFcfa: e.target.value === "" ? "" : Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
              />
            </Field>
            <label className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                checked={form.featuredHome}
                onChange={(e) => setForm({ ...form, featuredHome: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold text-gray-700">Mise en avant page d'accueil</span>
            </label>
          </div>
          <button type="submit" className="bg-gray-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
            {editingId ? "Enregistrer" : "Créer l'offre"}
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`bg-white rounded-2xl border p-5 ${p.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-lg text-gray-900">{p.name}</h3>
                  {p.featuredHome && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-orange-600 font-black">
                  {p.priceFcfa.toLocaleString("fr-FR")} FCFA <span className="text-gray-400 font-medium text-sm">/ {p.durationDays}j</span>
                </p>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-500">
                  <Pencil className="w-4 h-4" />
                </button>
                {p.active && (
                  <button onClick={() => deactivate(p)} className="p-2 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Annonces max : {p.maxListings ?? "Illimité"}</li>
              <li>Priorité feed : {p.priorityRank}</li>
              <li>Commission : {p.commissionPercent ?? "défaut global"}{p.commissionPercent !== null ? "%" : ""}</li>
              <li>Frais : {p.feeFcfa ?? "défaut global"}{p.feeFcfa !== null ? " FCFA" : ""}</li>
              {!p.active && <li className="text-red-500 font-bold">Désactivée</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500 uppercase block mb-1">{label}</span>
      {children}
    </label>
  );
}
