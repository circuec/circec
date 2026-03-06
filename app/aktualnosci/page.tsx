import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import VoteButtons from './_components/VoteButtons';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AktualnosciPage({
  searchParams
}: {
  searchParams: Promise<{ kategoria?: string }>
}) {
  const { kategoria: category } = await searchParams;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from('news')
    .select('*, category:news_categories(*)')
    .eq('status', 'published')
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(20);

  if (category) {
    query = query.eq('category_slug', category);
  }

  const { data: news } = await query;

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
            !category ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Wszystkie
        </Link>

        {categories?.map((cat: any) => (
          <Link
            key={cat.slug}
            href={`/aktualnosci?kategoria=${cat.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === cat.slug
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Lista aktualności */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news?.map((item: any) => (
          <article
            key={item.id}
            className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition flex flex-col ${
              item.pinned ? "ring-2 ring-amber-400" : ""
            }`}
          >
            {/* Obrazek + kategoria */}
            {item.image_url && (
              <div className="h-48 bg-gray-200 relative flex-shrink-0">
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

            <div className="p-5 flex flex-col flex-1">
              {/* Pinned badge + meta */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
                {item.pinned && (
                  <span className="bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    Przypiety
                  </span>
                )}
                <span>{item.published_at ? new Date(item.published_at).toLocaleDateString("pl-PL") : ""}</span>
                {item.source_name && (
                  <>
                    <span>•</span>
                    <span>{item.source_name}</span>
                  </>
                )}
              </div>

              <h2 className="text-base font-bold text-slate-900 mb-3 line-clamp-2">
                <Link href={`/aktualnosci/${item.slug}`} className="hover:text-emerald-700">
                  {item.title}
                </Link>
              </h2>

              {item.excerpt && (
                <p className="text-slate-600 text-sm line-clamp-3 mb-3">
                  {item.excerpt}
                </p>
              )}

              {/* Streszczenie AI – accordion */}
              {item.ai_summary && (
                <details className="mb-3 text-sm">
                  <summary className="cursor-pointer text-emerald-700 font-medium hover:text-emerald-900 select-none">
                    Streszczenie AI
                  </summary>
                  <p className="mt-2 text-slate-600 bg-emerald-50 rounded-lg px-3 py-2 border-l-2 border-emerald-400 leading-relaxed">
                    {item.ai_summary}
                  </p>
                </details>
              )}

              {/* Stopka karty */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                <Link
                  href={`/aktualnosci/${item.slug}`}
                  className="text-emerald-600 text-sm font-medium hover:text-emerald-800"
                >
                  Czytaj więcej →
                </Link>

                <div className="flex items-center gap-2">
                  {item.source_type === "ai-generated" && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      AI
                    </span>
                  )}
                  <VoteButtons newsId={item.id} initialScore={item.score ?? 0} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {(!news || news.length === 0) && (
        <div className="text-center py-12 text-slate-500">Brak aktualności w tej kategorii.</div>
      )}
    </div>
  );
}
