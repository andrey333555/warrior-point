import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { requireBoundUserId } from "@/lib/api-session";

/**
 * AI-KYC stub: accepts a document filename and marks verification_status=pending.
 * profileId must match the authenticated session (or demo gate).
 */
export async function POST(req: Request) {
  let body: { profileId?: string; fileName?: string };
  try {
    body = (await req.json()) as { profileId?: string; fileName?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const claimed = body.profileId?.trim() ?? "";
  const bound = await requireBoundUserId(claimed || null);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }
  const profileId = bound.userId;

  if (!body.fileName?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Загрузите файл документа" },
      { status: 400 },
    );
  }

  const sb = createWarriorServiceClient() ?? createWarriorBrowserClient();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      status: "pending",
      message: "Заявка принята (demo). AI-проверка — в backlog.",
    });
  }

  const { error } = await sb
    .from("profiles")
    .update({
      verification_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "Документ принят. Статус: на проверке (AI-KYC stub).",
  });
}
