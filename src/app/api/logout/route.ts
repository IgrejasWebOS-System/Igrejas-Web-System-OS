import { createClient } from "@/utils/supabase/server";
import { cookies }      from "next/headers";
import { redirect }     from "next/navigation";

export async function POST() {
  const supabase    = await createClient();
  const cookieStore = await cookies();

  await supabase.auth.signOut();
  cookieStore.delete("iw_context");

  redirect("/login");
}
