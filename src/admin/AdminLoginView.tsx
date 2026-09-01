import React, { useState } from "react";
import { useAuth } from "../components/AuthContext";
import { Lock } from "lucide-react";

/** Email+password login shown at /admin instead of the customer AuthView —
 * customers get phone/PIN and Google, admins get this dedicated form
 * talking to /api/v1/auth/admin-login (see ensureSuperAdmin in
 * src/db/users.ts). Google sign-in still works for /admin too if
 * ADMIN_EMAILS is set; this doesn't replace it, just adds a path that
 * doesn't depend on it. */
export function AdminLoginView() {
  const { signInWithAdminCredentials } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithAdminCredentials(email, password);
    } catch (err: any) {
      setError(err.message || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-white overflow-y-auto h-full">
      <div className="flex flex-col items-center justify-center flex-1 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Administration</h1>
        <p className="text-gray-500 mb-8 font-medium text-center">SeneMarket — accès réservé.</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium w-full text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Email</label>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Mot de passe</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? "Connexion..." : "Se connecter"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
