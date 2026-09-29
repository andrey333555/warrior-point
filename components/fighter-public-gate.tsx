"use client";

import { useEffect, useState } from "react";
import FighterPublicPage from "@/components/fighter-public-page";
import type { FighterPublicProfile } from "@/lib/fighter-public";
import type { WarriorRole } from "@/lib/roles";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { fetchOwnProfileMe } from "@/lib/profile-me-api";

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
    let cancelled = false;
    void fetchOwnProfileMe(auth.user.id).then((own) => {
      if (!cancelled) setViewerRole(own?.role ?? "fighter");
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
