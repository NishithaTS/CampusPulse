import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
const DEMO_SESSION_KEY = 'campuspulse-demo-session';
const DEMO_PROFILE_KEY = 'campuspulse-demo-profile';

const defaultDemoUser: User = {
  id: 'demo-ksit-student',
  email: 'student@ksit.edu',
  name: 'KSIT Student',
  role: 'student',
  campus: 'KSIT',
  createdAt: new Date().toISOString(),
};

const defaultDemoProfile = {
  id: 'demo-ksit-profile',
  userId: defaultDemoUser.id,
  studentId: 'KSIT-2026-001',
  department: 'Computer Science',
  year: '1',
  phone: '',
  interests: ['Technology', 'Innovation'],
};

const readDemoSession = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_SESSION_KEY) || 'null') as User | null;
  } catch {
    return null;
  }
};

const readDemoProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_PROFILE_KEY) || 'null') || defaultDemoProfile;
  } catch {
    return defaultDemoProfile;
  }
};

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
    setUser(readDemoSession());
    setProfile(readDemoProfile());
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    if (!credentials.email.trim() || credentials.password.length < 6) {
      throw new Error('Enter a valid email and a password with at least 6 characters.');
    }
    const existing = readDemoSession() || { ...defaultDemoUser, email: credentials.email.trim().toLowerCase() };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(existing));
    setUser(existing);
    setProfile(readDemoProfile());
  };

  const register = async (data: any) => {
    if (!data.name?.trim() || !data.email?.trim() || data.password?.length < 6) {
      throw new Error('Add your name, a valid email, and a password with at least 6 characters.');
    }
    const nextUser = { ...defaultDemoUser, email: data.email.trim().toLowerCase(), name: data.name.trim() };
    const nextProfile = { ...defaultDemoProfile, department: data.department || defaultDemoProfile.department };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(nextUser));
    localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(nextProfile));
    setUser(nextUser);
    setProfile(nextProfile);
  };

  const logout = () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: any) => {
    if (!user) throw new Error('Please sign in before editing your profile.');
    const nextUser = { ...user, name: data.name?.trim() || user.name };
    const nextProfile = { ...readDemoProfile(), ...data, userId: user.id };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(nextUser));
    localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(nextProfile));
    setUser(nextUser);
    setProfile(nextProfile);
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
