import React, { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useAdminApi } from "./adminApi";

interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export function AdminCategoriesPage() {
  const api = useAdminApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛍️");
  const [error, setError] = useState("");

  const load = () => api.get("/categories").then(setCategories).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/categories", { name, icon, sortOrder: categories.length });
      setName("");
      setIcon("🛍️");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleActive = async (c: Category) => {
    await api.patch(`/categories/${c.id}`, { active: !c.active });
    load();
  };

  const remove = async (c: Category) => {
    await api.del(`/categories/${c.id}`);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Catégories (page d'accueil)</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}

      <form onSubmit={add} className="flex items-end space-x-3 mb-6 bg-white p-4 rounded-2xl border border-gray-100">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Emoji</label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-16 text-center text-xl bg-gray-50 border border-gray-200 rounded-xl py-2"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Électronique"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium"
          />
        </div>
        <button type="submit" className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl flex items-center space-x-1">
          <Plus className="w-4 h-4" />
          <span>Ajouter</span>
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{c.icon}</span>
              <span className={`font-bold ${c.active ? "text-gray-900" : "text-gray-400 line-through"}`}>{c.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => toggleActive(c)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-500" title={c.active ? "Masquer" : "Afficher"}>
                {c.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <div className="p-8 text-center text-gray-400 font-medium">Aucune catégorie.</div>}
      </div>
    </div>
  );
}
