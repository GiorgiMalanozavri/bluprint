import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function requireAppUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // If no database, return a mock app user from Supabase user data
  if (!prisma) {
    return {
      supabaseUser: user,
      appUser: {
        id: user.id,
        email: user.email || `${user.id}@placeholder.local`,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student",
      },
    };
  }

  const appUser = await prisma.user.upsert({
    where: { email: user.email || `${user.id}@placeholder.local` },
    update: {
      id: user.id,
      email: user.email || `${user.id}@placeholder.local`,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student",
    },
    create: {
      id: user.id,
      email: user.email || `${user.id}@placeholder.local`,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student",
    },
  });

  return { supabaseUser: user, appUser };
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
