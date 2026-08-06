"use client";

import { useEffect, useState } from "react";
import FighterPublicPage from "@/components/fighter-public-page";
import type { FighterPublicProfile } from "@/lib/fighter-public";
import type { WarriorRole } from "@/lib/roles";
import { resolveWarriorRole } from "@/lib/roles";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { createWarriorBrowserClient } from "@/lib/supabase/client";

export default function FighterPublicGate({
  profile,
}: {
  profile: FighterPublicProfile;
}) {
  const auth = useWarriorAuth();
  const [viewerRole, setViewerRole] = useState<WarriorRole | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setViewerRole(null);
      return;
    }
    const client = createWarriorBrowserClient();
    if (!client) {
      setViewerRole("fighter");
      return;
    }
    let cancelled = false;
    void client
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setViewerRole(resolveWarriorRole(data?.role));
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return <FighterPublicPage profile={profile} viewerRole={viewerRole} />;
}
