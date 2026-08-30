import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Use in Client Components ("use client"). Reads the public env vars,
// safe to expose to the browser.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
