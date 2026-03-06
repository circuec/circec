"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewsItem {
  id: number;
  title: string;
  status: string;
  source_type: string;
  source_name: string | null;
  created_at: string;
  published_at: string | null;
  category_slug: string | null;
  ai_summary: string | null;
  pinned: boolean;
  likes: number;
  ai_tags: string[] | null;
  tags: string[] | null;
}

interface RssSource {
  id: number;
  name: string;
  url: string;
  category: string;
  language: string;
  active: boolean;
  created_at: string;
}

interface Category {
  slug: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  draft: "bg-gray-100 text-gray-700 border border-gray-200",
  review: "bg-amber-100 text-amber-800 border border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  published: "opublikowany",
  draft: "szkic",
  review: "do weryfikacji",
};

export default function AdminAktualnosciPage() {
  const router = useRouter();

  // ── Tabs ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"news" | "rss">("news");

  // ── Categories state ───────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);

  // ── News state ─────────────────────────────────────────────
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "recykling",
    tags: "",
    imageUrl: "",
    publishNow: false,
  });

  // ── RSS Sources state ──────────────────────────────────────
  const [sources, setSources] = useState<RssSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    name: "",
    url: "",
    category: "recykling",
    language: "en",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      fetchCategories();
      fetchNews();
    })();
  }, []);

  // ── Categories functions ───────────────────────────────────
  async function fetchCategories() {
    const { data } = await supabase
      .from("news_categories")
      .select("slug, name")
      .order("name");
    if (data) setCategories(data as Category[]);
  }

  // ── News functions ─────────────────────────────────────────
  async function fetchNews() {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from("news")
      .select(
        "id, title, status, source_type, source_name, created_at, published_at, category_slug, ai_summary, pinned, likes, ai_tags, tags"
      )
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setNews([]);
    } else {
      setNews((data as NewsItem[]) || []);
    }
    setLoading(false);
  }

  const filtered = news.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterCategory !== "all" && item.category_slug !== filterCategory) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }

  async function bulkPublish() {
    if (!selected.size) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("news")
      .update({ status: "published", published_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { alert("Błąd: " + error.message); return; }
    setSelected(new Set());
    fetchNews();
  }

  async function bulkDraft() {
    if (!selected.size) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("news")
      .update({ status: "draft", published_at: null })
      .in("id", ids);
    if (error) { alert("Błąd: " + error.message); return; }
    setSelected(new Set());
    fetchNews();
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Usunąć ${selected.size} newsów?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("news").delete().in("id", ids);
    if (error) { alert("Błąd: " + error.message); return; }
    setSelected(new Set());
    fetchNews();
  }

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("news")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchNews();
  }

  async function togglePin(id: number, pinned: boolean) {
    const { error } = await supabase
      .from("news")
      .update({ pinned: !pinned })
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchNews();
  }

  async function toggleLike(id: number, likes: number) {
    const { error } = await supabase
      .from("news")
      .update({ likes: likes + 1 })
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchNews();
  }

  async function deleteNews(id: number, title: string) {
    if (!confirm(`Usunąć "${title}"?`)) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchNews();
  }

  function startEditingTags(item: NewsItem) {
    setEditingTagsId(item.id);
    const existing = [...(item.tags || []), ...(item.ai_tags || [])];
    const unique = Array.from(new Set(existing));
    setTagInput(unique.join(", "));
  }

  async function saveTags(id: number) {
    const tagsArray = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("news")
      .update({ tags: tagsArray })
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    setEditingTagsId(null);
    fetchNews();
  }

  function makeSlug(title: string) {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9ąćęłńóśźż]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 80) || `news-${Date.now()}`;
    return `${base}-${Date.now()}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = makeSlug(formData.title);
    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from("news").insert({
      title: formData.title,
      slug,
      excerpt: formData.excerpt,
      content: formData.content,
      category_slug: formData.category,
      tags: tagsArray,
      image_url: formData.imageUrl || null,
      source_type: "manual",
      source_name: "CIRCEC",
      status: formData.publishNow ? "published" : "draft",
      published_at: formData.publishNow ? new Date().toISOString() : null,
    });

    if (error) { alert("Błąd: " + error.message); return; }
    alert("News dodany!");
    setShowForm(false);
    setFormData({ title: "", excerpt: "", content: "", category: "recykling", tags: "", imageUrl: "", publishNow: false });
    fetchNews();
  }

  // ── RSS Sources functions ──────────────────────────────────
  async function fetchSources() {
    setSourcesLoading(true);
    setSourcesError(null);
    const { data, error } = await supabase
      .from("rss_sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setSourcesError(error.message);
      setSources([]);
    } else {
      setSources((data as RssSource[]) || []);
    }
    setSourcesLoading(false);
  }

  async function toggleSourceActive(id: number, active: boolean) {
    const { error } = await supabase
      .from("rss_sources")
      .update({ active: !active })
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchSources();
  }

  async function deleteSource(id: number, name: string) {
    if (!confirm(`Usunąć źródło "${name}"?`)) return;
    const { error } = await supabase
      .from("rss_sources")
      .delete()
      .eq("id", id);
    if (error) { alert("Błąd: " + error.message); return; }
    fetchSources();
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("rss_sources").insert({
      name: sourceForm.name,
      url: sourceForm.url,
      category: sourceForm.category,
      language: sourceForm.language,
      active: true,
    });
    if (error) { alert("Błąd: " + error.message); return; }
    setSourceForm({ name: "", url: "", category: "recykling", language: "en" });
    setShowSourceForm(false);
    fetchSources();
  }

  // Ładuj źródła przy przełączeniu na zakładkę RSS
  function handleTabChange(tab: "news" | "rss") {
    setActiveTab(tab);
    if (tab === "rss" && sources.length === 0 && !sourcesLoading) {
      fetchSources();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Header ── */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel Redaktorski</h1>
          <p className="text-slate-500 text-sm mt-1">{news.length} newsów w bazie</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "news" && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              {showForm ? "Anuluj" : "+ Nowy artykuł"}
            </button>
          )}
          {activeTab === "rss" && (
            <button
              onClick={() => setShowSourceForm(!showSourceForm)}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              {showSourceForm ? "Anuluj" : "+ Dodaj źródło"}
            </button>
          )}
          <button
            onClick={logout}
            className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Wyloguj
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => handleTabChange("news")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "news"
              ? "bg-white border border-b-white border-slate-200 text-emerald-700 -mb-px"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Newsy
        </button>
        <button
          onClick={() => handleTabChange("rss")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "rss"
              ? "bg-white border border-b-white border-slate-200 text-emerald-700 -mb-px"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Zrodla RSS
          {sources.length > 0 && (
            <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
              {sources.length}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB: NEWSY                                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "news" && (
        <>
          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              <b>Błąd:</b> {errorMsg}
            </div>
          )}

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8 border border-slate-100">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Nowy artykuł</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Tytuł</label>
                  <input type="text" required className="w-full border rounded-lg px-4 py-2 text-sm" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Kategoria</label>
                  <select className="w-full border rounded-lg px-4 py-2 text-sm" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Streszczenie</label>
                  <textarea required rows={3} className="w-full border rounded-lg px-4 py-2 text-sm" value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Treść (HTML)</label>
                  <textarea required rows={8} className="w-full border rounded-lg px-4 py-2 font-mono text-sm" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Tagi (przecinkami)</label>
                  <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm" placeholder="aluminium, opakowania, ue" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Obrazek (URL)</label>
                  <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm" placeholder="https://..." value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="publishNow" checked={formData.publishNow} onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })} />
                  <label htmlFor="publishNow" className="text-sm text-slate-700">Opublikuj od razu</label>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium text-sm">
                  Zapisz artykuł
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Szukaj po tytule..."
                className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Wszystkie statusy</option>
                <option value="review">Do weryfikacji</option>
                <option value="published">Opublikowane</option>
                <option value="draft">Szkice</option>
              </select>
              <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">Wszystkie kategorie</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="bg-slate-900 text-white rounded-xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Zaznaczono: {selected.size}</span>
              <button onClick={bulkPublish} className="bg-emerald-500 hover:bg-emerald-400 px-4 py-1.5 rounded-lg text-sm font-medium">
                Publikuj wszystkie
              </button>
              <button onClick={bulkDraft} className="bg-slate-600 hover:bg-slate-500 px-4 py-1.5 rounded-lg text-sm font-medium">
                Cofnij do szkicu
              </button>
              <button onClick={bulkDelete} className="bg-red-500 hover:bg-red-400 px-4 py-1.5 rounded-lg text-sm font-medium">
                Usuń zaznaczone
              </button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-white text-sm">
                Odznacz wszystkie
              </button>
            </div>
          )}

          {/* List header */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={selectAll}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-500 font-medium">
              {filtered.length} newsów {filterStatus !== "all" || filterCategory !== "all" || search ? "(filtrowane)" : ""}
            </span>
          </div>

          {/* News list */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">Ładowanie...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Brak newsów spełniających kryteria</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border transition-all ${
                    selected.has(item.id) ? "border-emerald-400 shadow-md" : "border-slate-100 shadow-sm"
                  } ${item.pinned ? "ring-2 ring-amber-300" : ""}`}
                >
                  <div className="p-4 flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 mt-1 rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {item.pinned && (
                          <span className="text-amber-500 text-xs font-bold">Przypiety</span>
                        )}
                        <h3 className="font-semibold text-slate-800 text-sm leading-snug">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                        {item.source_type === "rss" && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">RSS</span>
                        )}
                        {item.category_slug && (
                          <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                            {categories.find(c => c.slug === item.category_slug)?.name || item.category_slug}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {item.source_name || "—"} • {new Date(item.created_at).toLocaleDateString("pl-PL")}
                        </span>
                        <span className="text-xs text-rose-500 font-medium">❤ {item.likes || 0}</span>
                      </div>
                      {item.ai_summary && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 bg-emerald-50 rounded px-2 py-1 border-l-2 border-emerald-300">
                          {item.ai_summary}
                        </p>
                      )}
                      {editingTagsId === item.id ? (
                        <div className="flex gap-2 items-center mt-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="border rounded px-2 py-1 text-xs flex-1"
                            placeholder="tag1, tag2, tag3"
                            onKeyDown={(e) => e.key === "Enter" && saveTags(item.id)}
                          />
                          <button onClick={() => saveTags(item.id)} className="bg-emerald-500 text-white px-3 py-1 rounded text-xs hover:bg-emerald-600">
                            Zapisz
                          </button>
                          <button onClick={() => setEditingTagsId(null)} className="text-slate-400 text-xs hover:text-slate-600">
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(item.tags || item.ai_tags || []).slice(0, 6).map((tag) => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                          <button
                            onClick={() => startEditingTags(item)}
                            className="text-xs text-slate-400 hover:text-emerald-600 px-1"
                          >
                            {(item.tags?.length || item.ai_tags?.length) ? "edytuj tagi" : "+ dodaj tagi"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleStatus(item.id, item.status)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          item.status === "published"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {item.status === "published" ? "Ukryj" : "Publikuj"}
                      </button>
                      <button
                        onClick={() => togglePin(item.id, item.pinned)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          item.pinned
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {item.pinned ? "Odepnij" : "Przypnij"}
                      </button>
                      <button
                        onClick={() => toggleLike(item.id, item.likes || 0)}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1 rounded-lg text-xs font-medium"
                      >
                        ❤ Polub
                      </button>
                      <button
                        onClick={() => deleteNews(item.id, item.title)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-medium"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* TAB: ZRODLA RSS                                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === "rss" && (
        <>
          {sourcesError && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              <b>Błąd:</b> {sourcesError}
            </div>
          )}

          {/* Form dodawania źródła */}
          {showSourceForm && (
            <form onSubmit={handleAddSource} className="bg-white p-6 rounded-xl shadow-md mb-6 border border-slate-100">
              <h2 className="text-lg font-bold mb-4 text-slate-800">Nowe źródło RSS</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Nazwa</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                    placeholder="np. Recycling Portal"
                    value={sourceForm.name}
                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">URL feeda</label>
                  <input
                    type="url"
                    required
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                    placeholder="https://example.com/feed/"
                    value={sourceForm.url}
                    onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Kategoria</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                    value={sourceForm.category}
                    onChange={(e) => setSourceForm({ ...sourceForm, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Język</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                    value={sourceForm.language}
                    onChange={(e) => setSourceForm({ ...sourceForm, language: e.target.value })}
                  >
                    <option value="en">Angielski (en)</option>
                    <option value="pl">Polski (pl)</option>
                    <option value="de">Niemiecki (de)</option>
                    <option value="fr">Francuski (fr)</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                Dodaj źródło
              </button>
            </form>
          )}

          {/* Lista źródeł */}
          {sourcesLoading ? (
            <div className="text-center py-12 text-slate-400">Ładowanie...</div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>Brak źródeł RSS w bazie.</p>
              <p className="text-sm mt-2">Kliknij &quot;+ Dodaj źródło&quot; aby dodać pierwsze.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nazwa</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">URL</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Kategoria</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Język</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sources.map((src) => (
                    <tr key={src.id} className={`hover:bg-slate-50 ${!src.active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{src.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-xs truncate">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-600 hover:underline"
                        >
                          {src.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                          {categories.find(c => c.slug === src.category)?.name || src.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 uppercase text-xs">{src.language}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          src.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {src.active ? "aktywne" : "wyłączone"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => toggleSourceActive(src.id, src.active)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              src.active
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                          >
                            {src.active ? "Wyłącz" : "Włącz"}
                          </button>
                          <button
                            onClick={() => deleteSource(src.id, src.name)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-medium"
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
