import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: org } = profile?.org_id
    ? await supabase.from("orgs").select("name").eq("id", profile.org_id).maybeSingle()
    : { data: null };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        orgName={org?.name ?? "Workspace"}
        email={user.email ?? "User"}
        role={profile?.role ?? "member"}
      />
      <main className="flex-1 overflow-y-auto bg-soft p-8">{children}</main>
    </div>
  );
}
