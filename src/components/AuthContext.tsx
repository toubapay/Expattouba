import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextType {
  user: any | null; // Unified user representation
  dbUser: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phone: string, pin: string) => Promise<void>;
  signInWithAdminCredentials: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithPhone: async () => {},
  signInWithAdminCredentials: async () => {},
  logOut: async () => {},
  refreshUser: async () => {},
  getToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [customToken, setCustomToken] = useState<string | null>(localStorage.getItem('phoneToken'));

  const getToken = async (): Promise<string | null> => {
    if (customToken) return customToken;
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return null;
  };

  const fetchDbUser = async (token: string) => {
    try {
      const res = await fetch('/api/v1/auth/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshUser = async () => {
    const token = await getToken();
    if (token) {
      await fetchDbUser(token);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (customToken) return; // Ignore firebase if custom token exists
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        await fetchDbUser(t);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    if (customToken) {
      // Load user with custom token
      setUser({ isPhone: true });
      fetchDbUser(customToken).then(() => setLoading(false));
    }

    return () => unsubscribe();
  }, [customToken]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (e) {
      console.error(e);
    }
  };

  const signInWithPhone = async (phone: string, pin: string) => {
    const res = await fetch('/api/v1/auth/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin })
    });
    if (!res.ok) throw new Error('Invalid login');
    const data = await res.json();
    localStorage.setItem('phoneToken', data.token);
    setCustomToken(data.token);
  };

  // Superadmin email+password login (src/db/users.ts's ensureSuperAdmin) —
  // shares the same custom-JWT storage as phone login above ('phoneToken'
  // is really "our own JWT, not a Firebase one", regardless of which route
  // issued it), so the rest of this context treats both identically.
  const signInWithAdminCredentials = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Invalid login');
    }
    const data = await res.json();
    localStorage.setItem('phoneToken', data.token);
    setCustomToken(data.token);
  };

  const logOut = async () => {
    if (customToken) {
      localStorage.removeItem('phoneToken');
      setCustomToken(null);
      setUser(null);
      setDbUser(null);
    } else {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signInWithGoogle, signInWithPhone, signInWithAdminCredentials, logOut, refreshUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

