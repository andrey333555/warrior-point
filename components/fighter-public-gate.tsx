"use client";

import { useEffect, useState } from "react";
import FighterPublicPage from "@/components/fighter-public-page";
import type { FighterPublicProfile } from "@/lib/fighter-public";
import type { WarriorRole } from "@/lib/roles";
import { resolveWarriorRole } from "@/lib/roles";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { createWarriorBrowserClient } from "@/lib/supabase/client";

export default function FighterPublicGate({
  profile: initial,
  slug,
}: {
  profile: FighterPublicProfile;
  slug: string;
}) {
  const auth = useWarriorAuth();
  const [viewerRole, setViewerRole] = useState<WarriorRole | null>(null);
  const [profile, setProfile] = useState(initial);

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

  // Privileged viewers re-fetch full card (SSR shipped redacted payload).
  useEffect(() => {
    if (viewerRole !== "admin" && viewerRole !== "coach") return;
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    void fetch(
      `/api/fighter/${encodeURIComponent(slug)}?actorId=${encodeURIComponent(auth.user.id)}`,
    )
      .then((r) => r.json())
      .then((data: { ok?: boolean; profile?: FighterPublicProfile }) => {
        if (!cancelled && data.ok && data.profile) setProfile(data.profile);
      })
      .catch(() => {
        /* keep SSR payload */
      });
    return () => {
      cancelled = true;
    };
  }, [viewerRole, auth, slug]);

  return <FighterPublicPage profile={profile} viewerRole={viewerRole} />;
}
