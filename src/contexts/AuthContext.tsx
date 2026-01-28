import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, AdminUser } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Initializing...', {
      hasSupabase: !!supabase,
      url: (window as any).VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
    });

    if (!supabase) {
      console.error('❌ AuthContext: Supabase not initialized');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        console.log('✅ AuthContext: Session loaded', { hasSession: !!session });
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadAdminUser(session.user.id);
        }
        setLoading(false);
      })();
    }).catch((error) => {
      console.error('❌ Auth session error:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setLoading(true);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadAdminUser(session.user.id);
        } else {
          setAdminUser(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAdminUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setAdminUser(data);
      } else {
        setAdminUser(null);
      }
    } catch (err) {
      console.error('Error loading admin user:', err);
      setAdminUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase
      .from('admin_users')
      .insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: 'admin'
      });

    if (profileError) throw profileError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAdminUser(null);
  };

  const isAdmin = adminUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
