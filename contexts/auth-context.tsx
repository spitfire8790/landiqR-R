"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserRole, ensureUserRolesTable } from "@/lib/user-management";

export type UserRole = "admin" | "readonly" | null;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole;
  userId: string | null;
  userEmail: string | null;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: extract role from the database based on email
  const deriveRoleFromSession = async (session: any): Promise<UserRole> => {
    if (!session?.user?.email) return null;

    try {
      const role = await getUserRole(session.user.email);
      return role;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  };

  // Initialise auth state once on mount and subscribe to further changes
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      setIsAuthenticated(!!currentSession);

      const role = await deriveRoleFromSession(currentSession);
      setUserRole(role);

      setUserId(currentSession?.user?.id || null);
      setUserEmail(currentSession?.user?.email || null);
      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsAuthenticated(!!session);

        const role = await deriveRoleFromSession(session);
        setUserRole(role);

        setUserId(session?.user?.id || null);
        setUserEmail(session?.user?.email || null);
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
    // Ensure user roles table exists
    await ensureUserRolesTable();

    // Check if user has a role in the database
    const userRole = await getUserRole(email);
    if (!userRole) {
      console.warn("Signup attempt blocked: user not authorized");
      return false;
    }

    const role: UserRole = userRole;

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
        userId,
        userEmail,
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
