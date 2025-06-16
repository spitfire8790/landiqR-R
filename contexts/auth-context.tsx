"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS, READONLY_EMAILS } from "@/lib/auth-config";

export type UserRole = "admin" | "readonly" | null;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: extract role from the current session (metadata.role)
  const deriveRoleFromSession = (session: any): UserRole => {
    return (session?.user?.user_metadata?.role as UserRole) || null;
  };

  // Initialise auth state once on mount and subscribe to further changes
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      setIsAuthenticated(!!currentSession);
      setUserRole(deriveRoleFromSession(currentSession));
      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
        setUserRole(deriveRoleFromSession(session));
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Sign-in helper
  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Login error:", error);
      return false;
    }
    return true;
  };

  // Sign-up helper (stores selected role in user_metadata)
  const signup = async (email: string, password: string): Promise<boolean> => {
    // Only allow exact whitelisted emails
    if (!ADMIN_EMAILS.includes(email) && !READONLY_EMAILS.includes(email)) {
      console.warn("Signup attempt blocked: unauthorised email");
      return false;
    }

    const role: UserRole = ADMIN_EMAILS.includes(email) ? "admin" : "readonly";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });
    if (error) {
      console.error("Signup error:", error);
      return false;
    }
    return true;
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  const isAdmin = userRole === "admin";
  const isReadOnly = userRole === "readonly";

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userRole,
        login,
        signup,
        logout,
        isAdmin,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
