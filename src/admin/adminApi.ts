import { useAuth } from "../components/AuthContext";

async function request(token: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

/** Small fetch wrapper for /api/admin/* — every call carries the same
 * Firebase/JWT bearer token the rest of the app already uses, since admins
 * are just regular accounts with the isAdmin flag rather than a separate
 * login. */
export function useAdminApi() {
  const { getToken } = useAuth();
  return {
    get: async (path: string) => request(await getToken(), "GET", path),
    post: async (path: string, body?: unknown) => request(await getToken(), "POST", path, body),
    patch: async (path: string, body?: unknown) => request(await getToken(), "PATCH", path, body),
    del: async (path: string) => request(await getToken(), "DELETE", path),
  };
}
