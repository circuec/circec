'use client';

/**
 * Panel redakcyjny /admin/aktualnosci
 *
 * Ważne założenia:
 * 1) Logowanie jest przez Supabase Auth (email + hasło)
 * 2) Uprawnienia do insert/update/delete kontroluje RLS w Supabase
 *    (czyli tylko użytkownik z profiles.is_admin = true może edytować)
 *
 * Dzięki temu:
 * - nie trzymamy żadnych sekretów w przeglądarce,
 * - bezpieczeństwo jest po stronie Supabase (RLS).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

/**
 * Klient Supabase do działania w przeglądarce.
 * Używa publicznych zmiennych środowiskowych (NEXT_PUBLIC_*).
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Typ danych newsa dla listy w panelu.
 * (Trzymamy tylko to, co potrzebne do wyświetlenia listy)
 */
interface NewsItem {
  id: number;
  title: string;
  status: string;
  source_type: string;
  source_name: string | null;
  created_at: string;
  published_at: string | null;
  category_slug: string | null;
}

export default function AdminAktualnosciPage() {
  const router = useRouter();

  // UI: czy pokazać formularz dodawania
  const [showForm, setShowForm] = useState(false);

  // Dane: lista newsów + ładowanie + błąd
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dane formularza dodawania artykułu
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'goz',
    tags: '',
    imageUrl: '',
    publishNow: false,
  });

  /**
   * Przy starcie strony:
   * - sprawdzamy sesję (czy user jest zalogowany)
   * - pobieramy listę newsów
   */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Jeśli nie ma sesji, layout powinien przekierować,
        // ale robimy dodatkowe zabezpieczenie:
        router.replace('/admin/login');
        return;
      }

      fetchNews();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Funkcja pobierająca listę newsów do panelu.
   * Jeśli RLS blokuje select, pokażemy błąd w UI.
   */
  async function fetchNews() {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('news')
      .select('id, title, status, source_type, source_name, created_at, published_at, category_slug')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchNews error:', error);
      setErrorMsg(error.message);
      setNews([]);
      setLoading(false);
      return;
    }

    setNews((data as NewsItem[]) || []);
    setLoading(false);
  }

  /**
   * Pomocnicza funkcja: tworzymy slug z tytułu.
   * Slug to fragment URL.
   */
  function makeSlug(title: string) {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80) || `news-${Date.now()}`;

    return `${base}-${Date.now()}`;
  }

  /**
   * Dodawanie artykułu "ręcznie" z formularza.
   * To zadziała TYLKO jeśli user ma uprawnienia admina wg RLS.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const slug = makeSlug(formData.title);

    // Zamieniamy tagi z "a,b,c" -> ["a","b","c"]
    const tagsArray =
      formData.tags
        ?.split(',')
        .map((t) => t.trim())
        .filter(Boolean) || [];

    const { error } = await supabase.from('news').insert({
      title: formData.title,
      slug,
      excerpt: formData.excerpt,
      content: formData.content,
      category_slug: formData.category,
      tags: tagsArray,
      image_url: formData.imageUrl || null,

      // Metadane źródła
      source_type: 'manual',
      source_name: 'CIRCEC',

      // Status: jeśli zaznaczysz publishNow, to od razu published
      status: formData.publishNow ? 'published' : 'draft',
      published_at: formData.publishNow ? new Date().toISOString() : null,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      setErrorMsg(error.message);
      alert('Błąd dodawania: ' + error.message);
      return;
    }

    alert('News dodany!');
    setShowForm(false);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'goz',
      tags: '',
      imageUrl: '',
      publishNow: false,
    });

    fetchNews();
  }

  /**
   * Usuwanie artykułu.
   * Działa tylko dla admina wg RLS.
   */
  async function deleteNews(id: number, title: string) {
    if (!confirm(`Czy na pewno usunąć "${title}"?`)) return;

    const { error } = await supabase.from('news').delete().eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      alert('Błąd usuwania: ' + error.message);
      return;
    }

    alert('Usunięto!');
    fetchNews();
  }

  /**
   * Publikowanie / ukrywanie artykułu.
   * published <-> draft
   * Działa tylko dla admina wg RLS.
   */
  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';

    const { error } = await supabase
      .from('news')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase update status error:', error);
      alert('Błąd zmiany statusu: ' + error.message);
      return;
    }

    fetchNews();
  }

  /**
   * Wylogowanie admina.
   * Po wylogowaniu wracamy na /admin/login
   */
  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  // Proste kolory statusów w UI
  const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Nagłówek strony + przyciski */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Panel Redaktorski</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            {showForm ? 'Anuluj' : '+ Nowy artykuł'}
          </button>

          <button
            onClick={logout}
            className="bg-gray-100 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-200"
          >
            Wyloguj
          </button>
        </div>
      </div>

      {/* Komunikat o błędzie (np. brak uprawnień RLS) */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <b>Błąd:</b> {errorMsg}
        </div>
      )}

      {/* Formularz dodawania */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Nowy artykuł</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Tytuł</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-4 py-2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Kategoria</label>
              <select
                className="w-full border rounded-lg px-4 py-2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="goz">GOZ</option>
                <option value="recykling">Recykling</option>
                <option value="ekoprojektowanie">Eko-projektowanie</option>
                <option value="modele-biznesowe">Modele biznesowe</option>
                <option value="wdrozenia">Wdrożenia</option>
                <option value="regulacje">Regulacje</option>
                <option value="metale">Metale i surowce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Streszczenie</label>
              <textarea
                required
                rows={3}
                className="w-full border rounded-lg px-4 py-2"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Treść (HTML)</label>
              <textarea
                required
                rows={10}
                className="w-full border rounded-lg px-4 py-2 font-mono text-sm"
                placeholder="<p>Treść artykułu...</p>"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Tagi (przecinkami)</label>
              <input
                type="text"
                className="w-full border rounded-lg px-4 py-2"
                placeholder="aluminium, opakowania, ue"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Obrazek (URL)</label>
              <input
                type="text"
                className="w-full border rounded-lg px-4 py-2"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="publishNow"
                checked={formData.publishNow}
                onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
              />
              <label htmlFor="publishNow" className="text-slate-700">
                Opublikuj od razu
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium"
            >
              Zapisz artykuł
            </button>
          </div>
        </form>
      )}

      {/* Lista newsów */}
      <h2 className="text-xl font-bold mb-4 text-slate-800">
        Wszystkie aktualności ({news.length})
      </h2>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Ładowanie...</div>
      ) : news.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Brak aktualności w bazie</div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800">{item.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[item.status] || 'bg-gray-100'}`}>
                    {item.status}
                  </span>

                  {item.source_type === 'rss' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      RSS
                    </span>
                  )}
                </div>

                <div className="text-sm text-slate-500">
                  {item.source_name || 'brak źródła'} • {item.category_slug || 'brak kategorii'} •{' '}
                  {new Date(item.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>

              <div className="flex gap-2">
                {/* Zmiana statusu */}
                <button
                  onClick={() => toggleStatus(item.id, item.status)}
                  className={`px-3 py-1 rounded text-sm ${
                    item.status === 'published'
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                >
                  {item.status === 'published' ? 'Ukryj' : 'Publikuj'}
                </button>

                {/* Usuwanie */}
                <button
                  onClick={() => deleteNews(item.id, item.title)}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
