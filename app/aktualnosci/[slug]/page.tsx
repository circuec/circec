import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function NewsPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  const { data: news } = await supabase
    .from('news')
    .select('*, category:news_categories(*)')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();
    
  if (!news) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <div className="text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-emerald-600">Start</Link>
        <span className="mx-2">/</span>
        <Link href="/aktualnosci" className="hover:text-emerald-600">Aktualności</Link>
        {news.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/aktualnosci?kategoria=${news.category.slug}`} className="hover:text-emerald-600">
              {news.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-800">{news.title}</span>
      </div>
      
      {/* Nagłówek */}
      <header className="mb-8">
        {news.category && (
          <span 
            className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-4"
            style={{ backgroundColor: news.category.color }}
          >
            {news.category.name}
          </span>
        )}
        
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          {news.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{new Date(news.published_at).toLocaleDateString('pl-PL', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}</span>
          {news.source_name && (
            <>
              <span>•</span>
              <span>Źródło: {news.source_name}</span>
            </>
          )}
          {news.source_url && (
            <>
              <span>•</span>
              <a href={news.source_url} target="_blank" rel="noopener" className="text-emerald-600 hover:underline">
                Oryginalny artykuł ↗
              </a>
            </>
          )}
        </div>
      </header>
      
      {/* Treść */}
      <div className="prose prose-lg max-w-none">
        {news.image_url && (
          <img 
            src={news.image_url} 
            alt={news.title} 
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
          />
        )}
        
        {news.ai_summary && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 mb-8 rounded-r-lg">
            <h3 className="text-emerald-800 font-bold mb-2">Podsumowanie AI</h3>
            <p className="text-emerald-700 m-0">{news.ai_summary}</p>
          </div>
        )}
        
        <div dangerouslySetInnerHTML={{ __html: news.content }} />
      </div>
      
      {/* Tagi */}
      {news.tags && news.tags.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Tagi</h3>
          <div className="flex flex-wrap gap-2">
            {news.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}