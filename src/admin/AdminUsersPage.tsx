import { useEffect, useState } from "react";
import { Search, ShieldCheck, ShieldOff, BadgeCheck } from "lucide-react";
import { useAdminApi } from "./adminApi";

interface UserRow {
  id: string;
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  walletBalance: string;
  isAdmin: boolean;
  createdAt: string;
  vendorId: string | null;
  boutiqueName: string | null;
  whatsappNumber: string | null;
  badgeStatus: string | null;
  isVerified: boolean | null;
}

export function AdminUsersPage() {
  const api = useAdminApi();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    api
      .get(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then(setUsers)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const toggleAdmin = async (row: UserRow) => {
    setBusyId(row.id);
    try {
      await api.patch(`/users/${row.id}`, { isAdmin: !row.isAdmin });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleVerified = async (row: UserRow) => {
    setBusyId(row.id);
    try {
      await api.patch(`/users/${row.id}`, { isVerified: !row.isVerified });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Utilisateurs</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, téléphone ou email..."
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
            <tr>
              <th className="text-left p-3">Compte</th>
              <th className="text-left p-3">Boutique</th>
              <th className="text-left p-3">Solde</th>
              <th className="text-left p-3">Admin</th>
              <th className="text-left p-3">Vérifié</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-50">
                <td className="p-3">
                  <div className="font-bold text-gray-900">{u.phoneNumber || u.email || u.uid}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="p-3">
                  {u.boutiqueName ? (
                    <span className="font-medium">{u.boutiqueName}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 font-bold">{Number(u.walletBalance).toLocaleString("fr-FR")} FCFA</td>
                <td className="p-3">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => toggleAdmin(u)}
                    className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-md ${
                      u.isAdmin ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {u.isAdmin ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    <span>{u.isAdmin ? "Admin" : "Non-admin"}</span>
                  </button>
                </td>
                <td className="p-3">
                  {u.vendorId ? (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => toggleVerified(u)}
                      className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-md ${
                        u.isVerified ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      <BadgeCheck className="w-3 h-3" />
                      <span>{u.isVerified ? "Vérifié" : "Non vérifié"}</span>
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-center text-gray-400 font-medium">Aucun utilisateur.</div>}
      </div>
    </div>
  );
}
