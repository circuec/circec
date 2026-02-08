'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItem {
  id: number;
  title: string;
  status: string;
  source_type: string;
  source_name: string;
  created_at: string;
  category_slug: string;
}

export default function AdminNewsPage() {
  const [showForm, setShowForm] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'goz',
    tags: '',
    imageUrl: '',
    publishNow: false
  });

  // Pobierz newsy przy załadowaniu
  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    setLoading(true);
    const { data } = await supabase
      .from('news')
      .select('id, title, status, source_type, source_name, created_at, category_slug')
      .order('created_at', { ascending: false });
    
    setNews(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const res = await fetch('/api/news/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      alert('News dodany!');
      setShowForm(false);
      setFormData({
        title: '', excerpt: '', content: '', category: 'goz',
        tags: '', imageUrl: '', publishNow: false
      });
      fetchNews(); // Odśwież listę
    } else {
      alert('Błąd podczas dodawania');
    }
  }

  // USUWANIE
  async function deleteNews(id: number, title: string) {
    if (!confirm(`Czy na pewno usunąć "${title}"?`)) return;
    
    const { error } = await supabase.from('news').delete().eq('id', id);
    
    if (error) {
      alert('Błąd usuwania: ' + error.message);
    } else {
      alert('Usunięto!');
      fetchNews(); // Odśwież listę
    }
  }

  // ZMIANA STATUSU (publish/unpublish)
  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    const { error } = await supabase
      .from('news')
      .update({ 
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null
      })
      .eq('id', id);
    
    if (error) {
      alert('Błąd: ' + error.message);
    } else {
      fetchNews();
    }
  }

  // Kolory statusów
  const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Panel Redaktorski</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
        >
          {showForm ? 'Anuluj' : '+ Nowy artykuł'}
        </button>
      </div>

      {/* Formularz */}
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
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Kategoria</label>
              <select 
                className="w-full border rounded-lg px-4 py-2"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
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
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
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
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Tagi (przecinkami)</label>
              <input 
                type="text"
                className="w-full border rounded-lg px-4 py-2"
                placeholder="aluminium, opakowania, ue"
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="publishNow"
                checked={formData.publishNow}
                onChange={e => setFormData({...formData, publishNow: e.target.checked})}
              />
              <label htmlFor="publishNow" className="text-slate-700">Opublikuj od razu</label>
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

      {/* LISTA NEWSÓW */}
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
                  {item.source_name} • {item.category_slug} • 
                  {new Date(item.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>
              
              <div className="flex gap-2">
                {/* ZMIANA STATUSU */}
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
                
                {/* USUWANIE */}
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