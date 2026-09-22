import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { api, authStorage } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  profile: any;
  role: UserRole;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  fastSwitchRole: (targetRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setProfile(data.profile);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      authStorage.clearToken();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If no token exists initially, auto-login as default demo student for immediate interactivity
    const init = async () => {
      const existingToken = authStorage.getToken();
      if (!existingToken) {
        try {
          const res = await api.login({ email: 'arjun.mehta@college.edu', password: 'password123' });
          authStorage.setToken(res.token);
          setUser(res.user);
          const me = await api.getMe();
          setProfile(me.profile);
          setLoading(false);
          return;
        } catch (e) {
          // If fallback fails, just proceed
        }
      }
      await refreshUser();
    };
    init();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.login(credentials);
      authStorage.setToken(res.token);
      setUser(res.user);
      const me = await api.getMe();
      setProfile(me.profile);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.register(data);
      authStorage.setToken(res.token);
      setUser(res.user);
      const me = await api.getMe();
      setProfile(me.profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authStorage.clearToken();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: any) => {
    const res = await api.updateProfile(data);
    if (res.user) {
      setUser(res.user);
    }
    await refreshUser();
  };

  // Instant one-click persona switcher for organizers, faculty admins, and students
  const fastSwitchRole = async (targetRole: UserRole) => {
    const demoAccounts: Record<UserRole, { email: string; pass: string }> = {
      student: { email: 'arjun.mehta@college.edu', pass: 'password123' },
      organizer: { email: 'organizer.robotics@college.edu', pass: 'password123' },
      admin: { email: 'admin.dean@college.edu', pass: 'password123' },
    };

    const target = demoAccounts[targetRole];
    await login({ email: target.email, password: target.pass });
  };

  const role: UserRole = user?.role || 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        fastSwitchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
