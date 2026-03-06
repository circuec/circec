import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: { news_id?: number; vote?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const { news_id, vote } = body;

  if (!news_id || ![1, -1].includes(vote as number)) {
    return NextResponse.json(
      { error: "Wymagane: news_id (number), vote (1 lub -1)" },
      { status: 400 }
    );
  }

  // Haszujemy IP – nie przechowujemy surowego IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ip_hash = createHash("sha256").update(ip).digest("hex");

  // Sprawdzamy czy użytkownik już głosował na ten news
  const { data: existing } = await supabase
    .from("news_votes")
    .select("id, vote")
    .eq("news_id", news_id)
    .eq("ip_hash", ip_hash)
    .maybeSingle();

  let delta = vote as number;
  let userVote: number | null = vote as number;

  if (existing) {
    if (existing.vote === vote) {
      // Ten sam przycisk → cofnij głos
      await supabase.from("news_votes").delete().eq("id", existing.id);
      delta = -(vote as number);
      userVote = null;
    } else {
      // Zmiana kierunku głosu (np. góra → dół)
      await supabase
        .from("news_votes")
        .update({ vote })
        .eq("id", existing.id);
      delta = (vote as number) - existing.vote; // np. 1 - (-1) = 2
    }
  } else {
    await supabase
      .from("news_votes")
      .insert({ news_id, ip_hash, vote });
  }

  // Pobieramy aktualny score i aktualizujemy
  const { data: newsData } = await supabase
    .from("news")
    .select("score")
    .eq("id", news_id)
    .single();

  const newScore = (newsData?.score ?? 0) + delta;

  await supabase
    .from("news")
    .update({ score: newScore })
    .eq("id", news_id);

  return NextResponse.json({ score: newScore, userVote });
}
