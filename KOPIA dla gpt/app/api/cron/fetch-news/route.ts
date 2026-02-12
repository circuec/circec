//import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, headers } from 'next/server';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const rssParser = new Parser();

// Lista źródeł RSS o GOZ/recyklingu
const RSS_SOURCES = [
  {
    name: 'Recycling Portal',
    url: 'https://recyclingportal.eu/feed/',
    category: 'recykling',
    language: 'de' // niemiecki, ale można tłumaczyć
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
];

export async function GET() {
  // Chronometraż - tylko z cron lub sekretem
  const authHeader = headers().get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await rssParser.parseURL(source.url);
      
      for (const item of feed.items.slice(0, 5)) { // tylko 5 najnowszych
        // Sprawdź czy już mamy ten artykuł (po linku)
        const { data: existing } = await supabase
          .from('news')
          .select('id')
          .eq('external_id', item.link)
          .single();

        if (existing) {
          console.log(`Pominięto (już istnieje): ${item.title}`);
          continue;
        }

        // Generuj slug z tytułu
        const slug = item.title
          ?.toLowerCase()
          .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 80) || 'news-' + Date.now();

        // Wstaw do bazy ze statusem 'review' (do przejrzenia)
        const { error } = await supabase.from('news').insert({
          title: item.title,
          slug: slug + '-' + Date.now(), // unikalny
          excerpt: item.contentSnippet?.substring(0, 300) || '',
          content: item.content || item['content:encoded'] || '',
          source_type: 'rss',
          source_name: source.name,
          source_url: item.link,
          external_id: item.link,
          category_slug: source.category,
          status: 'review', // ❗ nie published - czeka na akceptację
          published_at: item.pubDate ? new Date(item.pubDate) : new Date()
        });

        if (!error) {
          results.push({ source: source.name, title: item.title?.substring(0, 50) });
        }
      }
    } catch (err) {
      console.error(`Błąd RSS ${source.name}:`, err);
    }
  }

  return NextResponse.json({ 
    success: true, 
    fetched: results.length,
    items: results 
  });
}