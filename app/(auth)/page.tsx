import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthScreen } from "@/components/AuthScreen";

export default async function RootPage({
  searchParams,
}: {
  searchParams: { auth_error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/hub");

  return <AuthScreen showError={searchParams.auth_error === "1"} />;
}
