import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Every Supabase email-link / OAuth redirect lands here first. The URL
// carries a `code` param that must be exchanged server-side for a
// session — that's what actually sets the auth cookie. Only after this
// succeeds does the person count as signed in anywhere else in the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/hub";
  // Only allow relative, in-app paths — never redirect to an external host
  // via a crafted `next` value.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/hub";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing or invalid code — send back to sign-in with a flag the
  // auth screen can use to show an error state.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
