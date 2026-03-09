import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  // Weryfikacja sesji admina przez token Supabase
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabaseAuth.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Pobierz kategorie
  const { data: categories } = await supabase
    .from("news_categories")
    .select("slug, name, description");

  if (!categories || categories.length === 0) {
    return NextResponse.json({ error: "Brak kategorii" }, { status: 500 });
  }

  const categorySlugs = categories.map((c) => c.slug);
  const categoryList = categories
    .map((c) => `- ${c.slug}: ${c.name}${c.description ? ` – ${c.description}` : ""}`)
    .join("\n");

  // Newsy bez ai_summary, review lub published
  const { data: newsItems, error } = await supabase
    .from("news")
    .select("id, title, excerpt, content, category_slug")
    .or("status.eq.review,status.eq.published")
    .is("ai_summary", null)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!newsItems || newsItems.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const results = [];

  for (const item of newsItems) {
    try {
      const prompt = `Jesteś asystentem redakcji portalu o gospodarce obiegu zamkniętego (GOZ).

Przeanalizuj poniższy artykuł i zwróć odpowiedź TYLKO w formacie JSON (bez żadnego tekstu przed ani po).

Dostępne kategorie (użyj dokładnie jednego slug-a z listy):
${categoryList}

Przypisz kategorię na podstawie KONTEKSTU artykułu, nie tylko słów kluczowych. category musi być dokładnie jednym ze slug-ów z listy.

Format odpowiedzi:
{
  "title_pl": "przetłumaczony tytuł po polsku (jeśli już po polsku – zostaw bez zmian)",
  "summary_pl": "streszczenie po polsku, 3-5 zdań, rzeczowe i informacyjne",
  "category": "slug kategorii – wybierz NAJLEPIEJ pasującą z listy powyżej",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.9
}

Zasady tagowania:
- Tagi po polsku, maksymalnie 2-4 słowa, małe litery
- Minimum 3, maksimum 8 tagów

Tytuł: ${item.title}
Treść: ${(item.excerpt || item.content || "").substring(0, 1200)}`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = message.content[0].type === "text" ? message.content[0].text : "";
      const clean = responseText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const resolvedCategory = categorySlugs.includes(parsed.category)
        ? parsed.category
        : item.category_slug;

      const { error: updateError } = await supabase
        .from("news")
        .update({
          ai_summary: parsed.summary_pl,
          title: parsed.title_pl || item.title,
          category_slug: resolvedCategory,
          ai_tags: parsed.tags || [],
          ai_confidence: parsed.confidence || 0.8,
        })
        .eq("id", item.id);

      if (updateError) {
        results.push({ id: item.id, error: updateError.message });
      } else {
        results.push({ id: item.id, title_pl: parsed.title_pl, category: resolvedCategory });
      }
    } catch (err: any) {
      results.push({ id: item.id, error: err.message });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
