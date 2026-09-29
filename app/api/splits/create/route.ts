import { NextResponse } from "next/server";
import { createSplit } from "@/lib/supabase/splits-sync";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { requireBoundUserId } from "@/lib/api-session";
import { fetchActorRole } from "@/lib/api-actor";
import { canRecordSessions } from "@/lib/roles";

export const runtime = "nodejs";

type CreateBody = {
  coachId?: string;
  topic?: string;
  pricePerSeat?: number;
  maxSeats?: number;
};

/**
 * Server-authoritative split creation.
 * coachId must match the authenticated session (or demo gate); role must
 * be coach/admin. Replaces the old client-side anon-key `createSplit()` call.
 */
export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const topic = body.topic?.trim() ?? "";
  const pricePerSeat = Number(body.pricePerSeat);
  const maxSeats = Number(body.maxSeats);
  if (!topic || !Number.isFinite(pricePerSeat) || !Number.isFinite(maxSeats)) {
    return NextResponse.json(
      { ok: false, message: "topic, pricePerSeat и maxSeats обязательны" },
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

  const { data, error } = await createSplit(client, {
    coachId: bound.userId,
    topic,
    pricePerSeat,
    maxSeats,
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Не удалось создать сплит" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
