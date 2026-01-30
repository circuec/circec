import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* HERO */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
          Gospodarka <span className="text-emerald-700">Obiegu Zamkniętego</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Kompleksowe źródło wiedzy o GOZ, recyklingu oraz rynku metali i surowców wtórnych. 
          Monitorujemy zmiany, analizujemy dane, wspieramy transformację.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/gospodarka-obiegu" 
            className="bg-emerald-700 text-white px-8 py-3 rounded-lg hover:bg-emerald-800 transition font-semibold"
          >
            Poznaj GOZ
          </Link>
          <Link 
            href="/rynek-metali" 
            className="border-2 border-emerald-700 text-emerald-700 px-8 py-3 rounded-lg hover:bg-emerald-50 transition font-semibold"
          >
            Ceny Metali
          </Link>
        </div>
      </section>

      {/* TRZY KOLUMNY */}
      <section className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-4">♻️</div>
          <h2 className="text-xl font-bold mb-3 text-slate-800">Baza Wiedzy GOZ</h2>
          <p className="text-slate-600">
            Przepisy, definicje, case studies i najlepsze praktyki gospodarki obiegu zamkniętego w Polsce i UE.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-3 text-slate-800">Rynek Surowców</h2>
          <p className="text-slate-600">
            Aktualne ceny metali, analizy rynku wtórnego, trendy w recyklingu i handlu surowcami.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl mb-4">🔄</div>
          <h2 className="text-xl font-bold mb-3 text-slate-800">Monitoring</h2>
          <p className="text-slate-600">
            Alerty cenowe, raporty o zmianach na rynku, newsletter branżowy.
          </p>
        </div>
      </section>

      {/* SEKCJA METALI - PLACEHOLDER */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold mb-4">Ceny metali w czasie rzeczywistym</h2>
            <p className="text-slate-300 mb-6 max-w-xl">
              Wkrótce: monitoring cen miedzi, aluminium, cynku i złota. 
              Automatyczne powiadomienia o zmianach kursów.
            </p>
            <span className="inline-block bg-emerald-600 text-sm px-4 py-2 rounded-full">
              W przygotowaniu
            </span>
          </div>
          <div className="text-6xl opacity-50">📈</div>
        </div>
      </section>
    </div>
  );
}