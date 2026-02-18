// Next.js: typ requestu i helper do zwracania JSON
import { NextRequest, NextResponse } from "next/server";

// RSS parser: będziemy parsować XML -> obiekty JS
import Parser from "rss-parser";

// Supabase client: zapisujemy newsy do bazy
import { createClient } from "@supabase/supabase-js";

// Wymuszamy Node runtime (ważne dla fetch + bibliotek)
export const runtime = "nodejs";

/**
 * 1) Łączymy się z Supabase przez SERVICE ROLE
 *    - bo ten endpoint zapisuje do DB
 *    - działa tylko po stronie serwera
 */
const supabase = createClient(
  process.env.SUPABASE_URL!, // adres Supabase
  process.env.SUPABASE_SERVICE_ROLE_KEY! // klucz serwerowy (NIE publiczny)
);

/**
 * 2) RSS parser
 *    - UWAGA: będziemy parsować przez parseString(), a nie parseURL()
 *      bo chcemy mieć pełną kontrolę nad fetch (nagłówki, status, content-type)
 */
const rssParser = new Parser();

/**
 * 3) Źródła RSS
 *    - category_slug MUSI istnieć w tabeli news_categories (jeśli masz FK)
 */
const RSS_SOURCES = [
  {
    name: "Recycling Portal",
    url: "https://recyclingportal.eu/feed/",
    category: "recykling",
    language: "de",
  },
  {
    name: "Waste Management World",
    url: "https://waste-management-world.com/rss.xml",
    category: "goz",
    language: "en",
  },
  {
    name: "Circular Online",
    url: "https://circularonline.co.uk/feed/",
    category: "goz",
    language: "en",
  },
];

export async function GET(req: NextRequest) {
  /**
   * 4) DEBUG MODE
   *    Jeśli wejdziesz na:
   *    /api/cron/fetch-news?debug=1
   *    to dostaniesz dodatkowe dane diagnostyczne.
   */
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  /**
   * 5) Zabezpieczenie endpointu:
   *    - Vercel Cron potrafi wysyłać nagłówek x-vercel-cron: 1
   *    - ręcznie testujesz przez Authorization: Bearer CRON_SECRET
   */
  const isFromVercelCron = req.headers.get("x-vercel-cron") === "1";

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  const isAuthorizedBySecret =
    !!process.env.CRON_SECRET && authHeader.trim() === expected.trim();

  if (!isFromVercelCron && !isAuthorizedBySecret) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        debug: {
          isFromVercelCron,
          hasAuthHeader: !!authHeader,
          authHeaderStartsWithBearer: authHeader
            .toLowerCase()
            .startsWith("bearer "),
          hasCronSecretEnv: !!process.env.CRON_SECRET,
        },
      },
      { status: 401 }
    );
  }

  /**
   * 6) Tu zbieramy wyniki (co zapisaliśmy do DB)
   */
  const savedResults: Array<{ source: string; title: string }> = [];

  /**
   * 7) Tu zbieramy diagnostykę per feed (tylko jeśli debug=1)
   */
  const debugFeeds: Array<any> = [];

  /**
   * 8) Iterujemy po każdym źródle RSS
   */
  for (const source of RSS_SOURCES) {
    try {
      /**
       * 8.1) Pobieramy RSS przez fetch()
       *      Dodajemy User-Agent i Accept, bo niektóre serwisy blokują "anonimowe" boty.
       */
      const res = await fetch(source.url, {
        method: "GET",
        headers: {
          "User-Agent": "CIRCECbot/1.0 (+https://www.circec.eu)",
          Accept:
            "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        },
        redirect: "follow",
      });

      const contentType = res.headers.get("content-type") || "";
      const xmlText = await res.text();

      // Jeśli debug, zapisz podstawowe informacje o odpowiedzi HTTP
      if (debug) {
        debugFeeds.push({
          source: source.name,
          url: source.url,
          httpStatus: res.status,
          contentType,
          // próbka początku odpowiedzi - pokaże, czy to XML czy HTML
          sample: xmlText.slice(0, 120),
        });
      }

      /**
       * 8.2) Jeżeli serwer nie zwrócił 200 OK, pomijamy źródło
       */
      if (!res.ok) {
        console.error(`RSS HTTP error (${source.name}):`, res.status);
        continue;
      }

      /**
       * 8.3) Parsujemy XML -> feed
       */
      const feed = await rssParser.parseString(xmlText);

      // Jeżeli feed nie ma items albo ma 0, to nic nie zapisujemy
      const items = feed.items || [];
      if (debug) {
        // dopisz informację, ile itemów parser znalazł
        debugFeeds[debugFeeds.length - 1].parsedItemsCount = items.length;
      }

      /**
       * 8.4) Bierzemy max 5 newsów z danego źródła
       */
      for (const item of items.slice(0, 5)) {
        if (!item.title || !item.link) continue;

        /**
         * 8.5) Deduplikacja:
         *      jeśli external_id (link) już istnieje w bazie, pomijamy
         */
        const { data: existing, error: existingError } = await supabase
          .from("news")
          .select("id")
          .eq("external_id", item.link)
          .maybeSingle();

        if (existingError) {
          console.error("Błąd sprawdzania istnienia:", existingError);
          continue;
        }

        if (existing) continue;

        /**
         * 8.6) Generujemy slug:
         *      - zamieniamy znaki na "bezpieczny URL"
         *      - dokładamy Date.now() żeby unikać kolizji
         */
        const baseSlug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9ąćęłńóśźż]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        /**
         * 8.7) Insert do DB:
         *      status = 'review' → admin później publikuje
         */
        const { error } = await supabase.from("news").insert({
          title: item.title,
          slug: `${baseSlug}-${Date.now()}`,
          excerpt: item.contentSnippet?.substring(0, 300) || "",
          content: (item as any).content || "",
          source_type: "rss",
          source_name: source.name,
          source_url: item.link,
          external_id: item.link,
          category_slug: source.category,
          status: "review",
          published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
        });

        if (!error) {
          savedResults.push({
            source: source.name,
            title: item.title.substring(0, 60),
          });
        } else {
          console.error("Błąd zapisu do Supabase:", error);
        }
      }
    } catch (err) {
      console.error(`Błąd RSS (${source.name}):`, err);
    }
  }

  /**
   * 9) Zwracamy wynik:
   *    - fetched: ile zapisaliśmy
   *    - items: krótkie info o zapisanych
   *    - debugFeeds: diagnostyka (tylko gdy debug=1)
   */
  return NextResponse.json({
    success: true,
    fetched: savedResults.length,
    items: savedResults,
    debug: debug ? { debugFeedsCount: debugFeeds.length, debugFeeds } : undefined,
    version: "fetch-news-2026-02-18-1"
  });
}
