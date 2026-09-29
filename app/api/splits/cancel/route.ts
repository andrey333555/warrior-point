import { NextResponse } from "next/server";
import { cancelSplit } from "@/lib/supabase/splits-sync";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { requireBoundUserId } from "@/lib/api-session";
import { fetchActorRole } from "@/lib/api-actor";
import { canRecordSessions } from "@/lib/roles";

export const runtime = "nodejs";

type CancelBody = {
  coachId?: string;
  splitId?: string;
};

/**
 * Server-authoritative split cancellation.
 * coachId must match the authenticated session (or demo gate); only the
 * split's own coach, or an admin, may cancel it. Replaces the old
 * client-side anon-key `cancelSplit()` call.
 */
export async function POST(req: Request) {
  let body: CancelBody;
  try {
    body = (await req.json()) as CancelBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const splitId = body.splitId?.trim() ?? "";
  if (!splitId) {
    return NextResponse.json(
      { ok: false, message: "splitId обязателен" },
      { status: 400 },
    );
  }

  const bound = await requireBoundUserId(body.coachId ?? null);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }

  const role = await fetchActorRole(bound.userId);
  if (!role || !canRecordSessions(role)) {
    return NextResponse.json(
      { ok: false, message: "Нужна роль coach/admin" },
      { status: 403 },
    );
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Supabase не настроен" },
      { status: 503 },
    );
  }

  if (role !== "admin") {
    const { data: split, error: fetchErr } = await client
      .from("training_splits")
      .select("coach_id")
      .eq("id", splitId)
      .maybeSingle();

    if (fetchErr || !split) {
      return NextResponse.json(
        { ok: false, message: "Сплит не найден" },
        { status: 404 },
      );
    }
    if (split.coach_id !== bound.userId) {
      return NextResponse.json(
        { ok: false, message: "Можно отменить только свой сплит" },
        { status: 403 },
      );
    }
  }

  const { error } = await cancelSplit(client, splitId);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
