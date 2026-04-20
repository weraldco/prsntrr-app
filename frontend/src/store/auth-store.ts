import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { bindAccessToken } from "../lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  clear: () => void;
};

function mapUser(u: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string) ?? "",
  };
}

let subscriptionCleanup: (() => void) | null = null;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  clear: () => set({ user: null, accessToken: null }),
  initialize: async () => {
    subscriptionCleanup?.();
    subscriptionCleanup = null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({
      user: session?.user ? mapUser(session.user) : null,
      accessToken: session?.access_token ?? null,
      initialized: true,
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        user: nextSession?.user ? mapUser(nextSession.user) : null,
        accessToken: nextSession?.access_token ?? null,
      });
    });
    subscriptionCleanup = () => subscription.unsubscribe();
  },
}));

bindAccessToken(() => useAuthStore.getState().accessToken);

export async function loginRequest(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function registerRequest(email: string, password: string, name: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data.session) {
    throw new Error(
      "Account created. If email confirmation is enabled, check your inbox before signing in.",
    );
  }
}

export async function logoutRequest(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  useAuthStore.getState().clear();
}
