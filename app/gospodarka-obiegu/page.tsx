export default function GOZPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Co to jest GOZ?</h1>
      
      <article className="prose prose-lg max-w-none">
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">
          Gospodarka obiegu zamkniętego (GOZ) to model gospodarki, w którym odpady stanowią surowce 
          wtórne, a produkty projektuje się tak, aby były trwałe, łatwe w naprawie i recyklingu.
        </p>

        <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">6 zasad GOZ</h2>
        <ul className="space-y-3 text-slate-600">
          <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">1.</span>
            <span><strong>Zaprojektowana trwałość</strong> - produkty są trwałe, naprawialne i możliwe do modernizacji</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">2.</span>
            <span><strong>Gospodarowanie odpadami jako zasobami</strong> - minimalizacja składowania, maksymalizacja odzysku</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">3.</span>
            <span><strong>Leasing i dzielenie się</strong> - model użytkowania zamiast własności</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">4.</span>
            <span><strong>Odnawialne źródła energii</strong> - eliminacja paliw kopalnych</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">5.</span>
            <span><strong>Ekoprojektowanie</strong> - optymalizacja produkcji i wykorzystania</span>
          </li>
            <li className="flex items-start gap-3">
            <span className="text-emerald-600 font-bold">6.</span>
            <span><strong>Symbiozy przemysłowe</strong> - współpraca w łańcuchu dostaw</span>
          </li></ul>

        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 my-8 rounded-r-lg">
          <h3 className="font-bold text-emerald-800 mb-2">Czy wiesz, że?</h3>
          <p className="text-emerald-700">
            Do 2035 roku UE wymaga od krajów członkowskich osiągnięcia poziomu recyklingu odpadów 
            komunalnych na poziomie 65%.
          </p>
        </div>
      </article>
    </div>
  );
}