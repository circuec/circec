import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Server Component - renderuje się na serwerze (SEO!)
export default async function AktualnosciPage({
  searchParams
}: {
  searchParams: { kategoria?: string }
}) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  const category = searchParams.kategoria;
  
  // Buduj zapytanie
  let query = supabase
    .from('news')
    .select('*, category:news_categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);
    
  if (category) {
    query = query.eq('category_slug', category);
  }
  
  const { data: news } = await query;
  
  // Pobierz kategorie do filtrów
  const { data: categories } = await supabase
    .from('news_categories')
    .select('*')
    .order('name');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Aktualności GOZ</h1>
      <p className="text-slate-600 mb-8">
        Najnowsze informacje z obszaru gospodarki obiegu zamkniętego, recyklingu i zrównoważonego rozwoju.
      </p>
      
      {/* Filtry kategorii */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link 
          href="/aktualnosci"
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            !category ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Wszystkie
        </Link>
        {categories?.map((cat) => (
          <Link
            key={cat.slug}
            href={`/aktualnosci?kategoria=${cat.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === cat.slug 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
      
      {/* Lista aktualności */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news?.map((item) => (
          <article 
            key={item.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
          >
            {item.image_url && (
              <div className="h-48 bg-gray-200 relative">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                {item.category && (
                  <span 
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: item.category.color }}
                  >
                    {item.category.name}
                  </span>
                )}
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <span>{new Date(item.published_at).toLocaleDateString('pl-PL')}</span>
                {item.source_name && (
                  <>
                    <span>•</span>
                    <span>{item.source_name}</span>
                  </>
                )}
              </div>
              
              <h2 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2">
                <Link href={`/aktualnosci/${item.slug}`} className="hover:text-emerald-700">
                  {item.title}
                </Link>
              </h2>
              
              <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                {item.excerpt || item.ai_summary || 'Brak podsumowania...'}
              </p>
              
              <div className="flex items-center justify-between">
                <Link 
                  href={`/aktualnosci/${item.slug}`}
                  className="text-emerald-600 text-sm font-medium hover:text-emerald-800"
                >
                  Czytaj więcej →
                </Link>
                
                {item.source_type === 'ai-generated' && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    AI
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {news?.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Brak aktualności w tej kategorii.
        </div>
      )}
    </div>
  );
}