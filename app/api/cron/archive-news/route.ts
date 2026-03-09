import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_PER_CATEGORY = 40;

export async function GET(req: NextRequest) {
  const isFromVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization") || "";
  const isAuthorized =
    isFromVercelCron || authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: categories, error: catError } = await supabase
    .from("news_categories")
    .select("slug");

  if (catError || !categories) {
    return NextResponse.json({ error: catError?.message }, { status: 500 });
  }

  const archived: { category: string; ids: number[] }[] = [];

  for (const cat of categories) {
    // Pobierz wszystkie opublikowane newsy w kategorii, pinned najpierw, potem od najnowszych
    const { data: catNews } = await supabase
      .from("news")
      .select("id, pinned, published_at")
      .eq("category_slug", cat.slug)
      .eq("status", "published")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false });

    if (!catNews || catNews.length <= MAX_PER_CATEGORY) continue;

    // Przekroczone - weź nadmiarowe (od pozycji 40+), pomiń przypięte
    const toArchiveIds = catNews
      .slice(MAX_PER_CATEGORY)
      .filter((n) => !n.pinned)
      .map((n) => n.id);

    if (toArchiveIds.length === 0) continue;

    const { error: archiveError } = await supabase
      .from("news")
      .update({ status: "archived" })
      .in("id", toArchiveIds);

    if (!archiveError) {
      archived.push({ category: cat.slug, ids: toArchiveIds });
    }
  }

  const totalArchived = archived.reduce((sum, c) => sum + c.ids.length, 0);

  return NextResponse.json({
    success: true,
    totalArchived,
    categories: archived,
  });
}
