import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function HomePage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    redirect(user ? "/journey" : "/onboarding/flow");
  } catch {
    redirect("/onboarding/flow");
  }
}
