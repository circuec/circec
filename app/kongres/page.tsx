export default function KongresPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Kongres GOZ</h1>
      
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-2xl font-bold text-emerald-800 mb-4">Wkrótce</h2>
        <p className="text-emerald-700 mb-6">
          Planujemy pierwszy Kongres Gospodarki Obiegu Zamkniętego CIRCEC.
          Szczegóły programu, prelegenci i rejestracja zostaną ogłoszone wkrótce.
        </p>
        <p className="text-emerald-600 text-sm">
          Chcesz wystąpić lub wesprzeć wydarzenie? 
          <a href="mailto:kontakt@circec.eu" className="underline ml-1">Napisz do nas</a>
        </p>
      </div>
      
      {/* Możesz dodać formularz zapisu na newsletter o kongresie */}
    </div>
  );
}