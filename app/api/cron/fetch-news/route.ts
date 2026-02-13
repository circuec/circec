// Importujemy typy i narzędzia z Next.js do obsługi endpointów API
import { NextRequest, NextResponse } from 'next/server'

// Biblioteka do czytania kanałów RSS (newsów)
import Parser from 'rss-parser'

// Oficjalny klient Supabase do komunikacji z bazą danych
import { createClient } from '@supabase/supabase-js'

// Wymuszamy uruchamianie tego endpointu w środowisku Node.js
// (RSS i Supabase NIE działają w Edge Runtime)
export const runtime = 'nodejs'

/**
 * Tworzymy połączenie z Supabase
 * 
 * UŻYWAMY SERVICE ROLE KEY, bo:
 * - ten endpoint zapisuje dane do bazy
 * - jest uruchamiany tylko na serwerze (cron)
 * - klucz NIE trafia do przeglądarki
 */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tworzymy parser RSS
const rssParser = new Parser()

/**
 * Lista źródeł RSS
 * Każde źródło opisujemy:
 * - name: nazwa wyświetlana
 * - url: adres RSS
 * - category: kategoria w Twojej bazie
 * - language: język artykułów
 */
const RSS_SOURCES = [
  {
    name: 'Recycling Portal',
    url: 'https://recyclingportal.eu/feed/',
    category: 'recykling',
    language: 'de'
  },
  {
    name: 'Waste Management World',
    url: 'https://waste-management-world.com/rss.xml',
    category: 'goz',
    language: 'en'
  },
  {
    name: 'Circular Online',
    url: 'https://circularonline.co.uk/feed/',
    category: 'goz',
    language: 'en'
  }
]

/**
 * Endpoint GET
 * Ten endpoint:
 * - jest wywoływany przez CRON (np. Vercel Cron)
 * - pobiera newsy z RSS
 * - zapisuje je do Supabase
 */
export async function GET(req: NextRequest) {

                                /**
                                 * ZABEZPIECZENIE:
                                 * Sprawdzamy czy zapytanie przyszło z crona,
                                 * a nie od przypadkowej osoby z internetu**/
 

                              
 /**
   * ZABEZPIECZENIE ENDPOINTU (2 tryby):
   * 1) Vercel Cron → wysyła automatycznie nagłówek: x-vercel-cron: 1
   * 2) Ręczne wywołanie (np. PowerShell) → Authorization: Bearer CRON_SECRET
   *
   * Dzięki temu:
   * - cron z Vercel działa automatycznie,
   * - Ty możesz testować endpoint ręcznie.
   */
  const isFromVercelCron = req.headers.get('x-vercel-cron') === '1';

  const authHeader = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;

  const isAuthorizedBySecret =
    !!process.env.CRON_SECRET && authHeader.trim() === expected.trim();

  if (!isFromVercelCron && !isAuthorizedBySecret) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        // Bezpieczny debug — nie pokazujemy sekretów, tylko „czy coś przyszło”
        debug: {
          isFromVercelCron,
          hasAuthHeader: !!authHeader,
          authHeaderStartsWithBearer: authHeader.toLowerCase().startsWith('bearer '),
          hasCronSecretEnv: !!process.env.CRON_SECRET,
        },
      },
      { status: 401 }
    );
  }

  // Tu będziemy zbierać info o zapisanych artykułach
  const results: Array<{ source: string; title: string }> = []

  /**
   * Iterujemy po każdym źródle RSS
   */
  for (const source of RSS_SOURCES) {
    try {
      // Pobieramy i parsujemy RSS
      const feed = await rssParser.parseURL(source.url)

      /**
       * Bierzemy tylko 5 najnowszych artykułów,
       * żeby:
       * - nie przeciążyć API
       * - nie przekroczyć limitu czasu na Vercel
       */
      for (const item of feed.items.slice(0, 5)) {

        // Jeśli artykuł nie ma tytułu lub linku — pomijamy
        if (!item.title || !item.link) continue

        /**
         * Sprawdzamy, czy artykuł już istnieje w bazie
         * (po unikalnym linku zewnętrznym)
         */
        const { data: existing, error: existingError } = await supabase
          .from('news')
          .select('id')
          .eq('external_id', item.link)
          .maybeSingle()

        // Jeśli był błąd przy sprawdzaniu — pomijamy
        if (existingError) {
          console.error('Błąd sprawdzania istnienia:', existingError)
          continue
        }

        // Jeśli artykuł już jest w bazie — pomijamy
        if (existing) continue

        /**
         * Generujemy slug (adres URL) z tytułu
         */
        const baseSlug =
          item.title
            .toLowerCase()
            .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .substring(0, 80)

        /**
         * Zapisujemy artykuł do Supabase
         * status = 'review' → artykuł czeka na akceptację
         */
        const { error } = await supabase
          .from('news')
          .insert({
            title: item.title,
            slug: `${baseSlug}-${Date.now()}`,
            excerpt: item.contentSnippet?.substring(0, 300) || '',
            content: (item as any).content || '',
            source_type: 'rss',
            source_name: source.name,
            source_url: item.link,
            external_id: item.link,
            category_slug: source.category,
            status: 'review',
            published_at: item.pubDate
              ? new Date(item.pubDate)
              : new Date()
          })

        // Jeśli zapis się udał — dodajemy do wyników
        if (!error) {
          results.push({
            source: source.name,
            title: item.title.substring(0, 50)
          })
        } else {
          console.error('Błąd zapisu do Supabase:', error)
        }
      }
    } catch (err) {
      console.error(`Błąd RSS (${source.name}):`, err)
    }
  }

  /**
   * Odpowiedź końcowa — informacja ile artykułów zapisano
   */
  return NextResponse.json({
    success: true,
    fetched: results.length,
    items: results
  })
}
