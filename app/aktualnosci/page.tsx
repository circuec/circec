import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import VoteButtons from './_components/VoteButtons';
import SearchInput from './_components/SearchInput';
import SortToggle from './_components/SortToggle';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AktualnosciPage({
  searchParams
}: {
  searchParams: Promise<{ kategoria?: string; q?: string; sort?: string }>
}) {
  const { kategoria: category, q: searchQuery, sort } = await searchParams;
  const currentSort = sort === "score" ? "score" : "date";

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from('news')
    .select('*, category:news_categories(*)')
    .order('pinned', { ascending: false });

  if (currentSort === "score") {
    query = query.order('score', { ascending: false }).order('published_at', { ascending: false });
  } else {
    query = query.order('published_at', { ascending: false });
  }

  if (searchQuery) {
    // Szukaj w opublikowanych i zarchiwizowanych
    query = query
      .in('status', ['published', 'archived'])
      .ilike('title', `%${searchQuery}%`);
    // brak limitu — przeszukuje cały archiwum
  } else if (category) {
    query = query.eq('status', 'published').eq('category_slug', category).limit(20);
  } else {
    query = query.eq('status', 'published').limit(20);
  }

  const { data: news } = await query;

  const { data: categories } = await supabase
    .from('news_categories')
    .select('*')
    .order('name');

  const isSearch = !!searchQuery;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Aktualności GOZ</h1>
      <p className="text-slate-600 mb-6">
        Najnowsze informacje z obszaru gospodarki obiegu zamkniętego, recyklingu i zrównoważonego rozwoju.
      </p>

      {/* Filtry kategorii */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/aktualnosci"
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !category && !isSearch ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

        {/* Wyszukiwarka + sort — tylko dla "Wszystkie" */}
        {(!category || isSearch) && (
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput defaultValue={searchQuery} />
            {!isSearch && <SortToggle currentSort={currentSort} />}
          </div>
        )}
      </div>

      {/* Wynik wyszukiwania — lista */}
      {isSearch ? (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {news?.length
              ? `Znaleziono: ${news.length} wyników dla „${searchQuery}"`
              : `Brak wyników dla „${searchQuery}"`}
          </p>
          <div className="flex flex-col gap-3">
            {news?.map((item: any) => (
              <article
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4 hover:shadow-md transition"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0 hidden sm:block"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                    {item.status === "archived" && (
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">archiwum</span>
                    )}
                    {item.category && (
                      <span
                        className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                        style={{ backgroundColor: item.category.color || "#059669" }}
                      >
                        {item.category.name}
                      </span>
                    )}
                    <span>{item.published_at ? new Date(item.published_at).toLocaleDateString("pl-PL") : ""}</span>
                    {item.source_name && <><span>•</span><span>{item.source_name}</span></>}
                  </div>
                  <h2 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">{item.title}</h2>
                  {item.ai_summary && (
                    <p className="text-xs text-slate-500 line-clamp-2">{item.ai_summary}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-end">
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 text-sm font-medium hover:text-emerald-800 whitespace-nowrap"
                    >
                      Źródło ↗
                    </a>
                  ) : (
                    <Link
                      href={`/aktualnosci/${item.slug}`}
                      className="text-emerald-600 text-sm font-medium hover:text-emerald-800 whitespace-nowrap"
                    >
                      Czytaj →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        /* Siatka kart */
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news?.map((item: any) => (
              <article
                key={item.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition flex flex-col group relative ${
                  item.pinned ? "ring-2 ring-amber-400" : ""
                }`}
              >
                {/* Hover overlay z ai_summary */}
                {item.ai_summary && (
                  <div className="absolute inset-0 bg-white/97 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl z-10 flex flex-col justify-center overflow-auto">
                    <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Streszczenie AI</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{item.ai_summary}</p>
                  </div>
                )}

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
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
                    {item.pinned && (
                      <span className="bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                        Przypiety
                      </span>
                    )}
                    <span>{item.published_at ? new Date(item.published_at).toLocaleDateString("pl-PL") : ""}</span>
                    {item.source_name && <><span>•</span><span>{item.source_name}</span></>}
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

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 text-sm font-medium hover:text-emerald-800"
                      >
                        Źródło ↗
                      </a>
                    ) : (
                      <Link
                        href={`/aktualnosci/${item.slug}`}
                        className="text-emerald-600 text-sm font-medium hover:text-emerald-800"
                      >
                        Czytaj więcej →
                      </Link>
                    )}

                    <div className="flex items-center gap-2">
                      {item.source_type === "ai-generated" && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">AI</span>
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
        </>
      )}
    </div>
  );
}
