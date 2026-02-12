// Ten endpoint zmienia status newsa (published <-> draft) po stronie SERWERA.
// Dzięki temu nie dajesz użytkownikowi uprawnień do UPDATE bezpośrednio w przeglądarce.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Klient Supabase z uprawnieniami admina (tylko na serwerze!)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Prosta ochrona: tylko ktoś z ADMIN_SECRET może wywołać ten endpoint
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Oczekujemy JSON: { id: number, newStatus: "published" | "draft" }
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const newStatus = body?.newStatus;

  if (!id || (newStatus !== "published" && newStatus !== "draft")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Aktualizacja statusu + opcjonalnie published_at
  const { error } = await supabase
    .from("news")
    .update({
      status: newStatus,
      published_at: newStatus === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
