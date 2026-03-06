import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function GET(req: NextRequest) {
  const isFromVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization") || "";
  const isAuthorized =
    isFromVercelCron ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pobierz kategorie z bazy
  const { data: categories, error: catError } = await supabase
    .from("news_categories")
    .select("slug, name, description");

  if (catError || !categories || categories.length === 0) {
    return NextResponse.json(
      { error: "Nie udało się pobrać kategorii", details: catError?.message },
      { status: 500 }
    );
  }

  const categorySlugs = categories.map((c) => c.slug);

  const categoryList = categories
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` – ${c.description}` : ""}`)
    .join("\n");

  // Pobierz newsy z "sierocymi" slug-ami (nie należą do aktualnych kategorii lub są null)
  const { data: newsItems, error } = await supabase
    .from("news")
    .select("id, title, ai_summary, excerpt, category_slug")
    .or(`category_slug.is.null,category_slug.not.in.(${categorySlugs.join(",")})`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!newsItems || newsItems.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const results = [];

  for (const item of newsItems) {
    try {
      const textForSummary = (item.ai_summary || item.excerpt || "").substring(0, 800);

      const prompt = `Jesteś asystentem kategoryzacji artykułów GOZ. Na podstawie tytułu i streszczenia przypisz JEDNĄ kategorię z poniższej listy. Odpowiedz TYLKO w JSON.

Kategorie:
${categoryList}

Format:
{ "category": "slug", "confidence": 0.85 }

Tytuł: ${item.title}
Streszczenie: ${textForSummary}`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 128,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      const clean = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (!categorySlugs.includes(parsed.category)) {
        results.push({
          id: item.id,
          prev_category: item.category_slug,
          category: null,
          skipped: true,
          reason: `Invalid category from Claude: ${parsed.category}`,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from("news")
        .update({ category_slug: parsed.category })
        .eq("id", item.id);

      if (updateError) {
        results.push({ id: item.id, error: updateError.message });
      } else {
        results.push({
          id: item.id,
          prev_category: item.category_slug,
          category: parsed.category,
        });
      }
    } catch (err: any) {
      results.push({ id: item.id, error: err.message });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
