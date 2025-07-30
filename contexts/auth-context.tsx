"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
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

// Resolve or reject the promise within the given timeframe, making sure to
// clear the timer once the promise settles so we do **not** create lingering
// rejected promises that could surface as "unhandled rejection" errors.
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Operation timed out")),
      ms
    );

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Next.js router for client-side redirects when a session becomes available
  const router = useRouter();

  // Cache to prevent redundant role checks
  const roleCache = useRef<Map<string, { role: UserRole; timestamp: number }>>(
    new Map()
  );
  const initializationRef = useRef<boolean>(false);

  // Helper: extract role from the database based on email with caching and timeout
  const deriveRoleFromSession = async (session: any): Promise<UserRole> => {
    if (!session?.user?.email) return null;

    const email = session.user.email;

    // Check cache first (cache for 5 minutes)
    const cached = roleCache.current.get(email);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.role;
    }

    try {
      // Reduce timeout to 5 seconds for faster failures
      const role = await withTimeout(getUserRole(email), 5000);

      // Cache the result
      roleCache.current.set(email, { role, timestamp: Date.now() });

      return role;
    } catch (error) {
      console.warn("Failed to derive role from session:", error);

      // If it's a timeout error, try to return a cached value (even if expired)
      if (error instanceof Error && error.message.includes("timeout")) {
        const expiredCached = roleCache.current.get(email);
        if (expiredCached) {
          console.log("Using expired cached role due to timeout");
          return expiredCached.role;
        }
      }

      // Default to readonly role instead of null to prevent blocking
      return "readonly" as UserRole;
    }
  };

  // Initialise auth state once on mount and subscribe to further changes
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    const init = async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 5000);
        const currentSession = data.session;
        const hasSession = !!currentSession;
        setIsAuthenticated(hasSession);

        if (currentSession) {
          const role = await deriveRoleFromSession(currentSession);
          setUserRole(role);
          setUserId(currentSession.user.id);
          setUserEmail(currentSession.user.email || null);

          // If we previously redirected to /login but actually have a session,
          // send the user back to the main dashboard immediately.
          if (hasSession) {
            router.replace("/");
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Continue without authentication - don't block the app
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserEmail(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const hasSession = !!session;
        setIsAuthenticated(hasSession);

        if (session) {
          try {
            const role = await deriveRoleFromSession(session);
            setUserRole(role);
            setUserId(session.user.id);
            setUserEmail(session.user.email || null);

            // Ensure authenticated users are never left on the login page.
            router.replace("/");
          } catch (error) {
            console.error("Error updating auth state:", error);
            // Don't fail completely - set basic auth without role
            setUserRole(null);
            setUserId(session.user.id);
            setUserEmail(session.user.email || null);
          }
        } else {
          setUserRole(null);
          setUserId(null);
          setUserEmail(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Sign-in helper
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000
      );
      if (error) {
        console.error("Login error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Login timeout or error:", error);
      return false;
    }
  };

  // Sign-up helper (stores selected role in user_metadata)
  const signup = async (email: string, password: string): Promise<boolean> => {
    try {
      // Ensure user roles table exists with reduced timeout
      await withTimeout(ensureUserRolesTable(), 5000);

      // Check if user has a role in the database with reduced timeout
      const userRole = await withTimeout(getUserRole(email), 5000);
      if (!userRole) {
        console.warn("Signup attempt blocked: user not authorized");
        return false;
      }

      const role: UserRole = userRole;

      const { error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: { data: { role } },
        }),
        15000
      );

      if (error) {
        console.error("Signup error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Signup timeout or error:", error);
      return false;
    }
  };

  const logout = () => {
    // Clear cache on logout
    roleCache.current.clear();
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
